import * as path from 'path'
import type { RouteNode } from './types'

/**
 * Build route hierarchy by establishing parent-child relationships
 * Returns the root-level routes (routes with no parent)
 */
export function buildRouteHierarchy(pages: RouteNode[], layouts: RouteNode[]): RouteNode[] {
  const layoutMap = new Map<string, RouteNode>()
  for (const layout of layouts) {
    const layoutDir = path.dirname(layout.filePath)
    layoutMap.set(layoutDir, layout)
  }

  // Sort layouts by directory depth (deepest first) to handle nested layouts
  const sortedLayouts = [...layouts].sort((a, b) => {
    const depthA = path.dirname(a.filePath).split(path.sep).length
    const depthB = path.dirname(b.filePath).split(path.sep).length
    return depthB - depthA
  })

  // Establish parent-child relationships for layouts (nested layouts)
  for (const layout of sortedLayouts) {
    const layoutDir = path.dirname(layout.filePath)
    let parentLayout: RouteNode | undefined = undefined

    let currentDir = path.dirname(layoutDir)
    while (currentDir !== path.dirname(currentDir)) {
      const parentLayoutCandidate = layoutMap.get(currentDir)
      if (parentLayoutCandidate) {
        parentLayout = parentLayoutCandidate
        break
      }
      currentDir = path.dirname(currentDir)
    }

    if (parentLayout) {
      layout.parentId = parentLayout.id
      parentLayout.children.push(layout)
    }
  }

  // Assign pages to their parent layouts based on file location
  for (const page of pages) {
    let parentLayout: RouteNode | undefined = undefined

    const pageDir = path.dirname(page.filePath)

    let currentDir = pageDir
    while (currentDir !== path.dirname(currentDir)) {
      const layoutCandidate = layoutMap.get(currentDir)
      if (layoutCandidate) {
        parentLayout = layoutCandidate
        break
      }
      currentDir = path.dirname(currentDir)
    }

    if (parentLayout) {
      page.parentId = parentLayout.id
      parentLayout.children.push(page)
    }
  }

  // Collect root-level routes
  const rootRoutes: RouteNode[] = []

  for (const layout of layouts) {
    if (!layout.parentId) {
      rootRoutes.push(layout)
    }
  }

  for (const page of pages) {
    if (!page.parentId) {
      rootRoutes.push(page)
    }
  }

  return rootRoutes
}
