import { createRequire } from 'node:module';
import {
  Layout,
  Window,
  WindowManagerLayout,
  SCREEN_PRIMARY,
  PinnedLayout,
  ScreenConfig,
  Monitor,
  FloatZoomedLayout,
  WindowManagerState,
  Bounds,
  Application
} from './WindowManagementTypes';
import log from 'electron-log';

const require = createRequire(import.meta.url);

export const DEFAULT_LAYOUT: WindowManagerLayout = {
  name: "Default",
  quickKey: "d",
  screenSets: [{
    [SCREEN_PRIMARY]: {
      type: "columns",
      columns: [{
        type: "stack",
        percentage: 100
      }]
    }
  }]
};

export class WindowManager {
  private native: any;
  private windowCache: Map<number, Window> = new Map();
  private applicationCache: Map<string, Map<string, Window>> = new Map();
  private screenCache: Map<string, Monitor> = new Map();
  // Map of window id to the monitor it is located at - monitors not specifically located are sent to the primary screen
  private locatedAtWindows: Map<number, string> = new Map();
  private currentLayout: WindowManagerLayout = DEFAULT_LAYOUT;
  private updateTimer: NodeJS.Timeout | null = null;
  private reconciling: boolean = false;
  private currentApplication: Application | null = null;
  private focusCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.native = require('../build/Release/WindowFunctions.node');
  }

  // Initialization and periodic update handling
  public async start() {
    if (this.updateTimer) return;
    await this.updateCaches();
    this.startWindowWatcher();
    this.startFocusWatcher();
  }

  public stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    if (this.focusCheckInterval) {
      clearInterval(this.focusCheckInterval);
      this.focusCheckInterval = null;
    }
  }

  private startWindowWatcher() {
    // Poll for window changes every second
    this.updateTimer = setInterval(async () => {
      await this.updateCaches();
      await this.reconcileLayout();
    }, 1000);
  }

  private startFocusWatcher() {
    // Check focus every 500ms
    this.focusCheckInterval = setInterval(() => {
      const focusedApp = this.native.getFocusedApplication();
      if (focusedApp && focusedApp.name !== this.currentApplication) {
        this.currentApplication = focusedApp.name;
        log.debug('Focus changed to:', this.currentApplication);
        // You can emit an event or handle the focus change however you need
      }
    }, 500);
  }

  private async updateCaches() {
    const monitors = await this.native.getMonitors();
    this.screenCache = new Map();
    for (const monitor of monitors) {
      this.screenCache.set(monitor.name, monitor);
    }

    const windows = await this.native.getWindows();
    this.windowCache = new Map();
    this.applicationCache = new Map();

    for (const window of windows) {
      this.windowCache.set(window.id, window);

      if (!this.applicationCache.has(window.application)) {
        this.applicationCache.set(window.application, new Map());
      }
      this.applicationCache.get(window.application)?.set(window.title, window);
    }
  }

  // Updating/Modifying the layout
  public async setLayout(layout: WindowManagerLayout) {
    this.currentLayout = layout;
    await this.reconcileLayout();
  }


  // Screen reconciliation and update
  private windowIsPinned(layout: PinnedLayout, window: Window): boolean {
    if (layout.application !== window.application) return false;
    if (layout.title && layout.title !== window.title) return false;
    return true;
  }

  private async setWindowBounds(window: Window, bounds: Bounds) {
    const cached = this.windowCache.get(window.id);
    if (cached?.bounds.x !== bounds.x || cached?.bounds.y !== bounds.y || cached?.bounds.width !== bounds.width || cached?.bounds.height !== bounds.height) {
      setTimeout(() => {
        this.native.setWindowBounds(window.id, bounds);
      }, 10);
    }
  }

  private findWindowsForLayout(layout: FloatZoomedLayout | PinnedLayout): Window[] {
    const windows: Window[] = [];
    const app = this.applicationCache.get(layout.application);
    if (app) {
      if (layout.title) {
        const window = app.get(layout.title);
        if (window) windows.push(window);
      } else {
        windows.push(...Array.from(app.values()));
      }
    }
    return windows;
  }

  private async reconcileScreenLayout(screen: Monitor, layout: Layout, nonStackedWindows: Set<number>): Promise<Bounds | null> {
    const bounds = screen.bounds;
    let stackLocation: Bounds | null = null;

    switch (layout.type) {
      case "columns":
        let xOffset = bounds.x;
        for (const column of layout.columns) {
          const width = bounds.width * (column.percentage || 0) / 100;
          const foundStackLocation = await this.reconcileScreenLayout(
            { ...screen, bounds: { ...bounds, x: xOffset, width } },
            column,
            nonStackedWindows
          );
          if (foundStackLocation) {
            stackLocation = foundStackLocation;
          }
          xOffset += width;
        }
        break;

      case "rows":
        let yOffset = bounds.y;
        for (const row of layout.rows) {
          const height = bounds.height * (row.percentage || 0) / 100;
          const foundStackLocation = await this.reconcileScreenLayout(
            { ...screen, bounds: { ...bounds, y: yOffset, height } },
            row,
            nonStackedWindows
          );
          if (foundStackLocation) {
            stackLocation = foundStackLocation;
          }
          yOffset += height;
        }
        break;

      case "pinned":
        const windows = this.findWindowsForLayout(layout);
        for (const window of windows) {
          if (!nonStackedWindows.has(window.id)) {
            nonStackedWindows.add(window.id);
            await this.setWindowBounds(window, bounds);
          }
        }
        break;

      case "stack":
        // Place all remaining windows in the stack area
        // for (const window of Object.values(this.windowCache)) {
        //   if (!ignoredWindows.has(window.id)) {
        //     await this.native.setWindowBounds(window.id, bounds);
        //   }
        // }
        stackLocation = bounds;
        break;
      case "empty":
        break;
    }

    return stackLocation;
  }

  private async reconcileScreenSet(screenSet: ScreenConfig) {
    // Handle regular layout
    for (const [screenName, layout] of Object.entries(screenSet)) {
      const screen = screenName === SCREEN_PRIMARY
        ? Array.from(this.screenCache.values()).find(s => s.main)
        : this.screenCache.get(screenName);

      if (!screen) {
        log.warn(`No screen found for ${screenName}`);
        continue;
      }

      const nonStackedWindows = new Set<number>();

      // Handle floating windows
      if (this.currentLayout?.floats) {
        for (const float of this.currentLayout.floats) {
          const windows = this.findWindowsForLayout(float);
          for (const window of windows) {
            if (
              this.locatedAtWindows.get(window.id) && this.locatedAtWindows.get(window.id) !== screen.name
            ) {
              continue;
            }

            nonStackedWindows.add(window.id);
          }
        }
      }

      // Handle zoomed windows
      if (this.currentLayout?.zoomed) {
        for (const zoomed of this.currentLayout.zoomed) {
          const windows = this.findWindowsForLayout(zoomed);
          for (const window of windows) {
            // Check if the window is explicitly located at a screen
            if (
              this.locatedAtWindows.get(window.id) && this.locatedAtWindows.get(window.id) !== screen.name
            ) {
              continue;
            }

            nonStackedWindows.add(window.id);
            // Set window to full screen bounds of its monitor
            await this.setWindowBounds(window, screen.bounds);
          }
        }
      }

      const stackLocation = await this.reconcileScreenLayout(screen, layout, nonStackedWindows);
      if (stackLocation) {
        for (const window of this.windowCache.values()) {
          if (
            !nonStackedWindows.has(window.id)
            && (
              (!this.locatedAtWindows.has(window.id) && screen.main)
              || this.locatedAtWindows.get(window.id) === screen.name
            )
          ) {
            // log.silly('setting window bounds', window.id, stackLocation)
            await this.setWindowBounds(window, stackLocation);
          }
        }
      } else {
        log.warn(`No stack location found for screen ${screenName}`);
      }
    }
  }

  private async reconcileLayout() {
    try {
      if (this.reconciling) {
        log.warn('Already reconciling');
        return;
      }

      this.reconciling = true;

      if (!this.currentLayout?.screenSets) return;

      // Match monitors to the layout
      for (const screenSet of this.currentLayout.screenSets) {
        let allFound = true;
        for (const screenName of Object.keys(screenSet)) {
          const screen = screenName === SCREEN_PRIMARY
            ? Array.from(this.screenCache.values()).find(s => s.main)
            : this.screenCache.get(screenName);

          if (!screen) {
            allFound = false;
            break;
          }
        }
        if (allFound) {
          await this.reconcileScreenSet(screenSet);
          break;
        }
      }
    } finally {
      this.reconciling = false;

    }
  }

  // Getting the state
  public getState(): WindowManagerState {
    return {
      monitors: Array.from(this.screenCache.values()),
      windows: Array.from(this.windowCache.values()),
      currentLayout: this.currentLayout || DEFAULT_LAYOUT,
      currentApplication: this.currentApplication || undefined
    };
  }
}

let instance: WindowManager | null = null;
export function getInstance(): WindowManager {
  if (!instance) {
    instance = new WindowManager();
  }
  return instance;
}