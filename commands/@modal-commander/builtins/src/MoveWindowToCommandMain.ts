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
      if (message.source === "app") {
        await this.windowManager?.moveApplicationTo(message.monitor, message.destination);
      } else if (message.source === "window") {
        await this.windowManager?.moveWindowTo(message.windowId, message.destination);
      }
    }
    return {
      ...state
    }
  }

  onMessage(message: any) {
  }

  async onInvoke(message: any) {
    log.info("MoveWindowToCommandMain onInvoke", message);
    return await this.handle(message);
  }
} 