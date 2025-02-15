import log from 'electron-log';
import { getInstance, WindowManager } from './WindowManager';
import { VisitDetails } from './WindowManagementTypes';

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

      const destination: VisitDetails = message.destination;
      const source: VisitDetails = message.source;
      log.info(`Moving window ${source.applicationName} to ${destination.applicationName}`);
      await this.windowManager?.moveTo(source, destination);
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