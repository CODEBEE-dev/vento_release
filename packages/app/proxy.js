// proxy.js

// __BUNDLED__ is defined by esbuild at build time
// In bundle mode, use pre-generated static routers
// In dev mode, use dynamic discovery via routes.js
let routers;
if (typeof __BUNDLED__ !== 'undefined' && __BUNDLED__) {
    const { bundledRouters } = require('@generated/bundledRouters');
    routers = bundledRouters;
} else {
    const routes = require('../../scripts/routes.js');
    routers = routes.routers;
}

const httpProxy = require('http-proxy')
const protobose = require('protobase')
const getLogger = protobose.getLogger
const protonode = require('protonode')
const config = require('@my/config')
const fs = require('fs')
const path = require('path')
const mrmime = require('mrmime')

// ─── Helpers ────────────────────────────────────────────────────────────────
function getRoot() {
  return path.join(__dirname, "..", "..")
}

function makeLogger(name) {
  return getLogger(
    name,
    config.getBaseConfig(name, process, protonode.getServiceToken())
  )
}

function createProxyServer(name) {
  const logger = makeLogger(name)
  const proxy = httpProxy.createProxyServer({ ws: true, xfwd: true, proxyTimeout: 0 })
  const startTime = Date.now()
  proxy.on('error', (err, req, res) => {
    if (Date.now() - startTime < 10000) return
    logger.error({ err, url: req.url }, 'Proxy error')
    if (res && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end('Bad Gateway')
    }
  })
  return { proxy, logger }
}

function getRoute(resolver, req) {
  if (resolver.disabled) {
    return resolver?.disabledRoute?.(req)
  }
  return resolver.route(req)
}

function findResolver(name, req) {
  return routers.find(r => getRoute(r, req))
}

function serveStream(filePath, res) {
  const ct = mrmime.lookup(filePath) || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': ct })
  fs.createReadStream(filePath).pipe(res)
}

function serve404(res) {
  const fn = path.join(__dirname, '../../data/pages/workspace/404.html')
  res.writeHead(404, { 'Content-Type': 'text/html' })
  fs.createReadStream(fn).pipe(res)
}

