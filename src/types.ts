import { join } from 'path'
import { homedir } from 'os'

export const DEFAULT_MIRROR_BASE = 'https://cdn.npmmirror.com/binaries/chrome-for-testing'
export const DEFAULT_CACHE_DIR = join(homedir(), '.cache', 'puppeteer')

export const SUPPORTED_BROWSERS = [
  'chrome',
  'chrome-headless-shell',
  'chromedriver',
  'firefox',
] as const

export type SupportedBrowser = (typeof SUPPORTED_BROWSERS)[number]

export interface DownloadOptions {
  /** 镜像源 base URL，默认 npmmirror CDN */
  mirrorBase?: string
  /** 浏览器缓存目录，默认 ~/.cache/puppeteer（与 Puppeteer 默认一致） */
  cacheDir?: string
  /** 浏览器类型，默认 chrome */
  browser?: SupportedBrowser
  /** 指定浏览器版本，默认获取最新稳定版 */
  version?: string
  /** 静默模式，不输出任何日志，默认 false */
  silent?: boolean
}

export interface DownloadResult {
  /** Chrome 可执行文件绝对路径 */
  executablePath: string
  /** 下载的 Chrome 版本号 */
  version: string
  /** 平台标识 (win64, linux64, mac-arm64 等) */
  platform: string
  /** 是否已经安装（跳过了下载） */
  alreadyInstalled: boolean
}
