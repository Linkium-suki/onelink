# OneLink 2.0 — Share Everything With One Link

<p align="center">
  <img src="public/logo.svg" alt="OneLink Logo" width="128" height="128">
</p>

<h3 align="center">一个功能强大、美观、完全免费的"万物分享"服务，100% 运行在 Cloudflare 的免费生态之上。</h3>

<p align="center">
    <a href="https://1url.icu">
        <img src="https://img.shields.io/badge/Live%20Demo-Visit%20Now-brightgreen" alt="Live Demo">
    </a>
    <a href="LICENSE">
        <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT">
    </a>
    <a href="https://www.cloudflare.com">
        <img src="https://img.shields.io/badge/Powered%20by-Cloudflare-F48020" alt="Powered by Cloudflare">
    </a>
</p>

---

## 🔄 全新重制说明（v2.0）

本版本是 [OneLink 1.x](https://github.com/Linkium-suki/onelink) 的**全新重制**：推翻旧的 Cloudflare Pages 架构，代码与 UI 全部重写，迁移到 Cloudflare 官方推荐的新项目架构 **Workers + Workers Static Assets**。

| | 1.x（旧版） | 2.0（本版） |
| :--- | :--- | :--- |
| 架构 | Cloudflare Pages + Pages Functions | **Cloudflare Workers + Static Assets**（单一部署单元） |
| 后端 | 单文件 `_middleware.ts` | **Hono** 路由 + 模块化 TypeScript（strict 模式） |
| 前端 | 原生 HTML/CSS/JS | **React 19 + Vite + TypeScript**（`@cloudflare/vite-plugin` 官方集成，HMR 热更新） |
| 部署 | Git 集成 / `wrangler pages deploy` | `npm run deploy`（一条命令：类型检查 → 构建 → 部署） |
| 配置 | Dashboard 手填绑定 | `wrangler.jsonc` 声明式配置 |

**安全修复**（旧版存在的问题）：

- 🔒 **消息页 XSS**：旧版把用户内容直接拼进 `<script>` 模板字符串并可被 `</script>` 逃逸，Markdown 渲染结果也未消毒。新版通过 `<script type="application/json">` 安全传参 + **DOMPurify** 消毒。
- 🔒 **文件名 XSS**：下载/预览页直接内插文件名。新版全部 HTML 转义。
- 🔒 **密码走 GET**：旧版密码出现在 URL 查询参数里（进浏览器历史、访问日志）。新版密码改用 **POST** 表单提交，并做恒定时间比较。
- 🔒 **自定义短代码无校验**：旧版接受任意字符（含 `/`、`..`、HTML）。新版白名单校验 + 保留字（`api`、`admin`、`index`…）拦截。
- 🔒 **安全响应头**：所有动态页面带 CSP、`nosniff`、`frame-ancestors 'none'`；静态资源带 `_headers` 安全头。

**新增能力**：

- 🎬 视频播放支持 **HTTP Range 分段请求**（可拖进度条，不用整段下载）
- 📥 修复旧版 Bug：文本类文件（.md/.txt…）带 `?download=true` 不会下载、只会再渲染一遍预览 → 现在**下载永远优先**
- 🛡️ 非管理员创建接口 **IP 速率限制**（20 次/小时，KV 实现）
- 🧹 **管理员 API**：查询与删除任意分享（见下文）
- 🚫 品牌化 404 页（旧版未知路径直接白屏）
- ⏱️ 有效期新增 **1 小时** 档位
- 🖱️ 前端：**Metro 风格全新 UI（蓝/橙配色，扁平直角 + 磁贴式 Tabs）**、**拖拽上传 + 实时上传进度条**、深浅色主题记忆、Turnstile 站点密钥改为服务端下发（`/api/config`），不再硬编码

原有全部功能（三种分享类型、密码、阅后即焚、自定义短代码、有效期、二维码、`code+` 统计、Turnstile、管理员免验证）全部保留。

---

## 🛠️ 技术栈

| 服务 / 组件 | 角色 |
| :--- | :--- |
| **Cloudflare Workers + Static Assets** | 托管前端构建产物并运行后端 API |
| **Cloudflare KV** | 存储分享元数据（目标地址、密码、有效期、访问历史） |
| **Cloudflare R2** | 存储上传的临时文件 |
| **Cloudflare Turnstile** | 免费、无感的人机验证 |
| **React 19 + Vite** | 前端框架与构建工具（`@cloudflare/vite-plugin` 打通本地全栈开发） |
| **Hono** | 轻量后端路由框架 |
| **TypeScript (strict)** | 全量类型安全 |

---

## 🚀 部署指南

### 前提条件

1. 一个 Cloudflare 账户。
2. 本地安装 `Node.js 20+` 和 `npm`。
3. （可选）一个你自己的域名，NS 已指向 Cloudflare。

### 1. 获取代码并安装依赖

```bash
git clone https://github.com/Linkium-suki/onelink.git
cd onelink
npm install
```

### 2. 创建 Cloudflare 资源

```bash
# 创建 KV 命名空间，把输出的 id 填进 wrangler.jsonc 的 kv_namespaces
npx wrangler kv namespace create LINKS_KV

# 创建 R2 存储桶（名称需与 wrangler.jsonc 中一致，默认 onelink-files）
npx wrangler r2 bucket create onelink-files
```

再到 Dashboard → **Turnstile** 添加站点（选择 *Invisible*），记下 **Site Key** 与 **Secret Key**。

### 3. 配置变量与密钥

编辑 `wrangler.jsonc` 中的 `vars`：

- `APP_URL`：你的短链域名（如 `https://s.yourdomain.com`），**留空则自动使用 Workers 默认域名**
- `TURNSTILE_SITE_KEY`：Turnstile 的 Site Key（公开）

用 wrangler 写入两个加密密钥：

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put ADMIN_SECRET        # 自定义一个复杂的管理员密码
```

### 4. 部署

```bash
npm run deploy
```

完成！访问输出的 `https://onelink.<你的子域>.workers.dev` 即可使用。### 5. 绑定自定义域名（可选）

Dashboard → **Workers & Pages** → `onelink` → **Settings** → **Domains & Routes** 添加你的域名；或在 `wrangler.jsonc` 中配置 `routes`。

> 💡 也可以在 Dashboard 里给这个 Worker 连接 Git 仓库（**Workers Builds**），实现 push 自动部署。
>
> 🔁 从旧版 Pages 迁移？旧数据在 KV/R2 中不受影响，把新 Worker 绑定到原域名即可无缝切换。

---

## 💻 本地开发

```bash
npm install
npm run dev        # Vite 全栈开发服务器 http://localhost:5173（前端 HMR + Worker 本地运行）
npm run build      # 类型检查 + 生产构建
npm run preview    # 构建并在 Workers 运行时中预览产物
npm run typecheck  # 仅类型检查
```

仓库自带 `.dev.vars`（已被 gitignore），使用 Cloudflare **官方测试密钥**，本地即可跑通 Turnstile 全流程；KV 与 R2 由 Miniflare 本地模拟，无需真实资源。

| 键 | 本地值 | 行为 |
| :--- | :--- | :--- |
| `TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` | 前端永远通过 |
| `TURNSTILE_SECRET_KEY` | `1x0000000000000000000000000000000AA` | 服务端永远通过 |
| `ADMIN_SECRET` | `dev-admin-secret` | 本地管理员凭证 |

---

## 🔑 管理员 API

所有管理接口需带请求头 `x-admin-secret: <ADMIN_SECRET>`。

**创建分享**（`POST /api/create`）——携带该请求头即跳过 Turnstile 与速率限制，文件不受 24 小时限制：

```bash
curl -X POST "https://your-domain/api/create" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -F "type=link" -F "target=https://example.com" -F "expiry=never"
```

**查询分享**（不含密码字段）：

```bash
curl -H "x-admin-secret: $ADMIN_SECRET" "https://your-domain/api/admin/<code>"
```

**删除分享**（连同 R2 文件）：

```bash
curl -X DELETE -H "x-admin-secret: $ADMIN_SECRET" "https://your-domain/api/admin/<code>"
```

---

## 📊 访问统计

在任意短链接后加 `+`（例如 `https://s.yourdomain.com/xyz+`）即可查看该分享的访问次数、来源国家/地区与时间线。

---

## 🙏 致敬

<div align="center">
  <p>Powered by Cloudflare
    <a href="https://www.cloudflare.com">
      <img src="public/cflogo.svg" alt="Cloudflare Logo" width="20" style="vertical-align: middle; margin-left: 8px;">
    </a>
  </p>
  <p>
    <code>Cloudflare的恩情还不完🤚😭✋</code>
  </p>
</div>

---

<div align="center">
  <p>
    © 2024-2026 Linkium · Forged with ❤️ and powered by caffeine.
  </p>
  <p>
    <a href="https://github.com/Linkium-suki/onelink">GitHub Repo</a>
  </p>
</div>
