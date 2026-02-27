import type { Plugin, ViteDevServer } from 'vite'
import * as fs from 'fs'
import * as path from 'path'
import type { PluginOptions, RouteNode } from './types'
import { createLogger } from './logger'
import { convertRedirectPath } from './utils'
import { scanDirectory } from './scanner'
import { buildRouteHierarchy } from './hierarchy'
import { loadRedirects } from './redirects'
import { generateRouteTreeCode, generateTypeDefinition } from './codegen'

function tanstackRouterPlugin(options: PluginOptions = {}): Plugin {
  const {
    pagesDir = 'src/pages',
    outputFile = 'src/routeTree.gen.tsx',
    typeOutputFile = 'src/routeTree.gen.d.ts',
    extensions = ['.tsx', '.ts', '.jsx', '.js'],
    redirectsFile = 'src/_redirects.ts',
    ignorePatterns = ['__tests__', '__mocks__', 'node_modules'],
    debug: debugMode = false,
  } = options

  const logger = createLogger(debugMode)
  let server: ViteDevServer
  let projectRoot: string

  function generateRoutes() {
    const pagesDirPath = path.resolve(projectRoot, pagesDir)
    const outputPath = path.resolve(projectRoot, outputFile)
    const typeOutputPath = path.resolve(projectRoot, typeOutputFile)
    const redirectsFilePath = path.resolve(projectRoot, redirectsFile)

    if (!fs.existsSync(pagesDirPath)) {
      logger.warn(`Pages directory not found: ${pagesDirPath}`)
      return
    }

    logger.debug(`Scanning pages directory: ${pagesDirPath}`)
    logger.debug(`Ignore patterns: ${ignorePatterns.join(', ')}`)

    // Scan files
    const { pages, layouts, notFounds } = scanDirectory(pagesDirPath, extensions, pagesDir, ignorePatterns, logger)

    // Load redirects
    const redirects = loadRedirects(redirectsFilePath, logger)

    // Find global 404
    const global404 = pages.find(p => p.isGlobal404)
    const regularRoutes = pages.filter(p => !p.isGlobal404)

    // 404 priority handling: if global 404.tsx exists, remove /404/page.tsx
    const finalRoutes = regularRoutes.filter(route => {
      if (route.path === '/404' && global404) {
        return false
      }
      return true
    })

    // Check for redirect conflicts with existing routes and filter them out
    const redirectPaths = new Set(redirects.map(r => convertRedirectPath(r.from)))
    const filteredRoutes = finalRoutes.filter(route => {
      if (redirectPaths.has(route.path)) {
        logger.warn(
          `Route ${route.path} is overridden by redirect: ${redirects.find(r => convertRedirectPath(r.from) === route.path)?.from} -> ${redirects.find(r => convertRedirectPath(r.from) === route.path)?.to}`
        )
        return false
      }
      return true
    })

    // Build route hierarchy
    const rootRoutes = buildRouteHierarchy(filteredRoutes, layouts)

    // Debug: print route tree structure
    if (debugMode) {
      logger.debug('Route tree structure:')
      function printTree(routes: RouteNode[], indent: string = '  ') {
        for (const route of routes) {
          const type = route.isLayout ? 'layout' : 'page'
          logger.debug(`${indent}${route.path} [${type}] -> ${route.id}`)
          if (route.children.length > 0) {
            printTree(route.children, indent + '  ')
          }
        }
      }
      printTree(rootRoutes)
    }

    // Generate code
    const code = generateRouteTreeCode(rootRoutes, notFounds, redirects, global404, options.rootComponent, outputFile, pagesDir)
    const typeCode = generateTypeDefinition()

    // Write files
    fs.writeFileSync(outputPath, code, 'utf-8')
    fs.writeFileSync(typeOutputPath, typeCode, 'utf-8')

    const totalRoutes = filteredRoutes.length + layouts.length + redirects.length
    logger.info(`Generated ${filteredRoutes.length} pages, ${layouts.length} layouts, ${redirects.length} redirects (${totalRoutes} total)`)
  }

  return {
    name: 'vite-plugin-tsr-next',

    configResolved(config) {
      projectRoot = config.root
    },

    buildStart() {
      generateRoutes()
    },

    configureServer(_server) {
      server = _server

      const pagesDirPath = path.resolve(projectRoot, pagesDir)
      const redirectsFilePath = path.resolve(projectRoot, redirectsFile)

      server.watcher.add(pagesDirPath)
      server.watcher.add(redirectsFilePath)

      server.watcher.on('all', (_event, filePath) => {
        if (filePath === redirectsFilePath) {
          logger.info(`Redirects file changed: ${path.relative(projectRoot, filePath)}`)
          generateRoutes()

          server.ws.send({
            type: 'full-reload',
            path: '*'
          })
          return
        }

        if (!filePath.startsWith(pagesDirPath)) return

        const ext = path.extname(filePath)
        if (!extensions.includes(ext)) return

        const baseName = path.basename(filePath, ext)
        if (baseName === 'page' || baseName === '404' || baseName === 'layout') {
          logger.info(`Route file changed: ${path.relative(projectRoot, filePath)}`)
          generateRoutes()

          server.ws.send({
            type: 'full-reload',
            path: '*'
          })
        }
      })
    }
  }
}

export default tanstackRouterPlugin
