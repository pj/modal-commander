import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  net,
  protocol,
  shell,
  Tray
} from 'electron'
import log from 'electron-log'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'url'
import { ModalCommanderConfig, ModalCommanderConfigSchema } from './modal_commander_config'
import { update } from './update'
import { readdirSync, statSync } from 'node:fs'
import { CommandDatabase } from './database'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

if (VITE_DEV_SERVER_URL) {
  app.setPath('userData', path.join(os.homedir(), 'Library/Application Support/Modal Commander'))
}


log.initialize();
log.transports.console.level = VITE_DEV_SERVER_URL ? 'silly' : 'info';
log.transports.file.level = VITE_DEV_SERVER_URL ? 'silly' : 'info';
log.info('Starting Modal Commander');
log.silly('VITE_DEV_SERVER_URL', VITE_DEV_SERVER_URL);
log.silly('VSCODE_DEBUG', process.env.VSCODE_DEBUG);

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
let tray: Tray | null = null;
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mc',
    privileges: {
      standard: true,
      secure: true,
      // supportFetchAPI: true,
      // allowServiceWorkers: true,
      // corsEnabled: true,
    }
  }
]);

const commandRoots = [
  path.resolve(process.env.APP_ROOT, 'commands'),
  path.resolve(app.getPath('userData'), 'commands'),
]

function setupProtocol() {
  protocol.handle(
    'mc', async (req) => {
      log.silly('mc protocol request', JSON.stringify(req, null, 2))
      const { hostname, pathname } = new URL(req.url)
      const pathSplit = pathname.split('/')
      if (pathSplit.length > 3) {
        log.error('at least three path segments required', pathname);
        return new Response('bad', {
          status: 400,
          headers: { 
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
      }

      for (const commandRoot of commandRoots) {
        const [_, packageNamespace, packageName] = pathSplit;

        const filePath = path.resolve(
          commandRoot, 
          packageNamespace,
          packageName,
          "dist",
          "renderer.js",
        );

        if (!path.isAbsolute(filePath)) {
          log.warn('Command not found: ', filePath);
          continue;
        }

        const response = await net.fetch(pathToFileURL(filePath).toString())
        return new Response(response.body, {
          headers: {
            ...response.headers,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'content-type': 'application/javascript',
          }
        })
      }

      return new Response('bad', {
        status: 400,
        headers: { 
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })
    }
  );
}

function setupShortcuts() {
  const ret = globalShortcut.register('Command+Control+M', () => {
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
      }
    }
  })

  if (!ret) {
    log.error('registration failed')
  }
}

function setupWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    hiddenInMissionControl: true,
    show: false,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

function setupTray() {
  tray = new Tray(path.join(process.env.VITE_PUBLIC, 'lightningTemplate.png'))
  tray.setToolTip('Modal Commander')
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Quit', click: () => app.quit() },
  ])
  tray.setContextMenu(contextMenu);
}

let config: ModalCommanderConfig | null = null;

let messageListeners: Map<string, any> = new Map();

let db: CommandDatabase

async function createWindow() {
  if (!config) {
    config = ModalCommanderConfigSchema.parse(
      await readFile(
        path.resolve(app.getPath('userData'), 'config.json'), 
        'utf8'
      )
    );
  }

  // Initialize database
  db = new CommandDatabase(path.join(app.getPath('userData'), 'commands.db'))

  for (const commandRoot of commandRoots) {
    try {
      const namespaces = readdirSync(commandRoot, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        
      for (const namespace of namespaces) {
        const namespacePath = path.join(commandRoot, namespace.name)
        const packages = readdirSync(namespacePath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
        
        for (const pkg of packages) {
          const packagePath = path.resolve(namespacePath, pkg.name);
          const mainPath = path.resolve(
            packagePath,
            'dist',
            'main.js'
          )

          try {
            statSync(mainPath)
            const packageMain = await import(pathToFileURL(mainPath).toString())
            for (const [commandName, commandClass] of Object.entries(packageMain.default)) {
              const listener = new (commandClass as any)(db);  // Pass database instance here
              await listener.onStart(packagePath);
              messageListeners.set(`${namespace.name}.${pkg.name}.${commandName}`, listener)
            }
          } catch (err) {
            log.warn(`Could not load command main process code: ${mainPath}`, err)
          }
        }
      }
    } catch (err) {
      log.warn(`Could not read command root: ${commandRoot}`, err)
    }
  }

  setupProtocol();
  setupWindow();
  setupTray();
  setupShortcuts();

  // Handle once the page is loaded and has be
  ipcMain.handle('page-ready', async () => {
    return config;
  });

  messageListeners.set('hide', new (class {
    onMessage(message: any) {
      log.silly('hide message received:', message)
      win?.hide();
      win?.webContents.send('main-message', { type: 'resetState' });
    }
  }));

  messageListeners.set('quit', new (class {
    onMessage(message: any) {
      log.silly('quit message received:', message)
      app.quit();
    }
  }));

  ipcMain.on('renderer-message', (event, message) => {
    log.silly('message received:', message)
    const command = message.command;
    const listener = messageListeners.get(command);
    if (listener) {
      log.silly('listener found:', listener)
      listener.onMessage(message);
      return;
    }
    
    throw new Error('No listener found for command: ' + command);
  })

  // Auto update
  update(win as BrowserWindow);
}

app.whenReady().then(async () => {
  try {
    await createWindow()
  } catch (error) {
    log.error('Failed to create window:', error)
    app.quit()
    process.exit(1)
  }
}).catch(error => {
  log.error('Failed during app ready:', error)
  app.quit()
  process.exit(1)
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})
