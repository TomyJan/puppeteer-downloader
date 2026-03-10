import {
  existsSync,
  mkdirSync,
  createWriteStream,
  rmSync,
  statSync,
  readdirSync,
  chmodSync,
} from 'fs'
import { join, dirname } from 'path'
import { spawn } from 'child_process'
import type { DownloadOptions, DownloadResult, SupportedBrowser } from './types'
import {
  DEFAULT_MIRROR_BASE,
  DEFAULT_CACHE_DIR,
  SUPPORTED_BROWSERS,
} from './types'
import { getPlatform, getExecutableCandidates } from './platform'
import {
  formatSize,
  formatSpeed,
  formatTime,
  progressBar,
  ICONS,
  createColors,
  type Colors,
} from './utils'

// ============== Output 抽象 ==============

class Output {
  public isTTY: boolean
  public colors: Colors

  constructor(public silent: boolean) {
    this.isTTY = !silent && process.stdout.isTTY === true
    this.colors = createColors(this.isTTY)
  }

  log(icon: string, message: string, color?: string): void {
    if (this.silent) return
    const c = color || this.colors.reset
    console.log(`${icon} ${c}${message}${this.colors.reset}`)
  }

  divider(): void {
    if (this.silent) return
    console.log(`${this.colors.dim}${'─'.repeat(60)}${this.colors.reset}`)
  }

  title(text: string): void {
    if (this.silent) return
    console.log()
    console.log(`${this.colors.bright}${this.colors.cyan}${text}${this.colors.reset}`)
    this.divider()
  }

  clearLine(): void {
    if (!this.isTTY) return
    process.stdout.write('\r\x1b[K')
  }
}

// ============== 内部函数 ==============

function resolveExecutablePath(
  installDir: string,
  browser: SupportedBrowser,
  platform: string,
): string | undefined {
  const candidates = getExecutableCandidates(browser, platform)
  return candidates.map((p) => join(installDir, p)).find((p) => existsSync(p))
}

