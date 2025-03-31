import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  net,
  protocol,
  shell,
  Tray,
  screen
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
import { setupProtocol } from './protocol'
import { loadCommand } from './command'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

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

const commandRoots = [
  path.resolve(process.env.APP_ROOT, 'commands'),
  path.resolve(app.getPath('userData'), 'commands'),
]

let lastHotkey: any = null;
let lastFocusedApp: any = null;

async function getFocusedApplication() {
  if (process.platform === 'darwin') {
    try {
      const { stdout } = await execAsync('osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'');
      return stdout.trim();
    } catch (error) {
      log.error('Failed to get focused application:', error);
      return null;
    }
  }
  return null;
}

async function switchToApplication(appName: string) {
  if (process.platform === 'darwin') {
    try {
      await execAsync(`osascript -e 'activate application "${appName}"'`);
    } catch (error) {
      log.error('Failed to switch application:', error);
    }
  }
}

function setupShortcuts(config: ModalCommanderConfig, messageListeners: Map<string, any>) {
  for (const hotkey of config.hotkeys) {
    const ret = globalShortcut.register(hotkey.key, async() => {
      if (win) {
        if (hotkey.type === 'command') {
          if (win.isVisible()) {
            win.hide();
            // Switch back to the previous application if we have it
            if (lastFocusedApp) {
              await switchToApplication(lastFocusedApp);
            }
          } else {
            lastHotkey = hotkey;
            // Store the current focused application before showing the window
            lastFocusedApp = await getFocusedApplication();
            win.webContents.send('main-message', { type: 'setRootCommand', data: hotkey });
            win.show();
          }
        } else if (hotkey.type === 'operation') {
          const listener = messageListeners.get(hotkey.name);
          if (listener) {
            // log.silly('listener found:', listener)
            await listener.onMessage(hotkey.message);
            return;
          }
          
          throw new Error('No listener found for command: ' + hotkey.name);
        }
      }
    });

    if (!ret) {
      log.error('registration failed')
    }
  }
}

function setupWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  win = new BrowserWindow({
    title: 'Modal Commander',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    hiddenInMissionControl: true,
    show: false,
    frame: false,
    width: width * 0.7,
    height: 350,
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

let db: CommandDatabase

async function createWindow() {
  if (!config) {
    const configPath = path.resolve(app.getPath('userData'), 'config.json');
    const configData = await readFile(configPath, 'utf8');
    config = ModalCommanderConfigSchema.parse(JSON.parse(configData));
  }

  // Initialize database
  db = new CommandDatabase(path.join(app.getPath('userData'), 'commands.db'))

  const messageListeners = await loadCommand(db, config, commandRoots);
  setupProtocol(commandRoots, []);
  setupWindow();
  setupTray();
  setupShortcuts(config, messageListeners);

  messageListeners.set('hide', new (class {
    onMessage(message: any) {
      win?.hide();
      win?.webContents.send('main-message', { type: 'resetState' });
      if (lastFocusedApp && !message.preventFocusReturn) {
        switchToApplication(lastFocusedApp);
      }
    }
  }));

  messageListeners.set('quit', new (class {
    onMessage(message: any) {
      if (lastFocusedApp) {
        switchToApplication(lastFocusedApp);
      }
      app.quit();
    }
  }));

  ipcMain.on('renderer-message', (event, message) => {
    const command = message.command;
    const listener = messageListeners.get(command);
    if (listener) {
      listener.onMessage(message);
      return;
    }
    
    throw new Error('No listener found for command: ' + command);
  })

  ipcMain.handle('renderer-invoke', async (event, message) => {
    const command = message.command;
    const listener = messageListeners.get(command);
    if (listener) {
      return await listener.onInvoke(message);
    }
    
    throw new Error('No listener found for command: ' + command);
  })

  win?.webContents.on('did-finish-load', () => {
    if (lastHotkey) {
      win?.webContents.send('main-message', { type: 'setRootCommand', data: lastHotkey });
    }
  })

  win?.on('blur', () => {
    win?.hide();
    win?.webContents.send('main-message', { type: 'resetState' });
  });

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
  globalShortcut.unregisterAll()
})
