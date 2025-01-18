import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create stateful mock with internal storage
const createMockWindowFunctions = () => {
  const state = {
    monitors: [
      { name: 'MSI PS341WU', main: true, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { name: 'CX101', main: false, bounds: { x: 1920, y: -100, width: 1920, height: 1080 } }
    ],
    windows: [
      {
        id: 1,
        title: 'Test Window',
        application: 'TestApp',
        bounds: { x: 0, y: 0, width: 800, height: 600 }
      }
    ]
  };

  return {
    getMonitors: vi.fn().mockImplementation(() => Promise.resolve(state.monitors)),
    getWindows: vi.fn().mockImplementation(() => Promise.resolve(state.windows)),
    setWindowBounds: vi.fn().mockImplementation(async (windowId: number, bounds: any) => {
      const window = state.windows.find(w => w.id === windowId);
      if (window) {
        window.bounds = { ...bounds };
      }
      return Promise.resolve();
    })
  };
};

const mockWindowFunctions = createMockWindowFunctions();

// Mock createRequire before importing WindowManager
vi.mock('node:module', () => ({
  createRequire: () => ((module: string) => {
    if (module.includes('WindowFunctions.node')) {
      return mockWindowFunctions;
    }
    throw new Error(`Unexpected require: ${module}`);
  })
}));

// Import from correct paths
import { WindowManager, DEFAULT_LAYOUT } from './WindowManager';

describe('WindowManager', () => {
  let windowManager: WindowManager;

  beforeEach(() => {
    vi.useFakeTimers();
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

  it('should set new layout and reconcile', async () => {
    const newLayout = {
      screenSets: [{
        "$PRIMARY": {
          type: "columns" as const,
          columns: [{
            type: "stack" as const,
            percentage: 50
          }, {
            type: "stack" as const,
            percentage: 50
          }]
        }
      }]
    };

    await windowManager.start();
    windowManager.setLayout(newLayout);

    const state = windowManager.getState();
    expect(state.currentLayout).toEqual(newLayout);
  });
}); 