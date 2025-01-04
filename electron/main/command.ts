import log from "electron-log";
import { pathToFileURL } from "node:url";
import { CommandDatabase } from "./database";
import path from "node:path";
import { ModalCommanderConfig } from "./modal_commander_config";
import fs from "node:fs/promises";

export async function loadCommand(db: CommandDatabase, config: ModalCommanderConfig, commandRoots: string[]) {
  let messageListeners = new Map<string, any>()
  for (const commandRoot of commandRoots) {
    try {
      const namespaces = await fs.readdir(commandRoot, { withFileTypes: true })
        .then(dirs => dirs.filter(dirent => dirent.isDirectory()))
        
      for (const namespace of namespaces) {
        const namespacePath = path.join(commandRoot, namespace.name)
        const packages = await fs.readdir(namespacePath, { withFileTypes: true })
          .then(pkgs => pkgs.filter(pkg => pkg.isDirectory()))
        
        for (const pkg of packages) {
          const packagePath = path.resolve(namespacePath, pkg.name);
          const mainPath = path.resolve(
            packagePath,
            'dist',
            'main.js'
          )

          try {
            // statSync(mainPath)
            const packageMain = await import(pathToFileURL(mainPath).toString())
              console.log(config.commandConfig, pkg.name)
            for (const [commandName, commandClass] of Object.entries(packageMain.default)) {
              const commandConfig = config.commandConfig.find(c => c.name === commandName && c.package === `${namespace.name}/${pkg.name}`);
              console.log(commandName, commandConfig)

              const listener = new (commandClass as any)(db, commandConfig?.config);  // Pass database instance here
              await listener.onStart(packagePath);
              messageListeners.set(`${namespace.name}/${pkg.name}#${commandName}`, listener)
            }
          } catch (err) {
            log.warn(`Could not load command main process code: ${mainPath}`, err)
          }
        }
      }
    } catch (err) {
      log.warn(`Could not read command root: ${commandRoot}`, err)
    }

  }

    return messageListeners
}