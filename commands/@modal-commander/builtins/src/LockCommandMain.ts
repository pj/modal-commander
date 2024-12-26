import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class LockCommandMain {
  async onStart(packagePath: string) {
    // Initialization code if needed
  }

  async onMessage(message: any) {
    try {
      await execAsync('open -a ScreenSaverEngine');
    } catch (error) {
      console.error('Failed to lock screen:', error);
    }
  }
}

export default {
  LockCommandMain
};