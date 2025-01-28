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
  public focusedApplication = {
    name: "TestApp",
    pid: 1,
    bundleId: "com.test.app",
    windows: [
      {...WINDOWS[0], bounds: {...WINDOWS[0].bounds}}
    ],
    focusedWindow: {...WINDOWS[0], bounds: {...WINDOWS[0].bounds}}
  };

  // getMonitors = vi.fn().mockImplementation(() => {
  //   return Promise.resolve(this.monitors)
  // });

  // getWindows = vi.fn().mockImplementation(() => {
  //   return Promise.resolve(this.windows)
  // });

  // setWindowBounds = vi.fn().mockImplementation(async (windowId: number, bounds: any) => {
  //   const window = this.windows.find(w => w.id === windowId);
  //   if (window) {
  //     window.bounds = { ...bounds };
  //   }
  //   return Promise.resolve();
  // });

  getMonitors = () => {
    return Promise.resolve(this.monitors)
  };

  getWindows = () => {
    return Promise.resolve(this.windows)
  };

  setWindowBounds = async (windowId: number, bounds: any) => {
    const window = this.windows.find(w => w.id === windowId);
    if (window) {
      window.bounds = { ...bounds };
    }
    return Promise.resolve();
  };

  getFocusedApplication = () => {
    return Promise.resolve(this.focusedApplication);
  };

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
import { SCREEN_PRIMARY } from './WindowManagementTypes';

