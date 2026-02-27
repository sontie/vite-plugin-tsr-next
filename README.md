# vite-plugin-tsr-next

[English](README.md) | [中文](README.zh-CN.md)

File-based routing plugin for [TanStack Router](https://tanstack.com/router), inspired by Next.js App Router conventions.

## Features

- 📁 **File-Based Routing** — File structure becomes your route structure
- 🔥 **Hot Module Replacement** — Instant route updates during development
- 🎯 **Type Safe** — Full TypeScript support with automatic type generation
- 🎨 **Dynamic Routes** — `[id]` directories map to `$id` params, `[...slug]` for catch-all routes
- 🔀 **Route Groups** — `(group)` directories organize routes without affecting URLs
- 🎭 **Layout System** — Nested layouts via `layout.tsx`, supports multi-level nesting
- 🚫 **404 Pages** — Global and scoped not-found pages
- 🔄 **Redirects** — Static, dynamic, and wildcard redirect rules
- 📦 **Data Loading** — Automatic `loader` / `beforeLoad` detection and integration
- 🚀 **Zero Dependencies** — Only requires `vite` as a peer dependency

## Installation

```bash
npm install -D vite-plugin-tsr-next
```

## Quick Start

### 1. Configure the Plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tanstackRouterPlugin from 'vite-plugin-tsr-next'

export default defineConfig({
  plugins: [
    react(),
    tanstackRouterPlugin(),
  ],
})
```

### 2. Create Pages

```
src/pages/
├── page.tsx              → /
├── layout.tsx            → Root layout
├── 404.tsx               → Global 404
├── about/
│   └── page.tsx          → /about
├── users/
│   ├── page.tsx          → /users
│   └── [id]/
│       └── page.tsx      → /users/$id
└── (auth)/
    └── login/
        └── page.tsx      → /login
```

### 3. Use the Generated Router

```tsx
// src/Router.tsx
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

// Note: type registration is auto-generated in routeTree.gen.d.ts
// No need to manually declare module '@tanstack/react-router' here

export default function Router() {
  return <RouterProvider router={router} />
}
```

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Router from './Router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
```

## File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | Route component |
| `layout.tsx` | Layout wrapper (pathless route with `<Outlet />`) |
| `404.tsx` | Not-found page (global at root, scoped in subdirectories) |
| `[param]` | Dynamic route parameter |
| `[...param]` | Catch-all route (splat) |
| `(group)` | Route group (no URL impact) |
| `_redirects.ts` | Redirect rules |

## Routing Conventions

### Basic Routes

| File Path | URL Path |
|-----------|----------|
| `src/pages/page.tsx` | `/` |
| `src/pages/about/page.tsx` | `/about` |
| `src/pages/blog/posts/page.tsx` | `/blog/posts` |

### Dynamic Routes

Use square brackets `[param]` to create dynamic route segments.

| File Path | URL Path | Params |
|-----------|----------|--------|
| `src/pages/users/[id]/page.tsx` | `/users/123` | `{ id: '123' }` |
| `src/pages/posts/[slug]/page.tsx` | `/posts/hello-world` | `{ slug: 'hello-world' }` |

```tsx
// src/pages/users/[id]/page.tsx
import { useParams } from '@tanstack/react-router'

export default function UserPage() {
  const { id } = useParams({ from: '/users/$id' })
  return <h1>User ID: {id}</h1>
}
```

Multi-level dynamic routes are also supported:

```tsx
// src/pages/posts/[postId]/comments/[commentId]/page.tsx
// Matches: /posts/123/comments/456
```

### Catch-All Routes

Use `[...param]` to create catch-all (splat) routes that match any number of segments.

| File Path | Route Path | Matches |
|-----------|------------|---------|
| `src/pages/docs/[...slug]/page.tsx` | `/docs/$` | `/docs/a`, `/docs/a/b/c` |

```tsx
// src/pages/docs/[...slug]/page.tsx
import { useParams } from '@tanstack/react-router'

export default function DocsPage() {
  const { _splat } = useParams({ from: '/docs/$' })
  return <h1>Docs: {_splat}</h1>
}
```

### Route Groups

Use parentheses `(group)` to organize routes without affecting the URL structure.

```
src/pages/
  (auth)/
    login/
      page.tsx        → /login
    register/
      page.tsx        → /register
  (marketing)/
    pricing/
      page.tsx        → /pricing
```

## Layout System

Use `layout.tsx` files to define layout components that automatically wrap all pages in the same directory and subdirectories.

### Basic Layout

```tsx
// src/pages/(dashboard)/layout.tsx
import { Outlet } from '@tanstack/react-router'

export default function DashboardLayout() {
  return (
    <div>
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/device">Device</a>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>© 2024 My App</footer>
    </div>
  )
}
```

### File Structure with Layouts

```
src/pages/
├── (dashboard)/              # Route group (no URL impact)
│   ├── layout.tsx           # Dashboard layout
│   ├── page.tsx             # / (inside layout)
│   ├── device/
│   │   └── page.tsx         # /device (inside layout)
│   └── data/
│       └── page.tsx         # /data (inside layout)
└── login/
    └── page.tsx             # /login (standalone, no layout)
```

- Visiting `/` or `/device`: Shows `DashboardLayout` + page content
- Visiting `/login`: Only shows the login page, no layout

### Multi-Level Nested Layouts

Layouts can be nested for more complex page structures:

```
src/pages/
└── (dashboard)/
    ├── layout.tsx           # Level 1 layout (global nav)
    ├── page.tsx             # /
    └── system/
        ├── layout.tsx       # Level 2 layout (sidebar)
        ├── page.tsx         # /system
        └── users/
            └── page.tsx     # /system/users
```

Rendering hierarchy when visiting `/system/users`:

```
DashboardLayout (Global navigation)
  └─ SystemLayout (System sidebar)
      └─ UsersPage (User list)
```

### Layout vs Root Component

| Approach | Use Case | Configuration |
|----------|----------|--------------|
| `layout.tsx` | Shared layout for some pages | Create in subdirectories of `src/pages` |
| `rootComponent` | Global layout for all pages | Configure in `vite.config.ts` |

```typescript
// vite.config.ts — using rootComponent for global layout
tanstackRouterPlugin({
  rootComponent: 'layouts/RootLayout'  // src/layouts/RootLayout.tsx
})
```

## Error Pages (404)

### Global 404

Create a `404.tsx` file at the root of your pages directory:

```tsx
// src/pages/404.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  )
}
```

`404.tsx` serves dual purposes:
1. Global error page for unmatched routes
2. Accessible at `/404` URL

### Local 404

Create a `404.tsx` file in any subdirectory to handle errors for that route's children:

```tsx
// src/pages/dashboard/404.tsx
export default function DashboardNotFound() {
  return <h1>Dashboard Resource Not Found</h1>
}
```

- Visiting `/dashboard/nonexistent` will show `dashboard/404.tsx`
- If no local 404 exists, falls back to global `404.tsx`

## Data Loading

Export `loader` or `beforeLoad` from any `page.tsx` or `layout.tsx`:

```tsx
// src/pages/users/[id]/page.tsx
import { useLoaderData } from '@tanstack/react-router'

export const loader = async ({ params }: { params: { id: string } }) => {
  const response = await fetch(`/api/users/${params.id}`)
  const user = await response.json()
  return { user }
}

export default function UserPage() {
  const { user } = useLoaderData({ from: '/users/$id' })

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

The plugin automatically detects and wires `loader` and `beforeLoad` exports at runtime.

Layouts also support data loading:

```tsx
// src/pages/(dashboard)/layout.tsx
import { Outlet, useLoaderData } from '@tanstack/react-router'

export const loader = async () => {
  const user = await fetch('/api/user').then(r => r.json())
  return { user }
}

export const beforeLoad = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    throw redirect({ to: '/login' })
  }
}

