import log from 'electron-log';
import { getInstance, WindowManager } from './WindowManager';

export class MoveWindowToCommandMain {
  private config: any;
  private windowManager: WindowManager | null = null;

  constructor(db: any, config: any) {
    this.config = config;
  }

  onStart() {
    this.windowManager = getInstance();
    this.windowManager.start();
  }

  async handle(message: any) {
    const state = this.windowManager?.getState();
    if (message.type === "moveWindowTo") {
      if (!state) {
        log.warn("No state");
        return;
      }

      const currentApplication = state?.currentApplication;
      if (!currentApplication) {
        log.warn("No current application");
        return;
      }

      if (message.source === "app") {
        await this.windowManager?.moveTo(message.monitor, currentApplication.name, null, message.destination);
      } else if (message.source === "window") {
        if (currentApplication.focusedWindow) {
          await this.windowManager?.moveTo(
            message.monitor, 
            currentApplication.name, 
            currentApplication.focusedWindow.id, 
            message.destination
          );
        } else {
          log.warn("No focused window");
        }
      }
    }
    return {
      ...state
    }
  }

  onMessage(message: any) {
  }

  async onInvoke(message: any) {
    return await this.handle(message);
  }
} 