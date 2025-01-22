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