// ─── Core HTTP handler ──────────────────────────────────────────────────────
function handleHttp(name, req, res, fallback, proxy, logger) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  let pathname = urlObj.pathname
  // 1) public files
  if (req.url.startsWith('/public/')) {
    let rel = decodeURIComponent(req.path.replace(/\.\.\//g, ''))
    const root = '../../data'
    const fp = path.join(root, rel)
    if (!fs.existsSync(fp)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
    } else {
      serveStream(fp, res)
    }
    return true
  }

  // 2) aliases
  const aliases = protobose.ProtoMemDB('proxy').getState();

  //aliases is an object with the levels: x.y.z, and inside the last level, the alias url
  const aliasTable = {}
  for (const [level, entries] of Object.entries(aliases)) {
    for (const [tag, entry] of Object.entries(entries)) {
      for (const [name, alias] of Object.entries(entry)) {
        aliasTable[alias.alias] = alias
      }
    }
  }
  const alias = aliasTable[pathname]

  if (alias) {
    const origUrl = req.url;                         // p.ej. "/go"
    const [origPath, origSearch = ""] = origUrl.split("?");

    const [targetPath, targetSearch = ""] = String(alias.target || "").split("?");

    const aliasQs =
      typeof alias.query === "string"
        ? alias.query.replace(/^\?/, "")
        : new URLSearchParams(alias.query || {}).toString();

    const hasAliasQuery = !!(targetSearch || aliasQs);
    const hasOrigQuery = !!origSearch;

    if (hasAliasQuery && !hasOrigQuery && (req.method === 'GET' || req.method === 'HEAD')) {
      // ⇢ Redirige al browser para que haga la request "limpia" con la query del alias
      const parts = [];
      if (targetSearch) parts.push(targetSearch);
      if (aliasQs) parts.push(aliasQs);
      const newSearch = parts.join("&");

      const host = req.headers.host || 'localhost';
      const proto = (req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http'));

      const location = `${proto}://${host}${origPath}${newSearch ? `?${newSearch}` : ""}`;

      res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
      res.end();
      return true;
    }

    // Si NO redirigimos (p.ej. ya hay query o método no-GET), reescribe req.url y sigue
    const parts = [];
    // conserva la query original si existe
    if (origSearch) parts.push(origSearch);
    if (targetSearch) parts.push(targetSearch);
    if (aliasQs) parts.push(aliasQs);
    const merged = parts.filter(Boolean).join("&");

    req.url = targetPath + (merged ? `?${merged}` : "");
    if (req._parsedUrl) req._parsedUrl = undefined; // fuerza reparseo en Express
    pathname = targetPath;
  }

  const resolver = findResolver(name, req)
  if (resolver) {
    if (resolver.name !== name) {
      let target = getRoute(resolver, req)
      if (!target.startsWith("file://")) {
        logger.trace({ url: req.url, target: target }, 'Proxying request')
        proxy.web(req, res, { target: resolver.route(req) })
        return true
      } else {
        const filepath = target.slice(7)
        //static pages fallback
        let htmlFile = path.join(getRoot(), filepath)
        //check if the path is a directory
        if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isDirectory()) {
          //check if there is a file named htmlFile plus html
          if (!fs.existsSync(htmlFile + '.html') && fs.existsSync(path.join(htmlFile, 'index.html'))) {
            htmlFile = path.join(htmlFile, 'index.html')
          }
        }

        //if the path is a file, check if it has an extension
        if (!path.extname(htmlFile)) {
          //if not, assume it's an HTML file
          htmlFile += '.html'
        }

        if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isFile()) {
          serveStream(htmlFile, res)
          return true
        } else {
          logger.warn({ url: req.url, file: htmlFile }, 'File not found, serving 404')
          serve404(res)
          return true
        }

      }
    }
  } else {
    //static pages fallback
    let p = req.url.split('?')[0]
    let htmlFile = path.join(__dirname, '../../data/pages', p)
    //check if the path is a directory
    if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isDirectory()) {
      //check if there is a file named htmlFile plus html
      if (!fs.existsSync(htmlFile + '.html') && fs.existsSync(path.join(htmlFile, 'index.html'))) {
        htmlFile = path.join(htmlFile, 'index.html')
      }
    }

    //if the path is a file, check if it has an extension
    if (!path.extname(htmlFile)) {
      //if not, assume it's an HTML file
      htmlFile += '.html'
    }

    if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isFile()) {
      serveStream(htmlFile, res)
      return true
    } else {
      logger.warn({ url: req.url, file: htmlFile }, 'File not found, serving 404')
      if (p == '/') {
        // Redirect root to /workspace/
        res.writeHead(302, { Location: '/workspace/', 'Cache-Control': 'no-store' })
        res.end()
        return true
      }
      serve404(res)
      return true
    }
  }

  //fallback to app logic
  fallback(req, res)
  return true
}

// ─── Next.js style setup ────────────────────────────────────────────────────
function setupProxyHandler(name, subscribe, handle, server) {
  const { proxy, logger } = createProxyServer(name)
  // WS upgrade
  server.on('upgrade', (req, socket, head) => {
    const resolver = findResolver(name, req)
    if (!resolver || resolver.name === name) {
      if (resolver.name === name && req.url.endsWith('/webpack-hmr')) {
        //let nextjs handle its own websocket
        return
      }
      console.log('No resolver found for WebSocket request: ' + req.url);
      socket.destroy();
      return;
    }
    proxy.ws(req, socket, head, { target: resolver.route(req) })
  })
  // HTTP
  subscribe((req, res) => {
    handleHttp(name, req, res, handle, proxy, logger)
  })
}

// ─── Express middleware ─────────────────────────────────────────────────────
function createExpressProxy(name) {
  const { proxy, logger } = createProxyServer(name)
  return (req, res, next) => {
    handleHttp(name, req, res, () => {
      next()
    }, proxy, logger)
  }
}

// ─── WS upgrade for Express/HTTP-server ─────────────────────────────────────
function handleUpgrade(server, name) {
  const { proxy } = createProxyServer(name)
  server.on('upgrade', (req, socket, head) => {
    const resolver = findResolver(name, req)
    if (!resolver || resolver.name === name) {
      return socket.destroy()
    }
    proxy.ws(req, socket, head, { target: resolver.route(req) })
  })
}

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = setupProxyHandler          // backward compatibility
module.exports.setupProxyHandler = setupProxyHandler
module.exports.createExpressProxy = createExpressProxy
module.exports.handleUpgrade = handleUpgrade
