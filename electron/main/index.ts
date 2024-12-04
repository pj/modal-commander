import { app, BrowserWindow, shell, ipcMain, Menu, Tray, globalShortcut, protocol, net } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { update } from './update'
import log from 'electron-log';
import { pathToFileURL } from 'url';
import { access, readFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
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
      if (pathSplit.length <= 3) {
        log.error('at least three path segments required', pathname);
        return new Response('bad', {
          status: 400,
          headers: { 'content-type': 'text/html' }
        });
      }

      for (const commandRoot of commandRoots) {
        const commandHostPath  = path.resolve(commandRoot, hostname)

        const [packageName, commandName, location, ...rest] = pathSplit;

        const packageJsonPath = path.resolve(
          commandHostPath, 
          packageName,
          'package.json'
        );

        if (!path.isAbsolute(packageJsonPath)) {
          log.error('mc protocol request has an invalid package.json path', packageJsonPath);
          break;
        }

        try {
          await access(packageJsonPath);
        } catch (err) {
          log.error('mc protocol request has a non-existent package.json', packageJsonPath);
          continue;
        }

        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

        const command = packageJson["modal-commander"][commandName];

        if (!command) {
          log.error('command not found: ', commandName);
          continue;
        }

        if (location !== 'renderer' && location !== 'main') {
          log.error('invalid location: ', location);
          break;
        }

        const fileLocation = command[location];

        if (!fileLocation) {
          log.error('command has no file location: ', commandName);
          break;
        }

        const filePath = path.resolve(
          commandHostPath, 
          packageName,
          fileLocation
        );

        if (!path.isAbsolute(filePath)) {
          log.error('command has an invalid file path: ', filePath);
          break;
        }

        return net.fetch(pathToFileURL(filePath).toString())
      }

      return new Response('bad', {
          status: 400,
          headers: { 'content-type': 'text/html' }
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

async function createWindow() {
  setupProtocol();
  setupWindow();
  setupTray();
  setupShortcuts();

  // Auto update
  update(win as BrowserWindow);
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
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


// // New window example arg: new windows url
// ipcMain.handle('open-win', (_, arg) => {
//   const childWindow = new BrowserWindow({
//     webPreferences: {
//       preload,
//       nodeIntegration: true,
//       contextIsolation: false,
//     },
//   })

//   if (VITE_DEV_SERVER_URL) {
//     childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
//   } else {
//     childWindow.loadFile(indexHtml, { hash: arg })
//   }
// })

