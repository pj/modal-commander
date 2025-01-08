import log from "electron-log";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export class VolumeCommandMain {

  onStart() {
    log.info('VolumeCommandMain onStart');
  }

  onStop() {
    log.info('VolumeCommandMain onStop');
  }

  private async handle(message: any) {
    const volumeRaw = await execAsync('osascript -e \'output volume of (get volume settings)\'');
    const volume = parseInt(volumeRaw.stdout.trim());
    if (message.type === 'mute') {
      await execAsync('osascript -e \'set volume output muted to true\'');
    }
    if (message.type === 'up') {
      await execAsync(`osascript -e 'set volume output volume to ${volume + 5}'`);
    }
    if (message.type === 'down') {
      await execAsync(`osascript -e 'set volume output volume to ${volume - 5}'`);
    }
    return {
      volume: volume
    }
  }


  async onMessage(message: any) {
    log.info('VolumeCommandMain onMessage', message);
    await this.handle(message);
  }

  async onInvoke(message: any) {
    log.info('VolumeCommandMain onInvoke', message);
    await this.handle(message);
  }
}