/** 获取 stable 版本号 */
async function getStableVersion(mirrorBase: string): Promise<string> {
  const url = `${mirrorBase}/last-known-good-versions.json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`获取版本信息失败: ${response.status}`)
  }
  const data = (await response.json()) as {
    channels: { Stable: { version: string } }
  }
  return data.channels.Stable.version
}

/** 递归获取目录大小 */
function getDirSize(dirPath: string): number {
  if (!existsSync(dirPath)) return 0
  let size = 0
  try {
    const items = readdirSync(dirPath, { withFileTypes: true })
    for (const item of items) {
      const itemPath = join(dirPath, item.name)
      if (item.isDirectory()) {
        size += getDirSize(itemPath)
      } else {
        size += statSync(itemPath).size
      }
    }
  } catch {
    // 忽略权限错误等
  }
  return size
}

/** 下载文件（带进度显示） */
async function downloadFile(url: string, dest: string, out: Output): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`)
  }

  const dir = dirname(dest)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const contentLength = response.headers.get('content-length')
  const totalSize = contentLength ? parseInt(contentLength, 10) : 0

  const fileStream = createWriteStream(dest)
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法获取响应流')
  }

  const { colors, isTTY, silent } = out
  let downloadedSize = 0
  const startTime = Date.now()
  let lastUpdateTime = startTime
  let lastDownloadedSize = 0
  let lastProgressPercent = -1

  if (isTTY) console.log()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    fileStream.write(value)
    downloadedSize += value.length

    if (silent) continue

    const now = Date.now()
    const elapsed = (now - startTime) / 1000

    if (isTTY) {
      // TTY 环境：每 100ms 更新一次
      if (now - lastUpdateTime >= 100) {
        const intervalTime = (now - lastUpdateTime) / 1000
        const intervalBytes = downloadedSize - lastDownloadedSize
        const speed = intervalTime > 0 ? intervalBytes / intervalTime : 0

        lastUpdateTime = now
        lastDownloadedSize = downloadedSize

        if (totalSize > 0) {
          const progress = downloadedSize / totalSize
          const remaining = speed > 0 ? (totalSize - downloadedSize) / speed : 0

          out.clearLine()
          process.stdout.write(
            `  ${progressBar(progress, 30, colors.cyan, colors.reset)} ${colors.bright}${(progress * 100).toFixed(1)}%${colors.reset}\n` +
              `  ${ICONS.folder} ${formatSize(downloadedSize)} / ${formatSize(totalSize)}  ` +
              `${ICONS.speed} ${colors.yellow}${formatSpeed(speed)}${colors.reset}  ` +
              `${ICONS.time} ${formatTime(elapsed)} / ${colors.dim}${formatTime(remaining)}${colors.reset}`,
          )
          process.stdout.write('\x1b[1A\r')
        } else {
          out.clearLine()
          process.stdout.write(
            `  ${ICONS.folder} ${formatSize(downloadedSize)}  ` +
              `${ICONS.speed} ${colors.yellow}${formatSpeed(speed)}${colors.reset}  ` +
              `${ICONS.time} ${formatTime(elapsed)}`,
          )
        }
      }
    } else {
      // 非 TTY 环境：每 10% 输出一次
      if (totalSize > 0) {
        const currentPercent = Math.floor((downloadedSize / totalSize) * 10) * 10
        if (currentPercent > lastProgressPercent) {
          lastProgressPercent = currentPercent
          const intervalTime = (now - lastUpdateTime) / 1000
          const intervalBytes = downloadedSize - lastDownloadedSize
          const speed = intervalTime > 0 ? intervalBytes / intervalTime : 0
          const remaining = speed > 0 ? (totalSize - downloadedSize) / speed : 0

          lastUpdateTime = now
          lastDownloadedSize = downloadedSize

          console.log(
            `  下载进度: ${currentPercent}%  ` +
              `${formatSize(downloadedSize)} / ${formatSize(totalSize)}  ` +
              `速度 ${formatSpeed(speed)}  ` +
              `${formatTime(elapsed)} / ${formatTime(remaining)}`,
          )
        }
      }
    }
  }

  // 最终统计
  const totalTime = (Date.now() - startTime) / 1000
  const avgSpeed = totalTime > 0 ? downloadedSize / totalTime : 0

  if (isTTY) {
    out.clearLine()
    if (totalSize > 0) {
      console.log(
        `  ${progressBar(1, 30, colors.cyan, colors.reset)} ${colors.green}${colors.bright}100%${colors.reset}`,
      )
    }
  }

  if (!silent) {
    console.log(
      `  ${ICONS.check} ${colors.green}下载完成${colors.reset}  ` +
        `${formatSize(downloadedSize)}  ` +
        `${colors.dim}平均 ${formatSpeed(avgSpeed)}${colors.reset}  ` +
        `${colors.dim}耗时 ${formatTime(totalTime)}${colors.reset}`,
    )
  }

  fileStream.end()
  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', resolve)
    fileStream.on('error', reject)
  })
}