export default function DashboardLayout() {
  const { user } = useLoaderData()
  return (
    <div>
      <header>Welcome, {user.name}</header>
      <Outlet />
    </div>
  )
}
```

## Route Redirects

The plugin supports two types of redirects: **static redirects** and **dynamic redirects** (route guards).

### Static Redirects

Create `src/_redirects.ts` to define static redirect rules.

Note: `_redirects.ts` only supports plain literal arrays (no variable references, template strings, or function calls). The plugin parses this file via regex stripping, not full TypeScript compilation.

```typescript
// src/_redirects.ts
export default [
  // Simple static redirect
  { from: '/old-about', to: '/about', permanent: true },

  // Dynamic parameter redirect
  { from: '/users/[id]', to: '/profile/[id]', permanent: true },

  // Wildcard redirect
  { from: '/blog/*', to: '/posts/*', permanent: true },

  // Temporary redirect (307)
  { from: '/maintenance', to: '/under-construction', permanent: false },
]
```

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `from` | string | Source path, supports `[id]` and `*` | Required |
| `to` | string | Target path | Required |
| `permanent` | boolean | `true` = 301 permanent, `false` = 307 temporary | `true` |

### Dynamic Redirects (Route Guards)

Use page-level `beforeLoad` functions for dynamic redirects:

```tsx
// src/pages/dashboard/page.tsx
import { redirect } from '@tanstack/react-router'

export const beforeLoad = async () => {
  const token = localStorage.getItem('auth_token')
  if (!token) {
    throw redirect({
      to: '/login',
      search: { redirect: '/dashboard' }
    })
  }
}

export default function DashboardPage() {
  return <h1>Dashboard</h1>
}
```

### Global Route Guard

For global authentication, configure in `Router.tsx`:

```tsx
// src/Router.tsx
import { createRouter, RouterProvider, redirect } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({ routeTree })

const PUBLIC_ROUTES = ['/login', '/register', '/404']