describe('WindowManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Add a test to verify state changes
  it('should update window bounds', async () => {
    const windowManager = createWM();
    await windowManager.start();

    const newBounds = { x: 100, y: 100, width: 1000, height: 800 };
    await mockWindowFunctions.setWindowBounds(1, newBounds);

    const windows = await mockWindowFunctions.getWindows();
    expect(windows[0].bounds).toEqual(newBounds);
  });

  it('Layout on primary monitor', async () => {
    const newLayout = {
      [SCREEN_PRIMARY]: {
        type: "stack" as const,
        percentage: 100,
      }
    }

    const windowManager = createWM();
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
    }
    const windowManager = createWM();
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
    }

    console.log("previous test", mockWindowFunctions.windows[0]);
    const windowManager = createWM();
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
    console.log("starting", mockWindowFunctions.windows[0]);
    const newLayout = {
      [SCREEN_PRIMARY]: {
        type: "float_zoomed" as const,
        floats: [
          {
            type: "pinned" as const,
            application: "TestApp",
            title: "Test Window",
          }
        ],
        layout: {
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
      }
    }

    const windowManager = createWM();
    console.log("after create", mockWindowFunctions.windows[0]);
    await windowManager.start();
    await windowManager.setLayout(newLayout);

    console.log("after", mockWindowFunctions.windows[0]);

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
      [SCREEN_PRIMARY]: {
        type: "float_zoomed" as const,
        zoomed: [
          {
            type: "pinned" as const,
            application: "TestApp",
            title: "Test Window",
          }
        ],
        layout: {
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
      }
    }

    const windowManager = createWM();
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

function createWM() {
  mockWindowFunctions.windows = WINDOWS.map(window => ({...window, bounds: {...window.bounds}}));
  mockWindowFunctions.monitors = [MAIN_MONITOR, SECONDARY_MONITOR];
  return new WindowManager();
}

describe('moveApplicationTo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should move application from stack to pinned', async () => {
    const windowManager = createWM();
    await windowManager.start();
    await windowManager.setLayout({
      [SCREEN_PRIMARY]: {
        type: "columns",
        columns: [
          { type: "stack", percentage: 50 },
          { type: "empty", percentage: 50 },
        ]
      }
    });
    windowManager['currentApplication'] = {
      name: "TestApp",
      pid: 1,
      bundleId: "com.test.app",
      windows: [
        {...WINDOWS[0]}
      ],
      focusedWindow: {...WINDOWS[0]}
    }

    await windowManager.moveApplicationTo(SCREEN_PRIMARY, null, [1]);

    expect(removeComputed(windowManager.getState().currentLayout)).toEqual({
      [SCREEN_PRIMARY]: {
        type: "columns",
        columns: [
          { type: "stack", percentage: 50 },
          { type: "pinned", application: "TestApp", percentage: 50 }
        ]
      }
    });
  });

  it('should move application from stack to deeply nested and remove pinned at destination', async () => {
    const windowManager = createWM();
    await windowManager.start();
    await windowManager.setLayout({
      [SCREEN_PRIMARY]: {
        type: "columns",
        columns: [
          { type: "rows", percentage: 50, rows: [
            { type: "stack", percentage: 50 },
            { type: "pinned", application: "TestApp", percentage: 50 },
          ] },
          { type: "stack", percentage: 50 },
        ]
      }
    });
    windowManager['currentApplication'] = {
      name: "TestApp 2",
      pid: 2,
      bundleId: "com.test.app.2",
      windows: [
        {...WINDOWS[1]}
      ],
      focusedWindow: {...WINDOWS[1]}
    }

    await windowManager.moveApplicationTo(MAIN_MONITOR.name, null, [0, 1]);

    expect(removeComputed(windowManager.getState().currentLayout)).toEqual({
      [SCREEN_PRIMARY]: {
        type: "columns",
        columns: [
          { type: "rows", percentage: 50, rows: [
            { type: "stack", percentage: 50 },
            { type: "pinned", application: "TestApp 2", percentage: 50 }
          ] },
          { type: "stack", percentage: 50 }
        ]
      }
    });
  });

  it('should handle pinning to a second monitor', async () => {
    const windowManager = createWM();
    await windowManager.start();
    await windowManager.setLayout({
      [MAIN_MONITOR.name]: {
        type: "columns",
        percentage: 100,
        columns: [
          { type: "rows", percentage: 50, rows: [
            { type: "stack", percentage: 50 },
            { type: "pinned", application: "TestApp 2", percentage: 50 },
          ] },
          { type: "stack", percentage: 50 },
        ]
      },
      [SECONDARY_MONITOR.name]: {
        type: "columns",
        percentage: 100,
        columns: [
          { type: "empty", percentage: 100 },
        ]
      }
    });
    windowManager['currentApplication'] = {
      name: "TestApp 2",
      pid: 2,
      bundleId: "com.test.app.2",
      windows: [
        {...WINDOWS[1]}
      ],
      focusedWindow: {...WINDOWS[1]}
    }

    await windowManager.moveApplicationTo(SECONDARY_MONITOR.name, null, []);

    expect(removeComputed(windowManager.getState().currentLayout)).toEqual({
      [MAIN_MONITOR.name]: {
        type: "columns",
        percentage: 100,
        columns: [
          { type: "rows", percentage: 50, rows: [
            { type: "stack", percentage: 50 },
            { type: "empty", percentage: 50 }
          ] },
          { type: "stack", percentage: 50 }
        ]
      },
      [SECONDARY_MONITOR.name]: { 
        type: "pinned", 
        application: "TestApp 2", 
        percentage: 100 
      }
    });
  });

  it('should handle pinning to a second monitor nested', async () => {
    const windowManager = createWM();
    await windowManager.start();
    await windowManager.setLayout({
      [MAIN_MONITOR.name]: {
        type: "columns",
        percentage: 100,
        columns: [
          { type: "rows", percentage: 50, rows: [
            { type: "empty", percentage: 50 },
            { type: "pinned", application: "TestApp 2", percentage: 50 },
          ] },
          { type: "stack", percentage: 50 },
        ]
      },
      [SECONDARY_MONITOR.name]: {
        type: "columns",
        percentage: 100,
        columns: [
          { type: "empty", percentage: 100 },
        ]
      }
    });
    windowManager['currentApplication'] = {
      name: "TestApp 2",
      pid: 2,
      bundleId: "com.test.app.2",
      windows: [
        {...WINDOWS[1]}
      ],
      focusedWindow: {...WINDOWS[1]}
    }

    await windowManager.moveApplicationTo(SECONDARY_MONITOR.name, null, [0]);

    expect(removeComputed(windowManager.getState().currentLayout)).toEqual({
      [MAIN_MONITOR.name]: {
        type: "columns",
        percentage: 100,
        columns: [
          { type: "rows", percentage: 50, rows: [
            { type: "empty", percentage: 50 },
            { type: "empty", percentage: 50 }
          ] },
          { type: "stack", percentage: 50 }
        ]
      },
      [SECONDARY_MONITOR.name]: { 
        type: "columns",
        percentage: 100,
        columns: [
          { type: "pinned", application: "TestApp 2", percentage: 100 }
        ]
      }
    });
  });

  it('should handle moving multiple windows to one column', async () => {
    const windowManager = createWM();
    await windowManager.start();
    await windowManager.setLayout({
      [MAIN_MONITOR.name]: {
        type: "columns",
        percentage: 100,
        columns: [
          { type: "stack", percentage: 33 },
          { type: "pinned", application: "TestApp 4", title: "Test Window 4", percentage: 33 },
          { type: "pinned", application: "TestApp 4", title: "Test Window 5", percentage: 33 },
        ] 
      },
    });
    windowManager['currentApplication'] = {
      name: "TestApp 4",
      pid: 4,
      bundleId: "com.test.app.4",
      windows: [
        {...WINDOWS[4]},
        {...WINDOWS[5]},
      ],
      focusedWindow: {...WINDOWS[4]}
    }

    await windowManager.moveApplicationTo(MAIN_MONITOR.name, null, [1]);

    expect(removeComputed(windowManager.getState().currentLayout)).toEqual({
      [MAIN_MONITOR.name]: {
        type: "columns",
        percentage: 100,
        columns: [
          { type: "stack", percentage: 33 },
          { type: "pinned", application: "TestApp 4", percentage: 33 },
          { type: "empty", percentage: 33 },
        ]
      },
    });
  });

  it('should move application from float_zoomed to pinned', async () => {
    const windowManager = createWM();
    await windowManager.start();
    await windowManager.setLayout({
      [SCREEN_PRIMARY]: {
        type: "float_zoomed",
        floats: [
          { type: "pinned", application: "TestApp", percentage: 100 },
        ],
        layout: {
          type: "columns",
          columns: [
            { type: "stack", percentage: 50 },
            { type: "empty", percentage: 50 },
          ]
        }
      }
    });
    windowManager['currentApplication'] = {
      name: "TestApp",
      pid: 1,
      bundleId: "com.test.app",
      windows: [
        {...WINDOWS[0]}
      ],
      focusedWindow: {...WINDOWS[0]}
    }

    await windowManager.moveApplicationTo(SCREEN_PRIMARY, null, [1]);

    expect(removeComputed(windowManager.getState().currentLayout)).toEqual({
      [SCREEN_PRIMARY]: {
        type: "float_zoomed",
        floats: [],
        zoomed: [],
        layout: {
          type: "columns",
          columns: [
            { type: "stack", percentage: 50 },
            { type: "pinned", application: "TestApp", percentage: 50 },
          ]
        }
      }
    });
  });

});

// Helper function to remove computed fields recursively
function removeComputed(screenSet: any) {
  const output: any = {};
  for (const [key, value] of Object.entries(screenSet)) {
    output[key] = removeComputedLayout(value);
  }
  return output;
}

function removeComputedLayout(layout: any): any {
  if (!layout) return layout;
  
  const { computed, computed_floats, computed_zoomed, ...rest } = layout;
  
  if (rest.columns) {
    rest.columns = rest.columns.map(removeComputedLayout);
  }
  if (rest.rows) {
    rest.rows = rest.rows.map(removeComputedLayout);
  }
  if (rest.layout) {
    rest.layout = removeComputedLayout(rest.layout);
  }
  
  return rest;
}