import { net, protocol, app } from "electron";
import log from "electron-log";
import path from "path";
import { pathToFileURL } from "url";
import fs from 'fs';
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

async function handleImportCommands(pathname: string, commandRoots: string[]) {
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
      log.warn(`Path is not absolute: ${filePath}`);
      continue;
    }

    try {
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        log.warn(`Path is not a file: ${filePath}`);
        continue;
      }
    } catch (error: any) {
      switch (error.code) {
        case 'ENOENT': 
          log.warn(`File not found: ${filePath}`);
          continue;
        case 'EACCES': 
          log.warn(`Permission denied: ${filePath}`);
          continue;
        default:
          log.error(`Unexpected error: ${error.message}`);
          throw error;
      }
    }

    // log.info('Command found: ', filePath);

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

async function handleImportDependencies(pathname: string, validDependencies: string[]) {
  const modulePath = pathname;
  const cleanPath = modulePath.startsWith('/') ? modulePath.slice(1) : modulePath;

  const filePath = path.join(app.getAppPath(), 'node_modules', cleanPath);
  const content = await fs.promises.readFile(filePath);
  
  return new Response(content, {
    headers: {
      'Content-Type': 'application/javascript',
      // Add CORS headers if needed
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export function setupProtocol(commandRoots: string[], validDependencies: string[]) {
  protocol.handle(
    'mc', async (req) => {
      // log.silly('mc protocol request', JSON.stringify(req, null, 2))
      const { hostname, pathname } = new URL(req.url)
      if (hostname === 'commands') {
        return await handleImportCommands(pathname, commandRoots)
      }
      if (hostname === 'dependencies') {
        return await handleImportDependencies(pathname, validDependencies)
      }
      return new Response('not found', {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      })
    }
  )
}