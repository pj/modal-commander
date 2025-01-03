import { SiteBlockerMain } from "./SiteBlockerMain";

class TestDatabase {
  private state: Map<string, any> = new Map()

  saveState(commandId: string, state: any): void {
    this.state.set(commandId, state)
  }

  loadState(commandId: string): any | null {
    return this.state.get(commandId)
  }
} 

const database = new TestDatabase();
const siteBlocker = new SiteBlockerMain(database, {
  "timeLimit": 60,
  "weekendTimeLimit": 120,
  "blocklistFilename": "/Users/pauljohnson/.blocklist",
  "permanentBlocklistFilename": "/Users/pauljohnson/.permanent_blocklist",
  "hostsTemplate": "/Users/pauljohnson/.hosts_template",
  "hostsFilePath": "/etc/hosts",
  "closeTabScriptFilename": "/Users/pauljohnson/dotfiles/hammerspoon/tabCloser.scpt"
});

const state = await siteBlocker.onMessage({ type: 'toggle' });
console.log(state);
const state2 = await siteBlocker.onMessage({ type: 'toggle' });
console.log(state2);
