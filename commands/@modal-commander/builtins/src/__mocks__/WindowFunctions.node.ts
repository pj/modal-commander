import { vi } from "vitest";

export default {
  getMonitors: vi.fn().mockResolvedValue([
    { name: 'MSI PS341WU', main: true, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    { name: 'CX101', main: false, bounds: { x: 1920, y: -100, width: 1920, height: 1080 } }
  ]),
  getWindows: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: 'Test Window',
      application: 'TestApp',
      bounds: { x: 0, y: 0, width: 800, height: 600 }
    }
  ]),
  setWindowBounds: vi.fn().mockResolvedValue(undefined)
}; 