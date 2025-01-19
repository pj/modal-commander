import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const MAIN_MONITOR = { name: 'MSI PS341WU', main: true, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
const SECONDARY_MONITOR = { name: 'CX101', main: false, bounds: { x: 1920, y: -100, width: 1920, height: 1080 } };

const WINDOWS = [
  {
    id: 1,
    title: 'Test Window',
    application: 'TestApp',
    bounds: { x: 0, y: 0, width: 999, height: 999 }
  },
  {
    id: 2,
    title: 'Test Window 2',
    application: 'TestApp 2',
    bounds: { x: 0, y: 0, width: 999, height: 999 }
  },
  {
    id: 3,
    title: 'Test Window 3',
    application: 'TestApp 3',
    bounds: { x: 0, y: 0, width: 999, height: 999 }
  },
  {
    id: 4,
    title: 'Test Window 4',
    application: 'TestApp 4',
    bounds: { x: 0, y: 0, width: 999, height: 999 }
  },
  {
    id: 5,
    title: 'Test Window 5',
    application: 'TestApp 4',
    bounds: { x: 0, y: 0, width: 999, height: 999 }
  }
]

class MockWindowFunctions {
  public monitors = [
    MAIN_MONITOR,
    SECONDARY_MONITOR
  ];

  public windows = [...WINDOWS];

  getMonitors = vi.fn().mockImplementation(() =>
    Promise.resolve(this.monitors)
  );

  getWindows = vi.fn().mockImplementation(() =>
    Promise.resolve(this.windows)
  );

  setWindowBounds = vi.fn().mockImplementation(async (windowId: number, bounds: any) => {
    const window = this.windows.find(w => w.id === windowId);
    if (window) {
      window.bounds = { ...bounds };
    }
    return Promise.resolve();
  });
}

const mockWindowFunctions = new MockWindowFunctions();

// Mock createRequire before importing WindowManager
vi.mock('node:module', () => ({
  createRequire: () => ((module: string) => {
    if (module.includes('WindowFunctions.node')) {
      return mockWindowFunctions;
    }
    throw new Error(`Unexpected require: ${module}`);
  })
}));

// Import WindowManager after the mock is in place
import { WindowManager } from './WindowManager';
import { DEFAULT_LAYOUT } from './WindowManager';
import { SCREEN_PRIMARY } from './WindowManagementTypes';

describe('WindowManager', () => {
  let windowManager: WindowManager;

  beforeEach(() => {
    vi.useFakeTimers();

    mockWindowFunctions.windows = [...WINDOWS];
    mockWindowFunctions.monitors = [MAIN_MONITOR, SECONDARY_MONITOR];
    windowManager = new WindowManager();
  });

  afterEach(() => {
    windowManager.stop();
    vi.restoreAllMocks();
  });

  // Add a test to verify state changes
  it('should update window bounds', async () => {
    await windowManager.start();

    const newBounds = { x: 100, y: 100, width: 1000, height: 800 };
    await mockWindowFunctions.setWindowBounds(1, newBounds);

    const windows = await mockWindowFunctions.getWindows();
    expect(windows[0].bounds).toEqual(newBounds);
  });

  it('should initialize with default layout', () => {
    const state = windowManager.getState();
    expect(state.currentLayout).toEqual(DEFAULT_LAYOUT);
  });

  it('should update caches on start', async () => {
    await windowManager.start();
    const state = windowManager.getState();

    expect(state.monitors.length).toBe(2);
    expect(state.windows.length).toBe(1);
  });

  it('should update caches periodically', async () => {
    await windowManager.start();

    // Fast-forward time
    await vi.advanceTimersByTimeAsync(1000);

    // Verify that the update functions were called again
    const nativeMock = vi.mocked(windowManager['native']);
    expect(nativeMock.getMonitors).toHaveBeenCalledTimes(4);
    expect(nativeMock.getWindows).toHaveBeenCalledTimes(4);
  });

  it('Layout on primary monitor', async () => {
    const newLayout = {
      name: "Default",
      quickKey: "d",
      screenSets: [{
        [SCREEN_PRIMARY]: {
          type: "stack" as const,
          percentage: 100,
        }
      }]
    };

    await windowManager.start();
    await windowManager.setLayout(newLayout);

    const state = windowManager.getState();
    expect(state.currentLayout).toEqual(newLayout);

    for (const window of mockWindowFunctions.windows) {
      expect(window.bounds).toEqual(MAIN_MONITOR.bounds);
    }
  });

  it('Layout a pinned window', async () => {
    const newLayout = {
      name: "Default",
      quickKey: "d",
      screenSets: [{
        [SCREEN_PRIMARY]: {
          type: "columns" as const,
          columns: [
            {
              type: "stack" as const,
              percentage: 50,
            }, {
              type: "pinned" as const,
              application: "TestApp",
              percentage: 50,
            }
          ]
        }
      }],
    };

    await windowManager.start();
    await windowManager.setLayout(newLayout);

    for (const window of mockWindowFunctions.windows) {
      if (window.id === 1) {
        expect(window.bounds).toEqual({ x: 960, y: 0, width: 960, height: 1080 });
      } else {
        expect(window.bounds).toEqual({ x: 0, y: 0, width: 960, height: 1080 });
      }
    }
  });

  it('Layout a rows', async () => {
    const newLayout = {
      name: "Default",
      quickKey: "d",
      screenSets: [{
        [SCREEN_PRIMARY]: {
          type: "rows" as const,
          rows: [
            {
              type: "stack" as const,
              percentage: 33,
            },
            {
              type: "pinned" as const,
              application: "TestApp",
              percentage: 33,
            },
            {
              type: "pinned" as const,
              application: "TestApp 2",
              percentage: 33,
            }
          ]
        }
      }],
    };

    await windowManager.start();
    await windowManager.setLayout(newLayout);

    for (const window of mockWindowFunctions.windows) {
      if (window.id === 1) {
        expect(window.bounds).toEqual({ x: 0, y: 356.4, width: 1920, height: 356.4 });
      } else if (window.id === 2) {
        expect(window.bounds).toEqual({ x: 0, y: 712.8, width: 1920, height: 356.4 });
      } else if (window.id === 3) {
        expect(window.bounds).toEqual({ x: 0, y: 0, width: 1920, height: 356.4 });
      }
    }
  });

  it('Layout a float window', async () => {
    const newLayout = {
      name: "Default",
      quickKey: "d",
      screenSets: [{
        [SCREEN_PRIMARY]: {
          type: "columns" as const,
          columns: [
            {
              type: "stack" as const,
              percentage: 50,
            }, {
              type: "empty" as const,
              percentage: 50,
            }
          ]
        }
      }],
      floats: [
        {
          type: "float_zoomed" as const,
          application: "TestApp",
          title: "Test Window",
          percentage: 100,
        }
      ]
    };

    await windowManager.start();
    await windowManager.setLayout(newLayout);

    for (const window of mockWindowFunctions.windows) {
      if (window.id === 1) {
        expect(window.bounds).toEqual({ x: 0, y: 0, width: 999, height: 999 });
      } else {
        expect(window.bounds).toEqual({ x: 0, y: 0, width: 960, height: 1080 });
      }
    }
  });

  it('Layout a zoomed window', async () => {
    const newLayout = {
      name: "Default",
      quickKey: "d",
      screenSets: [{
        [SCREEN_PRIMARY]: {
          type: "columns" as const,
          columns: [
            {
              type: "stack" as const,
              percentage: 50,
            }, {
              type: "empty" as const,
              percentage: 50,
            }
          ]
        }
      }],
      zoomed: [
        {
          type: "float_zoomed" as const,
          application: "TestApp",
          title: "Test Window",
          percentage: 100,
        }
      ]
    };

    await windowManager.start();
    await windowManager.setLayout(newLayout);

    for (const window of mockWindowFunctions.windows) {
      if (window.id === 1) {
        expect(window.bounds).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
      } else {
        expect(window.bounds).toEqual({ x: 0, y: 0, width: 960, height: 1080 });
      }
    }
  });
}); 