router.subscribe('onBeforeLoad', ({ toLocation }) => {
  const token = localStorage.getItem('auth_token')
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    toLocation.pathname.startsWith(route)
  )

  if (!token && !isPublicRoute) {
    throw redirect({
      to: '/login',
      search: { redirect: toLocation.pathname }
    })
  }
})
```

### Redirect Priority

When the same path has both redirects and regular routes:

1. **Static redirects** (`_redirects.ts`) — Highest priority
2. **Page-level `beforeLoad`** — Medium priority
3. **Regular routes** — Lowest priority

If a redirect conflicts with an existing route, the route is ignored and a console warning is shown.

## Plugin Options

```ts
tanstackRouterPlugin({
  pagesDir: 'src/pages',              // Pages directory
  outputFile: 'src/routeTree.gen.tsx', // Generated route tree
  typeOutputFile: 'src/routeTree.gen.d.ts', // Type definitions
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  rootComponent: undefined,            // Custom root component path
  redirectsFile: 'src/_redirects.ts',  // Redirects file
  ignorePatterns: ['__tests__', '__mocks__', 'node_modules'],
  debug: false,                        // Enable debug logging
})
```

All options are optional with sensible defaults.

Note: Directories starting with `.` (e.g. `.hidden`) are always skipped during scanning, in addition to `ignorePatterns`.

## Generated Files

The plugin generates two files:

### `src/routeTree.gen.tsx`

Contains the complete route tree with all route definitions, imports, and `pickExports` helper for automatic `loader`/`beforeLoad` wiring.

### `src/routeTree.gen.d.ts`

TypeScript type definitions for type-safe routing:

```tsx
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter<typeof routeTree>>
  }
}
```

## Advanced Example

### Complete Application Structure

```
src/
  pages/
    page.tsx                        → /
    layout.tsx                      → Root layout
    404.tsx                         → Global 404

    about/
      page.tsx                      → /about

    blog/
      page.tsx                      → /blog
      [slug]/
        page.tsx                    → /blog/:slug

    dashboard/
      layout.tsx                    → Dashboard layout
      page.tsx                      → /dashboard
      404.tsx                       → Local 404 for /dashboard/*
      overview/
        page.tsx                    → /dashboard/overview
      settings/
        page.tsx                    → /dashboard/settings

    users/
      page.tsx                      → /users
      [id]/
        page.tsx                    → /users/:id
        edit/
          page.tsx                  → /users/:id/edit

    (auth)/
      layout.tsx                    → Auth layout (centered card)
      login/
        page.tsx                    → /login
      register/
        page.tsx                    → /register

  _redirects.ts                     → Static redirect configuration
```

## Comparison with Next.js

| Feature | Next.js App Router | This Plugin |
|---------|-------------------|-------------|
| File-based routing | `page.tsx` | `page.tsx` |
| Dynamic routes | `[id]` | `[id]` → `$id` |
| Route groups | `(group)` | `(group)` |
| Layouts | `layout.tsx` (auto) | `layout.tsx` (auto) |
| Error pages | `error.tsx` | `404.tsx` |
| Loading states | `loading.tsx` | Use TanStack Router's pending component |
| Data loading | Server Components | `loader` function |
| Redirects | `redirect()` | `_redirects.ts` + `beforeLoad` |

## HMR Behavior

The plugin watches for changes in your pages directory:

- Adding/deleting/modifying `page.tsx` → Route tree regenerates + full page reload
- Adding/deleting/modifying `layout.tsx` → Route tree regenerates + full page reload
- Adding/deleting/modifying `404.tsx` → Route tree regenerates + full page reload
- Modifying `_redirects.ts` → Route tree regenerates + full page reload

## Troubleshooting

### Routes Not Updating

1. Check that your file is named `page.tsx`, `layout.tsx`, or `404.tsx`
2. Ensure the file is inside `src/pages/` directory
3. Check the terminal for plugin logs: `[vite-plugin-tsr-next] Generated X pages, Y layouts, Z redirects`
4. Try restarting the dev server

### TypeScript Errors

1. Ensure `routeTree.gen.d.ts` is generated
2. Check that your `tsconfig.json` includes the `src` directory
3. Restart your TypeScript server in your IDE

### 404 Not Working

1. Global 404: Create `src/pages/404.tsx`
2. Local 404: Create `404.tsx` in the parent route directory
3. Local 404 only works if parent route exists

### Redirects Not Working

1. Check `_redirects.ts` file format — must export a default array
2. Check terminal logs for redirect count
3. Look for path conflict warnings

## Rules & Conventions

### Do

- Use `page.tsx` for route components
- Use `layout.tsx` for shared layouts with `<Outlet />`
- Use `404.tsx` for error pages
- Use `[param]` for dynamic segments
- Use `(group)` for organizational grouping
- Export `loader` for data fetching
- Export `beforeLoad` for route guards
- Use `_redirects.ts` for static redirects

### Don't

- Don't create both `404.tsx` and `404/page.tsx` (`404.tsx` takes priority)
- Don't edit generated files (`*.gen.tsx`, `*.gen.d.ts`)
- Don't forget `<Outlet />` in `layout.tsx`
- Don't use duplicate `from` paths in `_redirects.ts`

## License

[MIT](LICENSE)

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.
