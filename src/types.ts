import type { Plugin } from 'vite'

export interface PluginOptions {
  /** Pages directory path, defaults to 'src/pages' */
  pagesDir?: string
  /** Output file path, defaults to 'src/routeTree.gen.tsx' */
  outputFile?: string
  /** Type definition output path, defaults to 'src/routeTree.gen.d.ts' */
  typeOutputFile?: string
  /** Supported file extensions, defaults to ['.tsx', '.ts', '.jsx', '.js'] */
  extensions?: string[]
  /** Root layout component path (optional) */
  rootComponent?: string
  /** Redirects file path, defaults to 'src/_redirects.ts' */
  redirectsFile?: string
  /** Directory name patterns to ignore during scanning, defaults to ['__tests__', '__mocks__', 'node_modules'] */
  ignorePatterns?: string[]
  /** Enable debug logging, defaults to false */
  debug?: boolean
}

export interface RedirectRule {
  /** Source path, supports [id] and * wildcard */
  from: string
  /** Target path */
  to: string
  /** Permanent redirect (301) or temporary (307), defaults to true */
  permanent?: boolean
}

export interface RouteNode {
  /** Route path (e.g., /about, /users/$id) */
  path: string
  /** Absolute file path */
  filePath: string
  /** Relative path from pages directory (used for imports) */
  importPath: string
  /** Whether this is a 404 page */
  is404: boolean
  /** Whether this is a global 404 */
  isGlobal404: boolean
  /** Local 404 component path (if exists) */
  notFoundComponent?: string
  /** Unique identifier (used for variable names) */
  id: string
  /** Whether this is a layout route */
  isLayout: boolean
  /** Child routes (for layout routes) */
  children: RouteNode[]
  /** Parent route ID (for establishing hierarchy) */
  parentId?: string
}

export interface Logger {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
  debug: (msg: string) => void
}
