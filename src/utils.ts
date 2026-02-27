import * as path from 'path'

/**
 * Normalize path separators (unified to /)
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

/**
 * Convert file path to route path
 * Example: users/[id]/page.tsx -> /users/$id
 */
export function filePathToRoutePath(filePath: string): string {
  // Handle empty or root-level paths
  if (!filePath || filePath === '.') {
    return '/'
  }

  // Remove page.tsx or 404.tsx
  let routePath = filePath
    .replace(/\/page\.(tsx|ts|jsx|js)$/, '')
    .replace(/\/(404)\.(tsx|ts|jsx|js)$/, '')

  // Remove route groups (xxx)
  routePath = routePath.replace(/\/?\([^)]+\)/g, '')

  // Convert catch-all routes [...slug] -> $ (splat)
  routePath = routePath.replace(/\[\.\.\.([^\]]+)\]/g, '$')

  // Convert dynamic routes [id] -> $id
  routePath = routePath.replace(/\[([^\]]+)\]/g, '$$$1')

  // Ensure starts with /
  if (!routePath.startsWith('/')) {
    routePath = '/' + routePath
  }

  // Root route special handling
  if (routePath === '/') {
    return '/'
  }

  return routePath
}

/**
 * Generate unique variable name
 */
export function generateRouteId(routePath: string, is404: boolean, isLayout: boolean = false): string {
  if (is404) {
    return routePath === '/' ? 'NotFoundRoute' : routePath.replace(/^\//, '').replace(/\//g, '_') + 'NotFound'
  }

  if (isLayout) {
    if (routePath === '/') {
      return 'RootLayout'
    }
    return routePath
      .replace(/^\//, '')
      .replace(/\$([^/]+)/g, '$1')
      .replace(/\$$/g, 'splat')
      .replace(/\//g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      + 'Layout'
  }

  if (routePath === '/') {
    return 'IndexRoute'
  }

  return routePath
    .replace(/^\//, '')
    .replace(/\$([^/]+)/g, '$1')
    .replace(/\$$/g, 'splat')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    + 'Route'
}

/**
 * Convert redirect path to TanStack Router format
 * Examples:
 *   /users/[id] -> /users/$id
 *   /blog/* -> /blog/*
 */
export function convertRedirectPath(redirectPath: string): string {
  const converted = redirectPath
    .replace(/\[\.\.\.([^\]]+)\]/g, '*')
    .replace(/\[([^\]]+)\]/g, '$$$1')
  return converted
}
