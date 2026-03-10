export interface Colors {
  reset: string
  bright: string
  dim: string
  green: string
  yellow: string
  cyan: string
}

/** 根据 TTY 环境创建颜色常量 */
export function createColors(isTTY: boolean): Colors {
  if (isTTY) {
    return {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      cyan: '\x1b[36m',
    }
  }
  return { reset: '', bright: '', dim: '', green: '', yellow: '', cyan: '' }
}

export const ICONS = {
  chrome: '🌐',
  download: '⬇️ ',
  extract: '📦',
  check: '✅',
  info: 'ℹ️ ',
  folder: '📁',
  time: '⏱️ ',
  speed: '⚡',
  success: '🎉',
  warning: '⚠️ ',
}

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** 格式化速度 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}

/** 格式化时间 */
export function formatTime(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/** 生成进度条 */
export function progressBar(
  progress: number,
  width: number = 30,
  color: string = '',
  reset: string = '',
): string {
  const filled = Math.round(width * progress)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${color}${bar}${reset}`
}
