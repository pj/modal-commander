import { net, protocol } from "electron";
import log from "electron-log";
import path from "path";
import { pathToFileURL } from "url";

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mc',
    privileges: {
      standard: true,
      secure: true,
      // supportFetchAPI: true,
      // allowServiceWorkers: true,
      // corsEnabled: true,
    }
  }
]);

export function setupProtocol(commandRoots: string[]) {
  protocol.handle(
    'mc', async (req) => {
      log.silly('mc protocol request', JSON.stringify(req, null, 2))
      const { hostname, pathname } = new URL(req.url)
      const pathSplit = pathname.split('/')
      if (pathSplit.length > 3) {
        log.error('at least three path segments required', pathname);
        return new Response('bad', {
          status: 400,
          headers: { 
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
      }

      for (const commandRoot of commandRoots) {
        const [_, packageNamespace, packageName] = pathSplit;

        const filePath = path.resolve(
          commandRoot, 
          packageNamespace,
          packageName,
          "dist",
          "renderer.js",
        );

        if (!path.isAbsolute(filePath)) {
          log.warn('Command not found: ', filePath);
          continue;
        }

        log.info('Command found: ', filePath);

        const response = await net.fetch(pathToFileURL(filePath).toString())
        return new Response(response.body, {
          headers: {
            ...response.headers,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'content-type': 'application/javascript',
          }
        })
      }

      log.error('no command found', pathname)

      return new Response('bad', {
        status: 400,
        headers: { 
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })
    }
  );
}