import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import log from 'electron-log';
const execAsync = promisify(exec);

interface SiteBlockerConfig {
  timeLimit: number;
  weekendTimeLimit: number;
  hostsTemplate: string;
  blocklistFilename: string;
  permanentBlocklistFilename: string;
  closeTabScriptFilename: string;
  hostsFilePath: string;
}

interface TimeState {
  timeSpent: number;
  blocked: boolean;
  timeLimit: number;
  validTime: boolean;
}

interface StoredState {
  currentDay: string | null;
  timeSpent: number;
}

export class SiteBlockerMain {
  private debug: boolean = false;
  private currentTimer: NodeJS.Timer | null = null;
  private timeOfDayTimer: NodeJS.Timer | null = null;
  private store: Map<string, any> = new Map();
  private commandId: string = '@modal-commander/builtins.SiteBlocker';
  private db: any;

  // Config properties
  private timeLimit: number;
  private weekendTimeLimit: number;
  private hostsTemplate: string;
  private blocklistFilename: string;
  private permanentBlocklistFilename: string;
  private closeTabScriptFilename: string;
  private hostsFilePath: string;
  constructor(db: any, config: SiteBlockerConfig) {
    this.db = db;
    this.timeLimit = config.timeLimit;
    this.weekendTimeLimit = config.weekendTimeLimit;
    this.hostsTemplate = config.hostsTemplate;
    this.blocklistFilename = config.blocklistFilename;
    this.permanentBlocklistFilename = config.permanentBlocklistFilename;
    this.closeTabScriptFilename = config.closeTabScriptFilename;
    this.hostsFilePath = config.hostsFilePath;
  }

  private async updateBlockList(block: boolean): Promise<void> {
    if (block) {
      try {
        const closerScript = `osascript ${this.closeTabScriptFilename}`;
        await execAsync(closerScript);
      } catch (err) {
        log.error('Error running close tab script:', err);
      }
    }

    const tmpname = await this.generateHostsFile(block);
    const command = `osascript -e 'do shell script "sudo cp ${tmpname} ${this.hostsFilePath}" with administrator privileges'`;
    
    try {
      await execAsync(command);
    } finally {
      await fs.promises.unlink(tmpname);
    }
  }

  private async generateHostsFile(block: boolean): Promise<string> {
    const blocklist = await fs.promises.readFile(this.blocklistFilename, 'utf8');
    const permanentBlocklist = await fs.promises.readFile(this.permanentBlocklistFilename, 'utf8');
    const template = await fs.promises.readFile(this.hostsTemplate, 'utf8');

    const tmpname = path.join(os.tmpdir(), `hosts-${Date.now()}`);
    let content = template + '\n';

    if (block) {
      content += blocklist.split('\n')
        .filter(line => line.trim())
        .map(line => `0.0.0.0    ${line}\n`)
        .join('');
    }

    content += permanentBlocklist.split('\n')
      .filter(line => line.trim())
      .map(line => `0.0.0.0    ${line}\n`)
      .join('');

    await fs.promises.writeFile(tmpname, content);
    return tmpname;
  }

  private loadStoredState(): void {
    const state = this.db.loadState(this.commandId);
    if (state) {
      this.store.set('currentDay', state.currentDay ? new Date(state.currentDay) : null);
      this.store.set('timeSpent', state.timeSpent);
    }
  }

  private saveStoredState(): void {
    const currentDay = this.store.get('currentDay');
    this.db.saveState(this.commandId, {
      currentDay: currentDay ? currentDay.toISOString() : null,
      timeSpent: this.store.get('timeSpent') || 0
    });
  }

  private resetState(): void {
    this.store.set('currentDay', null);
    this.store.set('timeSpent', 0);
    this.currentTimer = null;
    this.saveStoredState();
  }

  private runBlockTimer(): void {
    const now = new Date();
    const weekday = now.getDay() > 1 && now.getDay() < 7;
    const timeSpent = this.store.get('timeSpent') || 0;
    const actualTimeLimit = weekday ? this.timeLimit : this.weekendTimeLimit;

    const message = this.checkTime(now);
    if (message) {
      this.updateBlockList(true);
      if (this.currentTimer) {
        clearInterval(this.currentTimer);
        this.currentTimer = null;
      }
      return;
    }

    this.store.set('timeSpent', timeSpent + 1);
    this.saveStoredState();
  }

  private checkTime(now: Date): string | null {
    const timeSpent = this.store.get('timeSpent') || 0;
    const weekday = now.getDay() > 1 && now.getDay() < 7;
    const actualTimeLimit = weekday ? this.timeLimit : this.weekendTimeLimit;

    if (timeSpent > actualTimeLimit) {
      return 'No more time available today.';
    }

    if (now.getHours() >= 1 && now.getHours() < 18) {
      return "Go back to work.";
    }

    return null;
  }

  private async hostsFileChanged(): Promise<boolean> {
    const tmpname = await this.generateHostsFile(true);
    const generatedContent = fs.readFileSync(tmpname, 'utf8');
    const currentContent = fs.readFileSync(this.hostsFilePath, 'utf8');
    fs.unlinkSync(tmpname);
    return generatedContent !== currentContent;
  }

  private checkResetState(): void {
    const now = new Date();
    const currentDay = this.store.get('currentDay');
    
    if (!currentDay || currentDay.getDate() !== now.getDate()) {
      this.store.set('currentDay', now);
      if (this.currentTimer) {
        clearInterval(this.currentTimer);
        this.currentTimer = null;
      }
      this.store.set('timeSpent', 0);
    }
  }

  async toggleSiteBlocking(): Promise<void> {
    this.checkResetState();
    const now = new Date();

    if (this.currentTimer) {
      clearInterval(this.currentTimer);
      this.currentTimer = null;
      await this.updateBlockList(true);
      log.info('Starting Blocking...');
    } else {
      const message = this.checkTime(now);
      if (message) {
        if (await this.hostsFileChanged()) {
          await this.updateBlockList(true);
        }
        log.info(message);
        return;
      }

      await this.updateBlockList(false);
      this.currentTimer = setInterval(() => this.runBlockTimer(), 60000);
      log.info('Enjoy internet time...');
    }
  }

  start(): void {
    this.timeOfDayTimer = setInterval(() => this.runTimeOfDayTimer(), 15000);
  }

  private runTimeOfDayTimer(): void {
    const now = new Date();
    if (this.currentTimer && now.getHours() >= 1 && now.getHours() < 18) {
      clearInterval(this.currentTimer);
      this.currentTimer = null;
      this.updateBlockList(true);
      log.info('Go back to work.');
    }
  }

  getState(): TimeState {
    this.checkResetState();
    const now = new Date();
    const weekday = now.getDay() > 1 && now.getDay() < 7;
    const timeSpent = this.store.get('timeSpent') || 0;
    const actualTimeLimit = weekday ? this.timeLimit : this.weekendTimeLimit;

    return {
      timeSpent,
      blocked: this.currentTimer === null,
      timeLimit: actualTimeLimit,
      validTime: !(now.getHours() >= 1 && now.getHours() < 18)
    };
  }

  async onStart(packagePath: string): Promise<void> {
    this.loadStoredState();
    this.start();
  }

  async onMessage(message: any): Promise<void> {
    if (message.type === 'toggle') {
      await this.toggleSiteBlocking();
    }
  }
}

export default {
  SiteBlockerMain
};
