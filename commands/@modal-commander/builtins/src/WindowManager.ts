import log from 'electron-log';
import { createRequire } from 'module';
import {
  Layout,
  LayoutType,
  Window,
  // WindowCache,
  // ApplicationCache,
  // ScreenCache,
  WindowManagerLayout,
  SCREEN_PRIMARY,
  PinnedLayout,
  ScreenConfig,
  Monitor,
  FloatZoomedLayout,
  WindowManagerState
} from './WindowManagementTypes';

const require = createRequire(import.meta.url);

const DEFAULT_LAYOUT: WindowManagerLayout = {
  screens: [{
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
  private currentLayout: WindowManagerLayout = DEFAULT_LAYOUT;
  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.native = require('../build/Release/WindowFunctions.node');
    this.start();
  }

  // Initialization and periodic update handling
  public async start() {
    await this.updateScreenCache();
    await this.updateWindowCache();
    this.startWindowWatcher();
  }

  public stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private startWindowWatcher() {
    // Poll for window changes every second
    this.updateTimer = setInterval(async () => {
      await this.updateScreenCache();
      await this.updateWindowCache();
      await this.reconcileLayout();
    }, 1000);
  }

  private async updateScreenCache() {
    const monitors = await this.native.getMonitors();
    this.screenCache = new Map();
    for (const monitor of monitors) {
      this.screenCache.set(monitor.name, monitor);
    }
  }

  private async updateWindowCache() {
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
  public setLayout(layout: WindowManagerLayout) {
    this.currentLayout = layout;
    this.reconcileLayout();
  }


  // Screen reconciliation and update
  private windowIsPinned(layout: PinnedLayout, window: Window): boolean {
    if (layout.application !== window.application) return false;
    if (layout.title && layout.title !== window.title) return false;
    return true;
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

  private async reconcileScreenLayout(screen: Monitor, layout: Layout, nonStackedWindows: Set<number>) {
    const bounds = screen.bounds;

    switch (layout.type) {
      case "columns":
        let xOffset = bounds.x;
        for (const column of layout.columns) {
          const width = bounds.width * (column.percentage || 0) / 100;
          await this.reconcileScreenLayout(
            { ...screen, bounds: { ...bounds, x: xOffset, width } },
            column,
            nonStackedWindows
          );
          xOffset += width;
        }
        break;

      case "rows":
        let yOffset = bounds.y;
        for (const row of layout.rows) {
          const height = bounds.height * (row.percentage || 0) / 100;
          await this.reconcileScreenLayout(
            { ...screen, bounds: { ...bounds, y: yOffset, height } },
            row,
            nonStackedWindows
          );
          yOffset += height;
        }
        break;

      case "pinned":
        const windows = this.findWindowsForLayout(layout);
        for (const window of windows) {
          if (!nonStackedWindows.has(window.id)) {
            nonStackedWindows.add(window.id);
            await this.native.setWindowBounds(window.id, bounds);
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
        break;
    }
  }

  private async reconcileScreenSet(screenSet: ScreenConfig) {
    const nonStackedWindows = new Set<number>();

    // Handle floating windows
    if (this.currentLayout?.floats) {
      for (const float of this.currentLayout.floats) {
        const windows = this.findWindowsForLayout(float);
        for (const window of windows) {
          nonStackedWindows.add(window.id);
        }
      }
    }

    // Handle zoomed windows
    if (this.currentLayout?.zoomed) {
      for (const zoomed of this.currentLayout.zoomed) {
        const windows = this.findWindowsForLayout(zoomed);
        for (const window of windows) {
          nonStackedWindows.add(window.id);
          // Set window to full screen bounds of its monitor
          const monitor = this.screenCache.get(window.bounds.x.toString()); // Simplified monitor detection
          if (monitor) {
            await this.native.setWindowBounds(window.id, monitor.bounds);
          }
        }
      }
    }

    // Handle regular layout
    for (const [screenName, layout] of Object.entries(screenSet)) {
      const screen = screenName === SCREEN_PRIMARY
        ? Array.from(this.screenCache.values()).find(s => s.main)
        : this.screenCache.get(screenName);

      if (screen) {
        await this.reconcileScreenLayout(screen, layout, nonStackedWindows);
      }
    }

    // Set all windows to be stacked
    for (const window of Object.values(this.windowCache)) {
      if (!nonStackedWindows.has(window.id)) {
        await this.native.setWindowBounds(window.id, { x: 0, y: 0, width: 0, height: 0 });
      }
    }
  }

  private async reconcileLayout() {
    if (!this.currentLayout?.screens) return;

    for (const screenSet of this.currentLayout.screens) {
      await this.reconcileScreenSet(screenSet);
    }
  }

  // Getting the state
  public getState(): WindowManagerState {
    return {
      monitors: this.screenCache,
      windows: this.windowCache,
      currentLayout: this.currentLayout || DEFAULT_LAYOUT
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