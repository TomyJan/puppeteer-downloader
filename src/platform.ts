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

/** 获取 Chrome 可执行文件在解压目录中的相对路径 */
export function getExecutablePath(platform: string): string {
  switch (platform) {
    case 'win32':
    case 'win64':
      return `chrome-${platform}/chrome.exe`
    case 'mac-x64':
    case 'mac-arm64':
      return `chrome-${platform}/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
    case 'linux64':
      return `chrome-${platform}/chrome`
    default:
      throw new Error(`不支持的平台: ${platform}`)
  }
}
