import log from 'electron-log';
import { getInstance, WindowManager } from './WindowManager';

export class LayoutSelectCommandMain {
    private config: any;
    private windowManager: WindowManager | null = null;

    constructor(db: any, config: any) {
        this.config = config;
        log.info('LayoutSelectCommandMain constructor', config)
    }

    onStart() {
        this.windowManager = getInstance();
        this.windowManager.start();
    }

    async handle(message: any) {
        if (message.type === 'setLayout') {
            await this.windowManager?.setLayout(message.layout);
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