/** 解压 zip 文件（带进度显示） */
async function extractZip(zipPath: string, destDir: string, out: Output): Promise<void> {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  const zipSize = statSync(zipPath).size
  const startTime = Date.now()
  const { colors, isTTY, silent } = out

  if (isTTY) console.log()

  return new Promise((resolve, reject) => {
    let lastProgressPercent = -1

    if (process.platform === 'win32') {
      // Windows: 使用 PowerShell 解压
      const ps = spawn('powershell', [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
      ])

      const checkInterval = setInterval(() => {
        if (silent) return
        try {
          const extractedSize = getDirSize(destDir)
          const now = Date.now()
          const elapsed = (now - startTime) / 1000
          const estimatedTotal = zipSize * 3
          const progress = Math.min(extractedSize / estimatedTotal, 0.99)
          const speed = elapsed > 0 ? extractedSize / elapsed : 0
          const remaining = speed > 0 ? (estimatedTotal - extractedSize) / speed : 0

          if (isTTY) {
            out.clearLine()
            process.stdout.write(
              `  ${progressBar(progress, 30, colors.cyan, colors.reset)} ${colors.bright}${(progress * 100).toFixed(0)}%${colors.reset}\n` +
                `  ${ICONS.folder} ${formatSize(extractedSize)}  ` +
                `${ICONS.speed} ${colors.yellow}${formatSpeed(speed)}${colors.reset}  ` +
                `${ICONS.time} ${formatTime(elapsed)} / ${colors.dim}${formatTime(remaining)}${colors.reset}`,
            )
            process.stdout.write('\x1b[1A\r')
          } else {
            const currentPercent = Math.floor(progress * 5) * 20
            if (currentPercent > lastProgressPercent) {
              lastProgressPercent = currentPercent
              console.log(
                `  解压进度: ${currentPercent}%  ` +
                  `${formatSize(extractedSize)}  ` +
                  `速度 ${formatSpeed(speed)}  ` +
                  `${formatTime(elapsed)} / ${formatTime(remaining)}`,
              )
            }
          }
        } catch {
          // 忽略错误
        }
      }, 200)

      ps.on('close', (code) => {
        clearInterval(checkInterval)

        if (!silent) {
          const totalTime = (Date.now() - startTime) / 1000
          const finalSize = getDirSize(destDir)
          const avgSpeed = totalTime > 0 ? finalSize / totalTime : 0

          if (isTTY) {
            out.clearLine()
            console.log(
              `  ${progressBar(1, 30, colors.cyan, colors.reset)} ${colors.green}${colors.bright}100%${colors.reset}`,
            )
          }
          console.log(
            `  ${ICONS.check} ${colors.green}解压完成${colors.reset}  ` +
              `${formatSize(finalSize)}  ` +
              `${colors.dim}平均 ${formatSpeed(avgSpeed)}${colors.reset}  ` +
              `${colors.dim}耗时 ${formatTime(totalTime)}${colors.reset}`,
          )
        }

        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`PowerShell 解压失败，退出码: ${code}`))
        }
      })

      ps.on('error', (err) => {
        clearInterval(checkInterval)
        reject(err)
      })
    } else {
      // Unix: 使用 unzip
      const unzip = spawn('unzip', ['-o', zipPath, '-d', destDir])

      let fileCount = 0
      let lastUpdateTime = startTime

      unzip.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n')
        fileCount += lines.filter(
          (l) => l.includes('inflating:') || l.includes('extracting:'),
        ).length

        if (silent) return

        const now = Date.now()
        if (isTTY && now - lastUpdateTime >= 100) {
          const elapsed = (now - startTime) / 1000
          out.clearLine()
          process.stdout.write(
            `  ${ICONS.extract} 正在解压... ${colors.cyan}${fileCount}${colors.reset} 个文件  ` +
              `${ICONS.time} ${formatTime(elapsed)}`,
          )
          lastUpdateTime = now
        }
      })

      unzip.on('close', (code) => {
        if (!silent) {
          const totalTime = (Date.now() - startTime) / 1000
          const finalSize = getDirSize(destDir)

          if (isTTY) {
            out.clearLine()
            console.log(
              `  ${progressBar(1, 30, colors.cyan, colors.reset)} ${colors.green}${colors.bright}100%${colors.reset}`,
            )
          }
          console.log(
            `  ${ICONS.check} ${colors.green}解压完成${colors.reset}  ` +
              `${fileCount} 个文件  ` +
              `${formatSize(finalSize)}  ` +
              `${colors.dim}耗时 ${formatTime(totalTime)}${colors.reset}`,
          )
        }

        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`unzip 失败，退出码: ${code}`))
        }
      })

      unzip.on('error', reject)
    }
  })
}

