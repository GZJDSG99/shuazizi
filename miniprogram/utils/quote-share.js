/**
 * 今日一句日签卡（竖版浅色母版，朋友圈友好）
 */
const { formatDisplayDate } = require('../config/quotes')
const {
  loadMascot,
  getMascotMetrics,
  layoutTextBlock,
  drawMascotOnCard,
  drawBrandFooter
} = require('./share-mascot')

const WIDTH = 750
const HEIGHT = 1000

function wrapLines(ctx, text, maxWidth, font) {
  ctx.font = font
  const chars = String(text || '').split('')
  const lines = []
  let line = ''
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = chars[i]
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * @param {WechatMiniprogram.Canvas} canvas
 * @param {{ quote: string, dpr?: number, dateLabel?: string }} opts
 * @returns {Promise<void>}
 */
function drawQuoteCard(canvas, opts) {
  const dpr = opts.dpr || 2
  const quote = String(opts.quote || '').trim()
  const dateLabel = opts.dateLabel || formatDisplayDate()

  return loadMascot(canvas).then((mascot) => {
    canvas.width = WIDTH * dpr
    canvas.height = HEIGHT * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#F7F6F3'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    ctx.strokeStyle = 'rgba(17, 24, 39, 0.06)'
    ctx.lineWidth = 2
    ctx.strokeRect(36, 36, WIDTH - 72, HEIGHT - 72)

    ctx.fillStyle = '#111827'
    ctx.font = '600 36px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('刷子zi', 72, 120)

    ctx.fillStyle = '#9CA3AF'
    ctx.font = '400 22px sans-serif'
    ctx.fillText('今日一句', 72, 158)

    const metrics = mascot
      ? getMascotMetrics(HEIGHT, mascot)
      : getMascotMetrics(HEIGHT, null)
    if (mascot) drawMascotOnCard(ctx, mascot, WIDTH, HEIGHT)

    ctx.fillStyle = 'rgba(17, 24, 39, 0.12)'
    ctx.font = '700 96px serif'
    ctx.fillText('“', 56, 250)

    const block = layoutTextBlock(ctx, quote, {
      wrapLines,
      maxWidth: WIDTH - 144,
      contentTop: 270,
      contentBottom: metrics.contentBottom,
      preferredSize: 34,
      minSize: 22,
      weight: '500',
      lineRatio: 1.55
    })

    ctx.fillStyle = '#1F2937'
    ctx.font = block.font
    ctx.textAlign = 'left'
    let y = block.startY
    block.lines.forEach((ln) => {
      ctx.fillText(ln, 72, y)
      y += block.lineH
    })

    drawBrandFooter(ctx, WIDTH, HEIGHT, dateLabel)
  })
}

module.exports = {
  drawQuoteCard,
  WIDTH,
  HEIGHT
}
