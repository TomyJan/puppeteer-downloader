import type { SupportedBrowser } from './types'

/** 获取当前平台标识 */
export function getPlatform(): string {
  const platform = process.platform
  const arch = process.arch

  if (platform === 'win32') {
    return arch === 'x64' ? 'win64' : 'win32'
  } else if (platform === 'darwin') {
    return arch === 'arm64' ? 'mac-arm64' : 'mac-x64'
  } else if (platform === 'linux') {
    return 'linux64'
  }

  throw new Error(`不支持的平台: ${platform} ${arch}`)
}

/** 获取解压目录中可能的可执行文件相对路径（按优先级） */
export function getExecutableCandidates(
  browser: SupportedBrowser,
  platform: string,
): string[] {
  if (browser === 'chrome') {
    switch (platform) {
      case 'win32':
      case 'win64':
        return [`chrome-${platform}/chrome.exe`]
      case 'mac-x64':
      case 'mac-arm64':
        return [
          `chrome-${platform}/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
        ]
      case 'linux64':
        return [`chrome-${platform}/chrome`]
      default:
        throw new Error(`不支持的平台: ${platform}`)
    }
  }

  if (browser === 'chrome-headless-shell') {
    switch (platform) {
      case 'win32':
      case 'win64':
        return [`chrome-headless-shell-${platform}/chrome-headless-shell.exe`]
      case 'mac-x64':
      case 'mac-arm64':
        return [`chrome-headless-shell-${platform}/chrome-headless-shell`]
      case 'linux64':
        return [`chrome-headless-shell-${platform}/chrome-headless-shell`]
      default:
        throw new Error(`不支持的平台: ${platform}`)
    }
  }

  if (browser === 'chromedriver') {
    switch (platform) {
      case 'win32':
      case 'win64':
        return [`chromedriver-${platform}/chromedriver.exe`]
      case 'mac-x64':
      case 'mac-arm64':
      case 'linux64':
        return [`chromedriver-${platform}/chromedriver`]
      default:
        throw new Error(`不支持的平台: ${platform}`)
    }
  }

  // Firefox 的产物在不同版本可能有细微差异，按常见路径顺序尝试。
  switch (platform) {
    case 'win32':
    case 'win64':
      return [
        `firefox-${platform}/firefox/firefox.exe`,
        `firefox-${platform}/firefox.exe`,
      ]
    case 'mac-x64':
    case 'mac-arm64':
      return [
        `firefox-${platform}/Firefox Nightly.app/Contents/MacOS/firefox`,
        `firefox-${platform}/Firefox.app/Contents/MacOS/firefox`,
      ]
    case 'linux64':
      return [`firefox-${platform}/firefox/firefox`, `firefox-${platform}/firefox`]
    default:
      throw new Error(`不支持的平台: ${platform}`)
  }
}
