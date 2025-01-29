import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);

export class ApplicationSwitchCommandMain {
  onStart() {
  }

  onStop() {
    console.log('onStop')
  }

  onMessage(message: any) {
    console.log('onMessage', message)
  }

  async onInvoke(message: any) {
    console.log('onInvoke', message)
    const script = `activate application "${message.application}"`;

    try {
      await execAsync(`osascript -e '${script}'`);
    } catch (error) {
      console.error('Failed to switch application:', error);
    }
  }
}