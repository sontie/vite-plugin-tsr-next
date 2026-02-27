# vite-plugin-tsr-next

[English](README.md) | [中文](README.zh-CN.md)

基于文件系统的 [TanStack Router](https://tanstack.com/router) 路由插件，灵感来自 Next.js App Router 的约定。

## 特性

- 📁 **基于文件的路由** — 文件结构即路由结构
- 🔥 **热模块替换** — 开发时即时更新路由
- 🎯 **类型安全** — 完整的 TypeScript 支持和自动类型生成
- 🎨 **动态路由** — `[id]` 目录映射为 `$id` 参数，`[...slug]` 支持 catch-all 路由
- 🔀 **路由组** — `(group)` 目录组织路由，不影响 URL
- 🎭 **布局系统** — 通过 `layout.tsx` 创建嵌套布局，支持多层嵌套
- 🚫 **404 页面** — 全局和局部 404 错误页面
- 🔄 **重定向** — 支持静态、动态和通配符重定向规则
- 📦 **数据加载** — 自动检测和集成 `loader` / `beforeLoad`
- 🚀 **零依赖** — 仅需 `vite` 作为 peer dependency

## 安装

```bash
npm install -D vite-plugin-tsr-next
```

## 快速开始

### 1. 配置插件

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

### 2. 创建页面

```
src/pages/
├── page.tsx              → /
├── layout.tsx            → 根布局
├── 404.tsx               → 全局 404
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

### 3. 使用生成的路由

```tsx
// src/Router.tsx
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

// 注意：类型注册已在 routeTree.gen.d.ts 中自动生成
// 无需在此手动声明 module '@tanstack/react-router'

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

## 文件约定

| 文件 | 用途 |
|------|------|
| `page.tsx` | 路由组件 |
| `layout.tsx` | 布局包装器（无路径路由，使用 `<Outlet />` 渲染子路由） |
| `404.tsx` | 404 页面（根目录为全局，子目录为局部） |
| `[param]` | 动态路由参数 |
| `[...param]` | Catch-all 路由（通配） |
| `(group)` | 路由组（不影响 URL） |
| `_redirects.ts` | 重定向规则 |

## 路由约定

### 基础路由

| 文件路径 | URL 路径 |
|---------|---------|
| `src/pages/page.tsx` | `/` |
| `src/pages/about/page.tsx` | `/about` |
| `src/pages/blog/posts/page.tsx` | `/blog/posts` |

### 动态路由

使用方括号 `[param]` 创建动态路由段。

| 文件路径 | URL 路径 | 参数 |
|---------|---------|------|
| `src/pages/users/[id]/page.tsx` | `/users/123` | `{ id: '123' }` |
| `src/pages/posts/[slug]/page.tsx` | `/posts/hello-world` | `{ slug: 'hello-world' }` |

```tsx
// src/pages/users/[id]/page.tsx
import { useParams } from '@tanstack/react-router'

export default function UserPage() {
  const { id } = useParams({ from: '/users/$id' })
  return <h1>用户 ID: {id}</h1>
}
```

也支持多层动态路由：

```tsx
// src/pages/posts/[postId]/comments/[commentId]/page.tsx
// 匹配: /posts/123/comments/456
```

### Catch-All 路由

使用 `[...param]` 创建 catch-all（通配）路由，匹配任意数量的路径段。

| 文件路径 | 路由路径 | 匹配 |
|---------|---------|------|
| `src/pages/docs/[...slug]/page.tsx` | `/docs/$` | `/docs/a`、`/docs/a/b/c` |

```tsx
// src/pages/docs/[...slug]/page.tsx
import { useParams } from '@tanstack/react-router'

export default function DocsPage() {
  const { _splat } = useParams({ from: '/docs/$' })
  return <h1>文档: {_splat}</h1>
}
```

### 路由组

使用圆括号 `(group)` 来组织路由，不影响 URL 结构。

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

## 布局系统

使用 `layout.tsx` 文件定义布局组件，它会自动包裹同目录及子目录下的所有页面。

### 基础布局

```tsx
// src/pages/(dashboard)/layout.tsx
import { Outlet } from '@tanstack/react-router'

export default function DashboardLayout() {
  return (
    <div>
      <header>
        <nav>
          <a href="/">首页</a>
          <a href="/device">设备管理</a>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>© 2024 我的应用</footer>
    </div>
  )
}
```

### 带布局的文件结构

```
src/pages/
├── (dashboard)/              # 路由组（不影响 URL）
│   ├── layout.tsx           # Dashboard 布局
│   ├── page.tsx             # /（在布局内）
│   ├── device/
│   │   └── page.tsx         # /device（在布局内）
│   └── data/
│       └── page.tsx         # /data（在布局内）
└── login/
    └── page.tsx             # /login（独立页面，无布局）
```

- 访问 `/` 或 `/device`：显示 `DashboardLayout` + 页面内容
- 访问 `/login`：只显示登录页面，不包含布局

### 多层嵌套布局

布局可以嵌套，实现更复杂的页面结构：

```
src/pages/
└── (dashboard)/
    ├── layout.tsx           # 第一层布局（全局导航）
    ├── page.tsx             # /
    └── system/
        ├── layout.tsx       # 第二层布局（系统设置侧边栏）
        ├── page.tsx         # /system
        └── users/
            └── page.tsx     # /system/users
```

访问 `/system/users` 时的渲染层级：

```
DashboardLayout（全局导航）
  └─ SystemLayout（系统侧边栏）
      └─ UsersPage（用户列表）
```

### 布局 vs 根组件

| 方式 | 使用场景 | 配置位置 |
|-----|---------|---------|
| `layout.tsx` | 部分页面共享布局 | 在 `src/pages` 的子目录中创建 |
| `rootComponent` | 所有页面的全局布局 | 在 `vite.config.ts` 中配置 |

```typescript
// vite.config.ts — 使用 rootComponent 配置全局布局
tanstackRouterPlugin({
  rootComponent: 'layouts/RootLayout'  // src/layouts/RootLayout.tsx
})
```

## 错误页面（404）

### 全局 404

在 pages 目录根部创建 `404.tsx` 文件：

```tsx
// src/pages/404.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - 页面未找到</h1>
      <p>您访问的页面不存在。</p>
    </div>
  )
}
```

`404.tsx` 有双重用途：
1. 未匹配路由的全局错误页面
2. 可通过 `/404` URL 访问

### 局部 404

在任何子目录中创建 `404.tsx` 文件来处理该路由子级的错误：

```tsx
// src/pages/dashboard/404.tsx
export default function DashboardNotFound() {
  return <h1>仪表盘资源未找到</h1>
}
```

- 访问 `/dashboard/nonexistent` 将显示 `dashboard/404.tsx`
- 如果没有局部 404，则回退到全局 `404.tsx`

## 数据加载

从任何 `page.tsx` 或 `layout.tsx` 导出 `loader` 或 `beforeLoad`：

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

插件会在运行时自动检测并接入 `loader` 和 `beforeLoad` 导出。

布局也支持数据加载：

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
      <header>欢迎, {user.name}</header>
      <Outlet />
    </div>
  )
}
```

## 路由重定向

插件支持两种类型的重定向：**静态重定向**和**动态重定向**（路由守卫）。

### 静态重定向

创建 `src/_redirects.ts` 定义静态重定向规则。

注意：`_redirects.ts` 仅支持纯字面量数组（不支持变量引用、模板字符串、函数调用等复杂表达式），因为插件通过正则解析而非 TypeScript 编译来读取此文件。

```typescript
// src/_redirects.ts
export default [
  // 简单静态重定向
  { from: '/old-about', to: '/about', permanent: true },

  // 动态参数重定向
  { from: '/users/[id]', to: '/profile/[id]', permanent: true },

  // 通配符重定向
  { from: '/blog/*', to: '/posts/*', permanent: true },

  // 临时重定向（307）
  { from: '/maintenance', to: '/under-construction', permanent: false },
]
```

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `from` | string | 源路径，支持 `[id]` 和 `*` | 必填 |
| `to` | string | 目标路径 | 必填 |
| `permanent` | boolean | `true` = 301 永久重定向，`false` = 307 临时重定向 | `true` |

### 动态重定向（路由守卫）

使用页面级的 `beforeLoad` 函数实现动态重定向：

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
  return <h1>仪表盘</h1>
}
```

