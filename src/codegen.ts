import * as path from 'path'
import type { RouteNode, RedirectRule } from './types'
import { normalizePath, convertRedirectPath } from './utils'

/**
 * Generate routeTree.gen.tsx
 */
export function generateRouteTreeCode(
  rootRoutes: RouteNode[],
  notFounds: Map<string, string>,
  redirects: RedirectRule[],
  global404?: RouteNode,
  rootComponent?: string,
  outputFile?: string,
  pagesDir?: string
): string {
  // Calculate relative path from output file to pages directory
  let importPrefix = './'
  if (outputFile && pagesDir) {
    const outputDir = path.dirname(outputFile)
    const relativePath = path.relative(outputDir, pagesDir)
    importPrefix = relativePath ? `./${normalizePath(relativePath)}/` : './'
  }
  const imports: string[] = []
  const routeDefinitions: string[] = []
  const rootLevelRoutes: string[] = []

  // Add redirect import if needed
  if (redirects.length > 0) {
    imports.push(`import { redirect } from '@tanstack/react-router'`)
  }

  // Add Outlet import for default root component
  if (!rootComponent) {
    imports.push(`import { Outlet } from '@tanstack/react-router'`)
  }

  // Generate global 404 import
  if (global404) {
    const relativeImport = global404.importPath.replace(new RegExp(`^${pagesDir}/`), '')
    imports.push(`import * as NotFoundPage from '${importPrefix}${relativeImport}'`)
  }

  // Generate root component import if provided
  if (rootComponent) {
    imports.push(`import * as RootComponent from './${rootComponent}'`)
  }

  // Generate default root component if not provided
  let defaultRootComponentDef = ''
  if (!rootComponent) {
    defaultRootComponentDef = `
// Default root component
function RootComponent() {
  return <Outlet />
}
`
  }

  // Generate root route config
  const rootComponentConfig = rootComponent
    ? `component: RootComponent.default`
    : `component: RootComponent`

  const rootNotFoundConfig = global404
    ? `,\n  notFoundComponent: NotFoundPage.default`
    : ''

  routeDefinitions.push(`
// Root route
const rootRoute = createRootRoute({
  ${rootComponentConfig}${rootNotFoundConfig}
})
`)

  // Generate redirect routes first (highest priority)
  for (const redirectRule of redirects) {
    const fromPath = convertRedirectPath(redirectRule.from)
    const toPath = convertRedirectPath(redirectRule.to)
    const permanent = redirectRule.permanent !== false
    const statusCode = permanent ? 301 : 307

    const routeId = `Redirect_${fromPath.replace(/[/$*-]/g, '_')}`

    const hasDynamicParams = fromPath.includes('$')
    const isSplat = fromPath.includes('*')

    let beforeLoadBody = ''
    if (hasDynamicParams && !isSplat) {
      const params = fromPath.match(/\$(\w+)/g)?.map(p => p.slice(1)) || []
      const toWithParams = params.reduce((acc, param) => {
        return acc.replace(`$${param}`, `\${params.${param}}`)
      }, toPath)
      beforeLoadBody = `({ params }) => {
    throw redirect({ to: \`${toWithParams}\`, statusCode: ${statusCode} })
  }`
    } else if (isSplat) {
      const toBase = toPath.replace('/*', '')
      beforeLoadBody = `({ params }) => {
    const splatPath = params['*'] || ''
    throw redirect({ to: \`${toBase}/\${splatPath}\`, statusCode: ${statusCode} })
  }`
    } else {
      beforeLoadBody = `() => {
    throw redirect({ to: '${toPath}', statusCode: ${statusCode} })
  }`
    }

    routeDefinitions.push(`
// Redirect: ${redirectRule.from} -> ${redirectRule.to}
const ${routeId} = createRoute({
  getParentRoute: () => rootRoute,
  path: '${fromPath}',
  beforeLoad: ${beforeLoadBody}
})
`)

    rootLevelRoutes.push(routeId)
  }

  // Recursive function to generate route definitions
  function generateRouteDefinition(route: RouteNode, parentGetter: string): void {
    if (route.isGlobal404) return

    const varName = route.id
    const importName = `${varName}${route.isLayout ? 'Component' : 'Page'}`

    const relativeImport = route.importPath.replace(new RegExp(`^${pagesDir}/`), '')
    imports.push(`import * as ${importName} from '${importPrefix}${relativeImport}'`)

    const notFoundPath = notFounds.get(route.path)
    let notFoundConfig = ''
    if (notFoundPath) {
      const notFoundImportName = `${varName}NotFound`
      const relativeNotFoundImport = notFoundPath.replace(new RegExp(`^${pagesDir}/`), '')
      imports.push(`import * as ${notFoundImportName} from '${importPrefix}${relativeNotFoundImport}'`)
      notFoundConfig = `,\n  notFoundComponent: ${notFoundImportName}.default`
    }

    if (route.isLayout) {
      const layoutId = route.id.replace('Layout', '').toLowerCase() || 'layout'
      const pathlessId = layoutId.startsWith('_') ? layoutId : `_${layoutId}`
      routeDefinitions.push(`
const ${varName} = createRoute({
  getParentRoute: () => ${parentGetter},
  id: '${pathlessId}',
  component: ${importName}.default${notFoundConfig},
  ...pickExports(${importName}, 'loader', 'beforeLoad'),
})
`)
    } else {
      routeDefinitions.push(`
const ${varName} = createRoute({
  getParentRoute: () => ${parentGetter},
  path: '${route.path}',
  component: ${importName}.default${notFoundConfig},
  ...pickExports(${importName}, 'loader', 'beforeLoad'),
})
`)
    }

    if (route.children.length > 0) {
      for (const child of route.children) {
        generateRouteDefinition(child, varName)
      }
    }
  }

  // Helper function to build route tree string
  function buildRouteTreeString(route: RouteNode): string {
    if (route.children.length === 0) {
      return route.id
    }
    const childrenStr = route.children.map(child => buildRouteTreeString(child)).join(',\n    ')
    return `${route.id}.addChildren([\n    ${childrenStr}\n  ])`
  }

  // Generate all route definitions
  for (const route of rootRoutes) {
    generateRouteDefinition(route, 'rootRoute')
    rootLevelRoutes.push(buildRouteTreeString(route))
  }

  // Generate route tree export
  const routeTreeExport = `
export const routeTree = rootRoute.addChildren([
  ${rootLevelRoutes.join(',\n  ')}
])
`

  // Assemble complete code
  return `// Auto-generated by vite-plugin-tsr-next
// Do not edit this file manually

import { createRoute, createRootRoute } from '@tanstack/react-router'

${imports.join('\n')}

// Helper: pick optional exports from a module at runtime
function pickExports(mod: Record<string, unknown>, ...keys: string[]) {
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if (key in mod && mod[key] !== undefined) {
      result[key] = mod[key]
    }
  }
  return result
}
${defaultRootComponentDef}
${routeDefinitions.join('\n')}
${routeTreeExport}
`
}

/**
 * Generate routeTree.gen.d.ts
 */
export function generateTypeDefinition(): string {
  return `// Auto-generated by vite-plugin-tsr-next
// Do not edit this file manually

import { createRouter } from '@tanstack/react-router'
import type { routeTree } from './routeTree.gen'

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter<typeof routeTree>>
  }
}

export {}
`
}
