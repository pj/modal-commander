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
      if (message.type === 'set') {
        this.native.setVolume(message.volume);
      }
      if (message.type === 'up') {
        this.native.setVolume(volume + 5.0);
      }
      if (message.type === 'down') {
        this.native.setVolume(volume - 5.0);
      }
      if (message.type === 'mute') {
        log.silly('VolumeCommandMain muteVolume', message);
        this.native.muteVolume(message.muted);
      }
      return {
        volume: volume
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