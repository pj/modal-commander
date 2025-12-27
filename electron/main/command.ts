import log from "electron-log";
import { pathToFileURL } from "node:url";
import { CommandDatabase } from "./database";
import path from "node:path";
import { ModalCommanderConfig } from "./modal_commander_config";
import fs from "node:fs/promises";

export async function loadCommand(db: CommandDatabase, config: ModalCommanderConfig, commandRoots: string[]) {
  log.info('loadCommand called with commandRoots:', commandRoots);
  let messageListeners = new Map<string, any>()
  for (const commandRoot of commandRoots) {
    try {
        // Try to read the directory directly - Node.js handles ASAR paths transparently
      const namespaces = await fs.readdir(commandRoot, { withFileTypes: true })
        .then(dirs => dirs.filter(dirent => dirent.isDirectory()))
        
      for (const namespace of namespaces) {
        log.info(`Processing namespace: ${namespace.name}`);
        const namespacePath = path.join(commandRoot, namespace.name)
        const packages = await fs.readdir(namespacePath, { withFileTypes: true })
          .then(pkgs => pkgs.filter(pkg => pkg.isDirectory()))
        
        log.info(`Found ${packages.length} packages in namespace ${namespace.name}`);
        for (const pkg of packages) {
          log.info(`Processing package: ${namespace.name}/${pkg.name}`);
          const packagePath = path.resolve(namespacePath, pkg.name);
          const mainPath = path.resolve(
            packagePath,
            'dist',
            'main.js'
          )

          try {
            console.log('mainPath', mainPath)
            console.log('pathToFileURL(mainPath).toString()', pathToFileURL(mainPath).toString())
            // statSync(mainPath)
            const packageMain = await import(pathToFileURL(mainPath).toString())
            for (const [commandName, commandClass] of Object.entries(packageMain.default)) {
              const commandConfig = config.commandConfig.find(c => c.name === commandName && c.package === `${namespace.name}/${pkg.name}`);

              const listener = new (commandClass as any)(db, commandConfig?.config);  // Pass database instance here
              try {
              await listener.onStart(packagePath);
              } catch (onStartErr) {
                log.error(`Error in onStart for ${namespace.name}/${pkg.name}#${commandName}:`, onStartErr);
                // Continue anyway - register the listener even if onStart fails
              }
              const commandKey = `${namespace.name}/${pkg.name}#${commandName}`;
              messageListeners.set(commandKey, listener);
              log.info(`Registered command: ${commandKey}`);
            }
          } catch (err) {
            log.warn(`Could not load command main process code: ${mainPath}`, err)
          }
        }
      }
    } catch (err: any) {
      log.warn(`Could not read command root: ${commandRoot}`, err);
      log.warn(`Error details: ${err.message}, code: ${err.code}`);
    }

  }

    return messageListeners
}