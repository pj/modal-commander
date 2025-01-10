import log from "electron-log";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";

const execAsync = promisify(exec);

const require = createRequire(import.meta.url);

export class VolumeCommandMain {
  private native: any;
  onStart() {
    log.info('VolumeCommandMain onStart');
    this.native = require('../build/Release/VolumeCommand.node');
  }

  onStop() {
    log.info('VolumeCommandMain onStop');
  }

  private async handle(message: any) {
    try {
      const volume = this.native.getVolume();
      const muted = this.native.getMuted();

      if (message.type === 'updateState') {
        log.silly('VolumeCommandMain updateState', message);
        this.native.setVolume(message.state.volume);
        log.silly('setting muted', message.state.muted);
        this.native.muteVolume(message.state.muted);
      }
      return {
        volume: volume,
        muted: muted
      }
    } catch (error) {
      log.error('VolumeCommand error:', error);
      throw error; // Re-throw if you want to propagate the error
    }
  }


  async onMessage(message: any) {
    await this.handle(message);
  }

  async onInvoke(message: any) {
    return await this.handle(message);
  }
}