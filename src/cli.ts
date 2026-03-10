import { download } from './index'

function printHelp(): void {
  console.log(`
Usage: puppeteer-downloader [options]

从镜像源下载 Chrome for Testing，目录结构兼容 Puppeteer 缓存格式。

Options:
  --mirror-base <url>   镜像源 base URL (默认: npmmirror CDN)
  --cache-dir <dir>     浏览器缓存目录 (默认: ~/.cache/puppeteer)
  --version <ver>       指定 Chrome 版本 (默认: 最新稳定版)
  --silent              静默模式，仅输出可执行文件路径
  -h, --help            显示帮助信息

Examples:
  puppeteer-downloader
  puppeteer-downloader --cache-dir ./browsers
  puppeteer-downloader --version 131.0.6778.85
  puppeteer-downloader --silent
`)
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      result.help = true
    } else if (arg === '--silent' || arg === '-s') {
      result.silent = true
    } else if (arg === '--mirror-base' && i + 1 < args.length) {
      result.mirrorBase = args[++i]
    } else if (arg === '--cache-dir' && i + 1 < args.length) {
      result.cacheDir = args[++i]
    } else if (arg === '--version' && i + 1 < args.length) {
      result.version = args[++i]
    }
  }
  return result
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  printHelp()
  process.exit(0)
}

download({
  mirrorBase: typeof args.mirrorBase === 'string' ? args.mirrorBase : undefined,
  cacheDir: typeof args.cacheDir === 'string' ? args.cacheDir : undefined,
  version: typeof args.version === 'string' ? args.version : undefined,
  silent: args.silent === true,
})
  .then((result) => {
    if (args.silent) {
      console.log(result.executablePath)
    }
  })
  .catch((err: Error) => {
    console.error(`\n⚠️  下载失败: ${err.message}\n`)
    process.exit(1)
  })
