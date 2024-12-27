import Database from 'better-sqlite3'
import log from 'electron-log'

export class CommandDatabase {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.init()
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS command_state (
        command_id TEXT PRIMARY KEY,
        state TEXT NOT NULL
      )
    `)
  }

  saveState(commandId: string, state: any): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO command_state (command_id, state) VALUES (?, ?)')
    try {
      stmt.run(commandId, JSON.stringify(state))
    } catch (err) {
      log.error(`Failed to save state for command ${commandId}:`, err)
    }
  }

  loadState(commandId: string): any | null {
    const stmt = this.db.prepare('SELECT state FROM command_state WHERE command_id = ?')
    try {
      const row = stmt.get(commandId) as any
      if (row) {
        return JSON.parse(row.state)
      }
    } catch (err) {
      log.error(`Failed to load state for command ${commandId}:`, err)
    }
    return null
  }
} 