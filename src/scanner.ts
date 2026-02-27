import * as fs from 'fs'
import * as path from 'path'
import type { RouteNode, Logger } from './types'
import { normalizePath, filePathToRoutePath, generateRouteId } from './utils'

/**
 * Recursively scan directory and collect all route files
 */
export function scanDirectory(
  dir: string,
  extensions: string[],
  pagesDir: string,
  ignorePatterns: string[],
  logger: Logger
): { pages: RouteNode[]; layouts: RouteNode[]; notFounds: Map<string, string> } {
  const pages: RouteNode[] = []
  const layouts: RouteNode[] = []
  const notFounds = new Map<string, string>()

  function scan(currentDir: string, relativePath: string = '') {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch {
      logger.warn(`Failed to read directory: ${currentDir}`)
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || ignorePatterns.includes(entry.name)) {
          logger.debug(`Skipping directory: ${relPath}`)
          continue
        }
        scan(fullPath, relPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (!extensions.includes(ext)) continue

        const baseName = path.basename(entry.name, ext)

        if (baseName === 'layout') {
          const routePath = filePathToRoutePath(relativePath)
          const importPath = normalizePath(`${pagesDir}/${relPath.replace(/\.(tsx|ts|jsx|js)$/, '')}`)

          logger.debug(`Found layout: ${relPath} -> ${routePath}`)
          layouts.push({
            path: routePath,
            filePath: fullPath,
            importPath,
            is404: false,
            isGlobal404: false,
            id: generateRouteId(routePath, false, true),
            isLayout: true,
            children: [],
            parentId: undefined,
          })
        }

        if (baseName === 'page') {
          const routePath = filePathToRoutePath(relativePath)
          const importPath = normalizePath(`${pagesDir}/${relPath.replace(/\.(tsx|ts|jsx|js)$/, '')}`)

          logger.debug(`Found page: ${relPath} -> ${routePath}`)
          pages.push({
            path: routePath,
            filePath: fullPath,
            importPath,
            is404: false,
            isGlobal404: false,
            id: generateRouteId(routePath, false),
            isLayout: false,
            children: [],
            parentId: undefined,
          })
        }

        if (baseName === '404') {
          const routePath = filePathToRoutePath(relativePath)
          const importPath = normalizePath(`${pagesDir}/${relPath.replace(/\.(tsx|ts|jsx|js)$/, '')}`)
          const isGlobal = routePath === '/'

          if (isGlobal) {
            logger.debug(`Found global 404: ${relPath}`)
            pages.push({
              path: '/404',
              filePath: fullPath,
              importPath,
              is404: true,
              isGlobal404: true,
              id: 'NotFoundRoute',
              isLayout: false,
              children: [],
            })
          } else {
            logger.debug(`Found local 404: ${relPath} -> scope: ${routePath}`)
            notFounds.set(routePath, importPath)
          }
        }
      }
    }
  }

  scan(dir)
  return { pages, layouts, notFounds }
}
