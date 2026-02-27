import { describe, it, expect } from 'vitest'
import { buildRouteHierarchy } from '../src/hierarchy'
import type { RouteNode } from '../src/types'

function makeRoute(overrides: Partial<RouteNode> & { path: string; id: string; filePath: string }): RouteNode {
  return {
    importPath: '',
    is404: false,
    isGlobal404: false,
    isLayout: false,
    children: [],
    parentId: undefined,
    ...overrides,
  }
}

describe('buildRouteHierarchy', () => {
  it('should return pages as root-level when no layouts exist', () => {
    const pages = [
      makeRoute({ path: '/', id: 'IndexRoute', filePath: '/src/pages/page.tsx' }),
      makeRoute({ path: '/about', id: 'aboutRoute', filePath: '/src/pages/about/page.tsx' }),
    ]
    const result = buildRouteHierarchy(pages, [])
    expect(result).toHaveLength(2)
  })

  it('should nest pages under their parent layout', () => {
    const pages = [
      makeRoute({ path: '/', id: 'IndexRoute', filePath: '/src/pages/page.tsx' }),
      makeRoute({ path: '/about', id: 'aboutRoute', filePath: '/src/pages/about/page.tsx' }),
    ]
    const layouts = [
      makeRoute({ path: '/', id: 'RootLayout', isLayout: true, filePath: '/src/pages/layout.tsx' }),
    ]
    const result = buildRouteHierarchy(pages, layouts)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('RootLayout')
    expect(result[0].children).toHaveLength(2)
  })

  it('should handle nested layouts', () => {
    const pages = [
      makeRoute({ path: '/dashboard/stats', id: 'dashboard_statsRoute', filePath: '/src/pages/dashboard/stats/page.tsx' }),
    ]
    const layouts = [
      makeRoute({ path: '/', id: 'RootLayout', isLayout: true, filePath: '/src/pages/layout.tsx' }),
      makeRoute({ path: '/dashboard', id: 'dashboardLayout', isLayout: true, filePath: '/src/pages/dashboard/layout.tsx' }),
    ]
    const result = buildRouteHierarchy(pages, layouts)

    // Root layout is the only root-level route
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('RootLayout')

    // Dashboard layout is nested under root
    const dashboardLayout = result[0].children.find(c => c.id === 'dashboardLayout')
    expect(dashboardLayout).toBeDefined()

    // Stats page is nested under dashboard layout
    expect(dashboardLayout!.children).toHaveLength(1)
    expect(dashboardLayout!.children[0].id).toBe('dashboard_statsRoute')
  })

  it('should handle pages without matching layout as root-level', () => {
    const pages = [
      makeRoute({ path: '/about', id: 'aboutRoute', filePath: '/src/pages/about/page.tsx' }),
      makeRoute({ path: '/dashboard/stats', id: 'dashboard_statsRoute', filePath: '/src/pages/dashboard/stats/page.tsx' }),
    ]
    const layouts = [
      makeRoute({ path: '/dashboard', id: 'dashboardLayout', isLayout: true, filePath: '/src/pages/dashboard/layout.tsx' }),
    ]
    const result = buildRouteHierarchy(pages, layouts)

    // about is root-level, dashboard layout is root-level
    expect(result).toHaveLength(2)
    const dashboardLayout = result.find(r => r.id === 'dashboardLayout')
    expect(dashboardLayout!.children).toHaveLength(1)
  })
})
