import { describe, it, expect } from 'vitest'
import { normalizePath, filePathToRoutePath, generateRouteId, convertRedirectPath } from '../src/utils'

describe('normalizePath', () => {
  it('should convert backslashes to forward slashes', () => {
    expect(normalizePath('src\\pages\\about')).toBe('src/pages/about')
  })

  it('should pass through already normalized paths', () => {
    expect(normalizePath('src/pages/about')).toBe('src/pages/about')
  })

  it('should handle empty string', () => {
    expect(normalizePath('')).toBe('')
  })
})

describe('filePathToRoutePath', () => {
  it('should convert root to /', () => {
    expect(filePathToRoutePath('')).toBe('/')
  })

  it('should convert simple path', () => {
    expect(filePathToRoutePath('about')).toBe('/about')
  })

  it('should convert nested path', () => {
    expect(filePathToRoutePath('users/settings')).toBe('/users/settings')
  })

  it('should convert dynamic route [id] to $id', () => {
    expect(filePathToRoutePath('users/[id]')).toBe('/users/$id')
  })

  it('should convert nested dynamic routes', () => {
    expect(filePathToRoutePath('users/[userId]/posts/[postId]')).toBe('/users/$userId/posts/$postId')
  })

  it('should remove route groups (xxx)', () => {
    expect(filePathToRoutePath('(auth)/login')).toBe('/login')
  })

  it('should remove nested route groups', () => {
    expect(filePathToRoutePath('(marketing)/blog/(categories)/tech')).toBe('/blog/tech')
  })

  it('should handle route group at root level', () => {
    expect(filePathToRoutePath('(auth)')).toBe('/')
  })

  it('should strip page.tsx suffix', () => {
    expect(filePathToRoutePath('about/page.tsx')).toBe('/about')
  })

  it('should strip 404.tsx suffix', () => {
    expect(filePathToRoutePath('about/404.tsx')).toBe('/about')
  })

  it('should convert catch-all route [...slug] to $', () => {
    expect(filePathToRoutePath('docs/[...slug]')).toBe('/docs/$')
  })

  it('should convert catch-all route at root level', () => {
    expect(filePathToRoutePath('[...all]')).toBe('/$')
  })

  it('should convert catch-all route with route group', () => {
    expect(filePathToRoutePath('(marketing)/docs/[...slug]')).toBe('/docs/$')
  })
})

describe('generateRouteId', () => {
  it('should generate IndexRoute for root page', () => {
    expect(generateRouteId('/', false)).toBe('IndexRoute')
  })

  it('should generate named route for simple path', () => {
    expect(generateRouteId('/about', false)).toBe('aboutRoute')
  })

  it('should generate nested route id', () => {
    expect(generateRouteId('/users/settings', false)).toBe('users_settingsRoute')
  })

  it('should handle dynamic params', () => {
    expect(generateRouteId('/users/$id', false)).toBe('users_idRoute')
  })

  it('should generate NotFoundRoute for root 404', () => {
    expect(generateRouteId('/', true)).toBe('NotFoundRoute')
  })

  it('should generate RootLayout for root layout', () => {
    expect(generateRouteId('/', false, true)).toBe('RootLayout')
  })

  it('should generate named layout id', () => {
    expect(generateRouteId('/dashboard', false, true)).toBe('dashboardLayout')
  })

  it('should generate splat route id for catch-all', () => {
    expect(generateRouteId('/docs/$', false)).toBe('docs_splatRoute')
  })

  it('should generate RootLayout for root layout without group', () => {
    expect(generateRouteId('/', false, true, '')).toBe('RootLayout')
  })

  it('should generate HomeLayout for (home) group layout', () => {
    expect(generateRouteId('/', false, true, '(home)')).toBe('HomeLayout')
  })

  it('should generate MainLayout for (main) group layout', () => {
    expect(generateRouteId('/', false, true, '(main)')).toBe('MainLayout')
  })

  it('should generate HomeContentLayout for nested group layout', () => {
    expect(generateRouteId('/content', false, true, '(home)/content')).toBe('HomeContentLayout')
  })

  it('should generate MainContentLayout for different group same path', () => {
    expect(generateRouteId('/content', false, true, '(main)/content')).toBe('MainContentLayout')
  })

  it('should generate contentLayout for non-group nested layout', () => {
    expect(generateRouteId('/content', false, true, 'content')).toBe('contentLayout')
  })
})

describe('convertRedirectPath', () => {
  it('should convert [id] to $id', () => {
    expect(convertRedirectPath('/users/[id]')).toBe('/users/$id')
  })

  it('should preserve wildcard *', () => {
    expect(convertRedirectPath('/blog/*')).toBe('/blog/*')
  })

  it('should pass through static paths unchanged', () => {
    expect(convertRedirectPath('/about')).toBe('/about')
  })

  it('should handle multiple dynamic params', () => {
    expect(convertRedirectPath('/users/[userId]/posts/[postId]')).toBe('/users/$userId/posts/$postId')
  })

  it('should convert catch-all [...slug] to *', () => {
    expect(convertRedirectPath('/docs/[...slug]')).toBe('/docs/*')
  })
})
