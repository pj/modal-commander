import { createRequire } from 'node:module';
import {
  Layout,
  Window,
  SCREEN_PRIMARY,
  PinnedLayout,
  ScreenConfig,
  Monitor,
  WindowManagerState,
  Bounds,
  Application,
  StackLayout,
  VisitDetails
} from './WindowManagementTypes';
import log from 'electron-log';
import { C } from 'vitest/dist/chunks/reporters.0x019-V2';

const require = createRequire(import.meta.url);

export const DEFAULT_LAYOUT: ScreenConfig = {
  [SCREEN_PRIMARY]: {
    type: "columns",
    percentage: 100,
    columns: [{
      type: "stack",
      percentage: 100
    }]
  }
}

export class WindowManager {
  private native: any;
  private windowCache: Map<number, Window> = new Map();
  private applicationCache: Map<string, Map<number, Window>> = new Map();
  private screenCache: Map<string, Monitor> = new Map();
  // Map of window id to the monitor it is located at - windows not specifically located are sent to the primary screen
  // private locatedAtWindows: Map<number, string> = new Map();
  private currentLayout: ScreenConfig | null = null;
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
    this.updateTimer = setInterval(
      async () => {
        await this.updateCaches();
        await this.reconcileLayout();
        await this.checkFocus();
      },
      500
    );
  }

  private async checkFocus() {
    const focusedApp = this.native.getFocusedApplication();
    if (focusedApp && focusedApp.name !== this.currentApplication?.name) {
      if (focusedApp.bundleId === "com.github.Electron" || focusedApp.name === "Modal Commander") {
        return;
      }
      const cachedApp = this.applicationCache.get(focusedApp.name);
      const cachedWindows = cachedApp ? Array.from(cachedApp.values()) : [];
      const focusedWindow = cachedWindows.find(window => window.id === focusedApp.window.id);
      this.currentApplication = {
        name: focusedApp.name,
        pid: focusedApp.pid,
        bundleId: focusedApp.bundleId,
        windows: cachedWindows,
        focusedWindow: focusedWindow || undefined
      }
    }
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
      if (window.title === "Electron" || window.title === "Modal Commander") {
        continue;
      }
      this.windowCache.set(window.id, window);

      if (!this.applicationCache.has(window.application)) {
        this.applicationCache.set(window.application, new Map());
      }
      this.applicationCache.get(window.application)?.set(window.id, window);
    }
  }

  // Updating/Modifying the layout
  public async setLayout(layout: ScreenConfig) {
    this.currentLayout = layout;
    await this.reconcileLayout();
  }

  private createPinnedLayout(application: string, window: number | string | null, percentage: number): PinnedLayout {
    const pinned: PinnedLayout = {
      type: "pinned",
      application,
      percentage,
    }
    if (typeof window === "string") {
      pinned.title = window;
    } else if (typeof window === "number") {
      pinned.id = window;
    }
    return pinned;
  }

  private removeSource(
    layout: Layout,
    source: VisitDetails,
  ): boolean {
    if (layout.type === "columns") {
      const [dest, ...rest] = source.location;
      const newColumns: Layout[] = [];
      const ended = rest.length === 0;
      for (let i = 0; i < layout.columns.length; i++) {
        const column = layout.columns[i];
        if (i === dest && ended) {
          if (column.type !== "stack") {
            newColumns.push({
              type: "empty",
              percentage: column.percentage
            });
          } else {
            newColumns.push(column);
          }
        } else {
          const pinned = this.removeSource(column, { ...source, location: rest });
          if (pinned) {
            newColumns.push({
              type: "empty",
              percentage: column.percentage
            });
          } else {
            newColumns.push(column);
          }
        }
      }
      layout.columns = newColumns;
    } else if (layout.type === "rows") {
      const newRows: Layout[] = [];
      const [dest, ...rest] = source.location;
      const ended = rest.length === 0;
      for (let i = 0; i < layout.rows.length; i++) {
        const row = layout.rows[i];
        if (i === dest && ended) {
          if (row.type !== "stack") {
            newRows.push({
              type: "empty",
              percentage: row.percentage
            });
          } else {
            newRows.push(row);
          }
        } else {
          const pinned = this.removeSource(row, { ...source, location: rest });
          if (pinned) {
            newRows.push({
              type: "empty",
              percentage: row.percentage
            });
          } else {
            newRows.push(row);
          }
        }
      }
      layout.rows = newRows;
    } else if (layout.type === "float_zoomed") {
      const pinned = this.removeSource(layout.layout, source);
      if (pinned) {
        layout.layout = {
          type: "empty",
          percentage: layout.layout.percentage
        };
      }

      layout.floats = layout.floats?.filter(float => float.application !== source.applicationName) || [];
      layout.zoomed = layout.zoomed?.filter(zoomed => zoomed.application !== source.applicationName) || [];
    } else if (layout.type === "pinned") {
      if (layout.application === source.applicationName) {
        if (source.windows === null || source.windows.length === 0) {
          return true;
        }

        const newWindows = source.windows?.filter(window => window !== layout.id);
        return newWindows.length === 0;
      }
    }
    return false;
  }

  private addDestination(
    layout: Layout,
    source: VisitDetails,
    destination: VisitDetails,
  ): boolean {
    if (layout.type === "columns") {
      const [dest, ...rest] = destination.location;
      const newColumns: Layout[] = [];
      const ended = rest.length === 0;
      for (let i = 0; i < layout.columns.length; i++) {
        const column = layout.columns[i];
        if (i === dest && ended) {
          if (column.type !== "stack") {
            if (source.applicationName) {
              newColumns.push(
                {
                  type: "pinned",
                  application: source.applicationName,
                  percentage: column.percentage,
                  id: source.windows?.[0]
                }
              )
            } else {
              newColumns.push(source.layout);
            }
          } else {
            newColumns.push(column);
          }
        } else {
          const pinned = this.addDestination(column, source, { ...destination, location: rest });
          if (pinned) {
            newColumns.push(destination.layout);
          } else {
            newColumns.push(column);
          }
        }
      }
      layout.columns = newColumns;
    } else if (layout.type === "rows") {
      const newRows: Layout[] = [];
      const [dest, ...rest] = destination.location;
      const ended = rest.length === 0;
      for (let i = 0; i < layout.rows.length; i++) {
        const row = layout.rows[i];
        if (i === dest && ended) {
          if (row.type !== "stack") {
            if (source.applicationName) {
              newRows.push(
                {
                  type: "pinned",
                  application: source.applicationName,
                  percentage: row.percentage,
                  id: source.windows?.[0]
                }
              )
            } else {
              newRows.push(source.layout);
            }
          } else {
            newRows.push(row);
          }
        } else {
          const pinned = this.addDestination(row, source, { ...destination, location: rest });
          if (pinned) {
            newRows.push(destination.layout);
          } else {
            newRows.push(row);
          }
        }
      }
      layout.rows = newRows;
    } else if (layout.type === "float_zoomed") {
      const pinned = this.addDestination(layout.layout, source, destination);
      if (pinned) {
        layout.layout = destination.layout;
      }

      layout.floats = layout.floats?.filter(float => float.application !== destination.applicationName) || [];
      layout.zoomed = layout.zoomed?.filter(zoomed => zoomed.application !== destination.applicationName) || [];
    } else if (layout.type === "pinned") {
      if (layout.application === destination.applicationName) {
        if (destination.windows === null || destination.windows.length === 0) {
          return true;
        }

        const newWindows = destination.windows?.filter(window => window !== layout.id);
        return newWindows.length === 0;
      }
    }
    return false;
  }

  private monitorForVisitDetails(monitorName: string, visitDetails: VisitDetails): boolean {
      if (visitDetails.monitor === SCREEN_PRIMARY) {
        const primaryMonitor = Array.from(this.screenCache.values()).find(s => s.main);
        if (primaryMonitor) {
          return true;
        }
      }
      if (monitorName === SCREEN_PRIMARY) {
        const primaryMonitor = Array.from(this.screenCache.values()).find(s => s.main);
        if (primaryMonitor) {
          if (primaryMonitor.name === visitDetails.monitor) {
            return true;
          }
        }
      }
      return visitDetails.monitor === monitorName;
    }

  public async moveTo(source: VisitDetails, destination: VisitDetails) {
    if (!this.currentLayout) {
      log.warn(`No current layout`);
      return;
    }
    for (const [monitorName, monitorLayout] of Object.entries(this.currentLayout)) {
      const monitorSource = this.monitorForVisitDetails(monitorName, source);
      if (monitorSource) {
        this.removeSource(monitorLayout, source);
      }

      const monitorDestination = this.monitorForVisitDetails(monitorName, destination);
      if (monitorDestination) {
        this.addDestination(monitorLayout, source, destination);
      }
    }

    await this.reconcileLayout();
  }

  // Reconciling the layout
  private async setWindowBounds(window: Window, bounds: Bounds) {
    let cached = this.windowCache.get(window.id);
    if (!cached) {
      log.warn(`Window ${window.id} not found in cache`);
      return;
    }

    if (
      cached?.bounds.x !== bounds.x
      || cached?.bounds.y !== bounds.y
      || cached?.bounds.width !== bounds.width
      || cached?.bounds.height !== bounds.height
    ) {
      cached.bounds = bounds;
      setTimeout(() => {
        this.native.setWindowBounds(window.id, bounds);
      }, 10);
    }
  }

  private findWindowsForLayout(layout: PinnedLayout): Window[] {
    const windows: Window[] = [];
    const app = this.applicationCache.get(layout.application);
    if (app) {
      if (layout.title) {
        for (const window of app.values()) {
          if (window.title === layout.title || window.id === layout.id) {
            windows.push(window);
          }
        }
      } else {
        windows.push(...Array.from(app.values()));
      }
    } else {
      log.warn("no application found for", layout.application);
    }
    return windows;
  }

  private async reconcileScreenLayout(
    screen: Monitor,
    bounds: Bounds,
    layout: Layout
  ): Promise<[StackLayout | null, Bounds | null, Set<number>]> {
    let stackLocation: Bounds | null = null;
    let stackLayout: Layout | null = null;
    let nonStackedWindows: Set<number> = new Set<number>();

    switch (layout.type) {
      case "columns":
        let xOffset = bounds.x;
        for (const column of layout.columns) {
          const width = bounds.width * (column.percentage || 0) / 100;
          const [foundStackLayout, foundStackLocation, foundNonStackedWindows] = await this.reconcileScreenLayout(
            screen,
            { ...bounds, x: xOffset, width },
            column
          );
          if (foundStackLocation) {
            stackLocation = foundStackLocation;
            stackLayout = foundStackLayout;
          }
          for (const windowId of foundNonStackedWindows) {
            nonStackedWindows.add(windowId);
          }
          xOffset += width;
        }
        break;

      case "rows":
        let yOffset = bounds.y;
        for (const row of layout.rows) {
          const height = bounds.height * (row.percentage || 0) / 100;
          const [foundStackLayout, foundStackLocation, foundNonStackedWindows] = await this.reconcileScreenLayout(
            screen,
            { ...bounds, y: yOffset, height },
            row
          );
          if (foundStackLocation) {
            stackLocation = foundStackLocation;
            stackLayout = foundStackLayout;
          }
          for (const windowId of foundNonStackedWindows) {
            nonStackedWindows.add(windowId);
          }
          yOffset += height;
        }
        break;

      case "pinned":
        const windows = this.findWindowsForLayout(layout);
        layout.computed = windows;
        for (const window of windows) {
          await this.setWindowBounds(window, bounds);
        }
        for (const window of windows) {
          nonStackedWindows.add(window.id);
        }
        break;

      case "stack":
        stackLocation = bounds;
        stackLayout = layout;
        break;
      case "float_zoomed":
        for (const float of layout.floats || []) {
          const windows = this.findWindowsForLayout(float);
          layout.computed_floats = windows;

          for (const window of windows) {
            nonStackedWindows.add(window.id);
          }
        }

        for (const zoomed of layout.zoomed || []) {
          const windows = this.findWindowsForLayout(zoomed);
          layout.computed_zoomed = windows;

          for (const window of windows) {
            await this.setWindowBounds(window, screen.bounds);
          }

          for (const window of windows) {
            nonStackedWindows.add(window.id);
          }
        }

        const [foundStackLayout, foundStackLocation, foundNonStackedWindows] = await this.reconcileScreenLayout(
          screen,
          bounds,
          layout.layout,
        );
        if (foundStackLocation) {
          stackLocation = foundStackLocation;
          stackLayout = foundStackLayout;
        }
        for (const windowId of foundNonStackedWindows) {
          nonStackedWindows.add(windowId);
        }

        break;

      case "empty":
        break;
    }

    return [stackLayout, stackLocation, nonStackedWindows];
  }

  private async reconcileScreenStack(
    screen: Monitor,
    screenLayout: Layout
  ): Promise<[Layout | null, Bounds | null, Set<number>]> {
    const [stackLayout, stackLocation, nonStackedWindows] = await this.reconcileScreenLayout(
      screen,
      screen.bounds,
      screenLayout
    );
    if (stackLayout && stackLocation) {
      stackLayout.computed = [];
      for (const pinned of stackLayout.windows || []) {
        const found = this.findWindowsForLayout(pinned);
        if (found) {
          for (const window of found) {
            stackLayout.computed?.push(window);
            await this.setWindowBounds(window, stackLocation);
          }
        }
      }
    } else {
      // log.warn(`No stack location found for screen ${screen.name}`);
    }

    return [stackLayout, stackLocation, nonStackedWindows];
  }

  private async reconcileScreenSet(screenSet: ScreenConfig) {
    let mainScreen = null;
    let mainScreenLayout = null;
    let nonStackedWindows: Set<number> = new Set<number>();
    for (const [screenName, screenLayout] of Object.entries(screenSet)) {
      const screen = screenName === SCREEN_PRIMARY
        ? Array.from(this.screenCache.values()).find(s => s.main)
        : this.screenCache.get(screenName);

      if (!screen) {
        log.warn(`No screen found for ${screenName}`);
        continue;
      }
      if (screen.main) {
        mainScreen = screen;
        mainScreenLayout = screenLayout;
        continue;
      }
      const [_, __, x] = await this.reconcileScreenStack(screen, screenLayout);
      for (const window of x) {
        nonStackedWindows.add(window);
      }
    }

    // Layout main screen last, as all non pinned/located windows are stacked on it
    if (mainScreen && mainScreenLayout) {
      const [stackLayout, stackLocation, x] = await this.reconcileScreenStack(mainScreen, mainScreenLayout);
      if (!stackLayout) {
        log.warn('No stack layout found for main screen');
        return;
      }
      if (!x) {
        log.warn('No non stacked windows found for main screen');
        return;
      }
      if (!stackLocation) {
        log.warn('No stack location found for main screen');
        return;
      }
      for (const window of x) {
        nonStackedWindows.add(window);
      }

      // Pin all windows that are not stacked on the main screen
      for (const window of this.windowCache.values()) {
        if (!nonStackedWindows.has(window.id)) {
          if (stackLayout.type === "stack") {
            stackLayout.computed?.push(window);
            await this.setWindowBounds(window, stackLocation);
          }
        }
      }
    } else {
      log.warn('No main screen found');
    }
  }

  private async reconcileLayout() {
    try {
      if (this.reconciling) {
        log.warn('Already reconciling');
        return;
      }

      this.reconciling = true;

      if (!this.currentLayout) {
        log.warn('No layout to reconcile');
        return;
      }

      // Match monitors to the layout
      let allFound = true;
      for (const screenName of Object.keys(this.currentLayout)) {
        const screen = screenName === SCREEN_PRIMARY
          ? Array.from(this.screenCache.values()).find(s => s.main)
          : this.screenCache.get(screenName);

        if (!screen) {
          allFound = false;
          break;
        }
      }
      if (allFound) {
        await this.reconcileScreenSet(this.currentLayout);
      } else {
        log.warn('Not all screens found');
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
      currentLayout: this.currentLayout,
      currentApplication: this.currentApplication || undefined
    };
  }

  public async getMonitors(): Promise<Monitor[]> {
    return await this.native.getMonitors();
  }
}

let instance: WindowManager | null = null;
export function getInstance(): WindowManager {
  if (!instance) {
    instance = new WindowManager();
  }
  return instance;
}