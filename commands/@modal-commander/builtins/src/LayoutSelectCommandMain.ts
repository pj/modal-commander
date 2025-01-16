import log from 'electron-log';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

interface Monitor {
    id: number;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    main: boolean;
    'built-in': boolean;
    width: number;
    height: number;
    refreshRate: number;
    name: string;
}

interface Window {
    id: number;
    application: string;
    name: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export class LayoutSelectCommandMain {
    private native: any;
    private config: any;

    constructor(db: any, config: any) {
        this.config = config;
    }

    onStart() {
        this.native = require('../build/Release/WindowFunctions.node');
    }

    // getMonitors(): Monitor[] {
    //     return this.native.getMonitors();
    // }

    // getWindows(): Window[] {
    //     return this.native.getWindows();
    // }

    // setWindowBounds(windowId: number, bounds: { x: number; y: number; width: number; height: number }) {
    //     this.native.setWindowBounds(windowId, bounds);
    // }

    async handle(message: any) {
        log.silly('LayoutSelectCommandMain handle', message);
        return {
          monitors: this.native.getMonitors(),
          windows: this.native.getWindows(),
          layouts: this.config.layouts
        }
    }

    onMessage(message: any) {
        log.silly('LayoutSelectCommandMain onMessage', message);
    }

    async onInvoke(message: any) {
        log.silly('LayoutSelectCommandMain onInvoke', message);
        return await this.handle(message);
    }
} 