### 全局路由守卫

对于全局鉴权，推荐在 `Router.tsx` 中配置：

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

### 重定向优先级

当同一路径同时存在重定向和普通路由时：

1. **静态重定向** (`_redirects.ts`) — 最高优先级
2. **页面级 `beforeLoad`** — 中等优先级
3. **普通路由** — 最低优先级

如果重定向与已有路由冲突，路由会被忽略，控制台会输出警告。

## 插件选项

```ts
tanstackRouterPlugin({
  pagesDir: 'src/pages',              // Pages 目录
  outputFile: 'src/routeTree.gen.tsx', // 生成的路由树
  typeOutputFile: 'src/routeTree.gen.d.ts', // 类型定义
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  rootComponent: undefined,            // 自定义根组件路径
  redirectsFile: 'src/_redirects.ts',  // 重定向文件
  ignorePatterns: ['__tests__', '__mocks__', 'node_modules'],
  debug: false,                        // 启用调试日志
})
```

所有选项均为可选，有合理的默认值。

注意：以 `.` 开头的目录（如 `.hidden`）在扫描时会被自动跳过，无需添加到 `ignorePatterns`。

## 生成的文件

插件生成两个文件：

### `src/routeTree.gen.tsx`

包含完整的路由树、所有路由定义、导入语句，以及用于自动接入 `loader`/`beforeLoad` 的 `pickExports` 辅助函数。

