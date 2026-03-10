# puppeteer-downloader

从镜像源下载 Chrome for Testing，默认使用 npmmirror CDN，目录结构兼容 Puppeteer 缓存格式。

## 特性

- 🚀 默认从 npmmirror CDN 下载，国内网络友好
- 📦 目录结构兼容 Puppeteer 缓存格式（`~/.cache/puppeteer`）
- 🎨 TTY 环境下显示实时进度条，非 TTY 环境按百分比输出
- ⚡ 自动检测已安装版本，跳过重复下载
- 🔧 支持 CLI 和编程两种使用方式
- 🌍 跨平台支持 Windows / macOS / Linux

## 安装

```bash
npm install puppeteer-downloader
```

## CLI 使用

```bash
# 下载最新稳定版 Chrome
npx puppeteer-downloader

# 指定缓存目录
npx puppeteer-downloader --cache-dir ./browsers

# 指定浏览器（默认 chrome）
npx puppeteer-downloader --browser firefox

# 指定版本
npx puppeteer-downloader --version 131.0.6778.85

# 静默模式（仅输出可执行文件路径）
npx puppeteer-downloader --silent

# 自定义镜像源
npx puppeteer-downloader --mirror-base https://your-mirror.com/chrome-for-testing
```

### CLI 选项

| 选项                  | 说明                       | 默认值           |
| --------------------- | -------------------------- | ---------------- |
| `--mirror-base <url>` | 镜像源 base URL            | npmmirror CDN    |
| `--cache-dir <dir>`   | 浏览器缓存目录             | ~/.cache/puppeteer |
| `--browser <name>`    | 浏览器类型                 | chrome           |
| `--version <ver>`     | 指定浏览器版本             | 最新稳定版       |
| `--silent`            | 静默模式，仅输出可执行路径 | false            |
| `-h, --help`          | 显示帮助信息               |                  |

支持的 `browser`：`chrome`、`chrome-headless-shell`、`chromedriver`、`firefox`。

## 编程使用

```typescript
import { download } from 'puppeteer-downloader'

// 使用默认配置下载
const result = await download()
console.log(result.executablePath) // Chrome 可执行文件路径
console.log(result.version)       // 例如 "131.0.6778.85"
console.log(result.alreadyInstalled) // 是否已安装（跳过下载）

// 自定义配置
const result = await download({
  cacheDir: './browsers',
  browser: 'firefox',
  version: '131.0.6778.85',
  silent: true,
})
```

### API

#### `download(options?): Promise<DownloadResult>`

| 参数         | 类型     | 说明                    | 默认值                                                         |
| ------------ | -------- | ----------------------- | -------------------------------------------------------------- |
| `mirrorBase` | `string` | 镜像源 base URL         | `https://cdn.npmmirror.com/binaries/chrome-for-testing`        |
| `cacheDir`   | `string` | 浏览器缓存目录          | `~/.cache/puppeteer`                                           |
| `browser`    | `'chrome' \| 'chrome-headless-shell' \| 'chromedriver' \| 'firefox'` | 浏览器类型 | `chrome` |
| `version`    | `string` | 指定浏览器版本          | 自动获取最新稳定版                                             |
| `silent`     | `boolean`| 静默模式                | `false`                                                        |

#### `DownloadResult`

| 字段               | 类型      | 说明                      |
| ------------------ | --------- | ------------------------- |
| `executablePath`   | `string`  | Chrome 可执行文件绝对路径 |
| `version`          | `string`  | Chrome 版本号             |
| `platform`         | `string`  | 平台标识                  |
| `alreadyInstalled` | `boolean` | 是否已安装（跳过了下载）  |

## 与 Puppeteer 配合使用

下载目录结构完全兼容 Puppeteer 缓存格式。默认下载到 `~/.cache/puppeteer/chrome/{platform}-{version}/`，Puppeteer 可以直接识别。

```typescript
import { download } from 'puppeteer-downloader'
import puppeteer from 'puppeteer-core'

// 先下载 Chrome
const { executablePath } = await download({ silent: true })

// 用下载的 Chrome 启动 Puppeteer
const browser = await puppeteer.launch({ executablePath })
```

## 镜像源说明

默认使用 npmmirror CDN 作为下载源，URL 格式：

```
https://cdn.npmmirror.com/binaries/chrome-for-testing/{version}/{platform}/chrome-{platform}.zip
```

版本信息从 `{mirrorBase}/last-known-good-versions.json` 获取。如使用自定义镜像源，需确保该文件存在，或通过 `--version` 指定版本号。

## 发布说明

本包已启用 npm Trusted Publisher，仓库绑定为 `TomyJan/puppeteer-downloader`。

- 发布方式：推送 `v*` tag（例如 `v0.1.1`）触发 `.github/workflows/publish.yml`
- 认证方式：GitHub Actions OIDC（不再需要 `NPM_TOKEN`）
- 发布命令：`npm publish --provenance --access public`

示例：

```bash
git tag v0.1.1
git push origin v0.1.1
```

## License

MIT
