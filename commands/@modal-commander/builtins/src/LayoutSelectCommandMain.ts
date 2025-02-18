import log from 'electron-log';
import { getInstance, WindowManager } from './WindowManager';
import { Layout, Monitor, SCREEN_PRIMARY, ScreenConfig, WindowManagerLayout } from "./WindowManagementTypes";
import { findMatchingScreenSet } from './WindowManagerUtils';

export class LayoutSelectCommandMain {
  private config: any;
  private windowManager: WindowManager | null = null;

  constructor(db: any, config: any) {
    this.config = config;
  }

  async onStart() {
    this.windowManager = getInstance();
    this.windowManager.start();
    const layout = this.config.layouts.find((l: WindowManagerLayout) => l.quickKey === this.config.defaultLayout);
    const monitors = await this.windowManager.getMonitors();
    const matchingLayout = findMatchingScreenSet(layout, monitors);
    if (matchingLayout) {
      const layoutCopy = JSON.parse(JSON.stringify(matchingLayout));
      this.windowManager.setLayout(layoutCopy);
    }
  }

  async handle(message: any) {
    switch (message.type) {
      case 'getState':
        return {
          ...this.windowManager?.getState(),
          layouts: this.config.layouts
        };
      case 'setLayout':
        const layout = this.config.layouts.find((l: WindowManagerLayout) => l.quickKey === message.quickKey);
        if (layout) {
          const matchingLayout = findMatchingScreenSet(layout, this.windowManager?.getState().monitors || []);
          if (matchingLayout) {
            const layoutCopy = JSON.parse(JSON.stringify(matchingLayout));
            await this.windowManager?.setLayout(layoutCopy);
          } else {
            log.warn(`No matching layout found for ${message.quickKey}`);
          }
        } else {
          log.warn(`Layout ${message.quickKey} not found`);
        }
        break;
    }

    const state = this.windowManager?.getState();
    return {
      ...state,
      layouts: this.config.layouts
    }
  }

  onMessage(message: any) {
  }

  async onInvoke(message: any) {
    return await this.handle(message);
  }
} 