### `src/routeTree.gen.d.ts`

用于类型安全路由的 TypeScript 类型定义：

```tsx
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter<typeof routeTree>>
  }
}
```

## 高级示例

### 完整的应用结构

```
src/
  pages/
    page.tsx                        → /
    layout.tsx                      → 根布局
    404.tsx                         → 全局 404

    about/
      page.tsx                      → /about

    blog/
      page.tsx                      → /blog
      [slug]/
        page.tsx                    → /blog/:slug

    dashboard/
      layout.tsx                    → Dashboard 布局
      page.tsx                      → /dashboard
      404.tsx                       → /dashboard/* 的局部 404
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
      layout.tsx                    → 认证布局（居中卡片）
      login/
        page.tsx                    → /login
      register/
        page.tsx                    → /register

  _redirects.ts                     → 静态重定向配置
```

## 与 Next.js 对比

| 特性 | Next.js App Router | 本插件 |
|------|-------------------|--------|
| 基于文件的路由 | `page.tsx` | `page.tsx` |
| 动态路由 | `[id]` | `[id]` → `$id` |
| 路由组 | `(group)` | `(group)` |
| 布局 | `layout.tsx`（自动） | `layout.tsx`（自动） |
| 错误页面 | `error.tsx` | `404.tsx` |
| 加载状态 | `loading.tsx` | 使用 TanStack Router 的 pending 组件 |
| 数据加载 | Server Components | `loader` 函数 |
| 重定向 | `redirect()` | `_redirects.ts` + `beforeLoad` |

## HMR 行为

插件监视文件变化并自动重新生成路由：

- 添加/删除/修改 `page.tsx` → 路由树重新生成 + 页面刷新
- 添加/删除/修改 `layout.tsx` → 路由树重新生成 + 页面刷新
- 添加/删除/修改 `404.tsx` → 路由树重新生成 + 页面刷新
- 修改 `_redirects.ts` → 路由树重新生成 + 页面刷新

## 故障排查

### 路由未更新

1. 检查文件名是否为 `page.tsx`、`layout.tsx` 或 `404.tsx`
2. 确保文件在 `src/pages/` 目录内
3. 检查终端的插件日志：`[vite-plugin-tsr-next] Generated X pages, Y layouts, Z redirects`
4. 尝试重启开发服务器

### TypeScript 错误

1. 确保 `routeTree.gen.d.ts` 已生成
2. 检查 `tsconfig.json` 是否包含 `src` 目录
3. 在 IDE 中重启 TypeScript 服务器

### 404 不工作

1. 全局 404：创建 `src/pages/404.tsx`
2. 局部 404：在父路由目录中创建 `404.tsx`
3. 局部 404 仅在父路由存在时才有效

### 重定向不生效

1. 检查 `_redirects.ts` 文件格式 — 必须导出默认数组
2. 检查终端日志中的重定向数量
3. 查看是否有路径冲突警告

## 规则与约定

### 应该做

- 使用 `page.tsx` 作为路由组件
- 使用 `layout.tsx` 创建共享布局，配合 `<Outlet />`
- 使用 `404.tsx` 作为错误页面
- 使用 `[param]` 表示动态段
- 使用 `(group)` 进行组织分组
- 导出 `loader` 进行数据获取
- 导出 `beforeLoad` 实现路由守卫
- 使用 `_redirects.ts` 配置静态重定向

### 不应该做

- 不要同时创建 `404.tsx` 和 `404/page.tsx`（`404.tsx` 优先级更高）
- 不要编辑生成的文件（`*.gen.tsx`、`*.gen.d.ts`）
- 不要忘记在 `layout.tsx` 中添加 `<Outlet />`
- 不要在 `_redirects.ts` 中使用重复的 `from` 路径

## 许可证

[MIT](LICENSE)

## 贡献

欢迎贡献！随时提交 issue 或 pull request。