// ============== 主函数 ==============

/**
 * 下载 Puppeteer 浏览器产物（默认 Chrome）
 *
 * 如果已安装则跳过下载，返回 `alreadyInstalled: true`。
 * 目录结构兼容 Puppeteer 缓存格式：`{cacheDir}/{browser}/{platform}-{version}/`
 */
export async function download(options: DownloadOptions = {}): Promise<DownloadResult> {
  const {
    mirrorBase = DEFAULT_MIRROR_BASE,
    cacheDir = DEFAULT_CACHE_DIR,
    browser = 'chrome',
    version: requestedVersion,
    silent = false,
  } = options

  if (!SUPPORTED_BROWSERS.includes(browser)) {
    throw new Error(`不支持的浏览器: ${browser}`)
  }

  const out = new Output(silent)
  const { colors } = out

  if (!silent) {
    console.log()
    console.log(
      `${colors.bright}${colors.cyan}  ${ICONS.chrome} Puppeteer Browser Downloader${colors.reset}`,
    )
    out.divider()
  }

  // 平台检测
  const platform = getPlatform()
  out.log(ICONS.info, `浏览器: ${colors.bright}${browser}${colors.reset}`)
  out.log(ICONS.info, `平台: ${colors.bright}${platform}${colors.reset}`)

  // 获取版本
  if (!requestedVersion) {
    out.log(ICONS.info, '正在获取最新稳定版信息...')
  }
  const version = requestedVersion || (await getStableVersion(mirrorBase))
  out.log(ICONS.check, `稳定版本: ${colors.bright}${colors.green}${version}${colors.reset}`)

  // 计算路径（兼容 Puppeteer 缓存结构）
  const installDir = join(cacheDir, browser, `${platform}-${version}`)
  const executablePath = resolveExecutablePath(installDir, browser, platform)

  // 检查是否已安装
  if (executablePath) {
    if (!silent) {
      console.log()
      out.log(ICONS.check, `${browser} 已安装`, colors.green)
      out.log(ICONS.folder, `${colors.dim}${executablePath}${colors.reset}`)
      console.log()
    }
    return { executablePath, version, platform, alreadyInstalled: true }
  }

  // 构建下载 URL
  const zipFileName = `${browser}-${platform}.zip`
  const downloadUrl = `${mirrorBase}/${version}/${platform}/${zipFileName}`

  // 临时目录
  const tempDir = join(installDir, '.temp')
  const zipPath = join(tempDir, zipFileName)

  try {
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true })
    }

    // 下载
    out.title(`${ICONS.download} 下载 ${browser}`)
    out.log(ICONS.info, `${colors.dim}${downloadUrl}${colors.reset}`)
    await downloadFile(downloadUrl, zipPath, out)

    // 解压
    out.title(`${ICONS.extract} 解压文件`)
    out.log(ICONS.folder, `${colors.dim}${installDir}${colors.reset}`)
    await extractZip(zipPath, installDir, out)

    // 验证
    const installedExecutablePath = resolveExecutablePath(installDir, browser, platform)
    if (!installedExecutablePath) {
      throw new Error(`${browser} 可执行文件不存在: ${installDir}`)
    }

    // Linux/macOS 添加执行权限
    if (process.platform !== 'win32') {
      chmodSync(installedExecutablePath, 0o755)
    }

    // 完成
    if (!silent) {
      console.log()
      out.divider()
      out.log(ICONS.success, `${colors.bright}${colors.green}${browser} 安装成功！${colors.reset}`)
      out.log(ICONS.folder, `${colors.dim}${installedExecutablePath}${colors.reset}`)
      console.log()
    }

    return {
      executablePath: installedExecutablePath,
      version,
      platform,
      alreadyInstalled: false,
    }
  } finally {
    // 清理临时文件
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }
}
