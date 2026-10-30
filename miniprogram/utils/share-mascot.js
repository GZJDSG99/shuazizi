/**
 * 分享卡统一吉祥物「刷子」绘制
 */
const MASCOT_SRC = '/images/mascot-brush.png'

/** 相对卡片高度 */
const HEIGHT_RATIO = 0.24
const LEFT_PAD = 36
const BOTTOM_PAD = 118
/** 正文与刷子顶部的间距 */
const CONTENT_GAP = 24

/**
 * @param {WechatMiniprogram.Canvas} canvas
 * @returns {Promise<any|null>}
 */
function loadMascot(canvas) {
  return new Promise((resolve) => {
    try {
      if (!canvas || typeof canvas.createImage !== 'function') {
        resolve(null)
        return
      }
      const img = canvas.createImage()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = MASCOT_SRC
    } catch (e) {
      resolve(null)
    }
  })
}

/**
 * @param {number} cardH
 * @param {*} [img]
 */
function getMascotMetrics(cardH, img) {
  const iw = (img && img.width) || 1
  const ih = (img && img.height) || 1
  const h = cardH * HEIGHT_RATIO
  const w = (iw / ih) * h
  const y = cardH - BOTTOM_PAD - h
  return {
    x: LEFT_PAD,
    y,
    w,
    h,
    /** 正文最后一行 baseline 不得超过此值 */
    contentBottom: y - CONTENT_GAP
  }
}

/**
 * 在 [contentTop, contentBottom] 内排多行；超长则压缩字号
 * @returns {{ font: string, lineH: number, lines: string[], startY: number }}
 */
function layoutTextBlock(ctx, text, opts) {
  const {
    wrapLines,
    maxWidth,
    contentTop,
    contentBottom,
    preferredSize = 34,
    minSize = 22,
    weight = '500',
    lineRatio = 1.55
  } = opts

  const room = Math.max(40, contentBottom - contentTop)
  let size = preferredSize
  let font = `${weight} ${size}px sans-serif`
  let lineH = Math.round(size * lineRatio)
  let lines = wrapLines(ctx, text, maxWidth, font)

  while (size > minSize && lines.length * lineH > room) {
    size -= 2
    font = `${weight} ${size}px sans-serif`
    lineH = Math.round(size * lineRatio)
    lines = wrapLines(ctx, text, maxWidth, font)
  }

  // 仍超高：截断尾部，末行加省略
  const maxLines = Math.max(1, Math.floor(room / lineH))
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    const last = lines[maxLines - 1] || ''
    lines[maxLines - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : '…'
  }

  const blockH = Math.max(lineH, lines.length * lineH)
  let startY = (contentTop + contentBottom - blockH) / 2 + lineH * 0.75
  if (startY < contentTop) startY = contentTop
  const endY = startY + (lines.length - 1) * lineH
  if (endY > contentBottom) {
    startY = Math.max(contentTop, contentBottom - (lines.length - 1) * lineH)
  }

  return { font, lineH, lines, startY }
}

/**
 * 左下角站立
 */
function drawMascotOnCard(ctx, img, cardW, cardH) {
  if (!ctx || !img) return getMascotMetrics(cardH, null)
  try {
    const m = getMascotMetrics(cardH, img)
    const prev = ctx.globalAlpha
    ctx.globalAlpha = 0.92
    ctx.drawImage(img, m.x, m.y, m.w, m.h)
    ctx.globalAlpha = prev
    return m
  } catch (e) {
    return getMascotMetrics(cardH, null)
  }
}

/** 右下角：口号在上、日期在下 */
function drawBrandFooter(ctx, cardW, cardH, dateLabel) {
  const right = cardW - 72
  const sloganY = cardH - 118
  const dateY = cardH - 78

  ctx.textAlign = 'right'
  ctx.fillStyle = '#111827'
  ctx.font = '600 26px sans-serif'
  ctx.fillText('自爱·自由·自强', right, sloganY)

  ctx.fillStyle = '#9CA3AF'
  ctx.font = '400 22px sans-serif'
  ctx.fillText(String(dateLabel || ''), right, dateY)
}

module.exports = {
  MASCOT_SRC,
  loadMascot,
  getMascotMetrics,
  layoutTextBlock,
  drawMascotOnCard,
  drawBrandFooter
}
