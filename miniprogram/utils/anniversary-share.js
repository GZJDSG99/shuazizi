/**
 * 纪念日分享卡（与今日一句同气质的竖版浅色母版）
 */
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

function toDotDate(str) {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/-/g, '.')
}

/**
 * @param {WechatMiniprogram.Canvas} canvas
 * @param {{
 *   title?: string,
 *   previewText: string,
 *   startDate?: string,
 *   endDate?: string,
 *   dpr?: number
 * }} opts
 * @returns {Promise<void>}
 */
function drawAnniversaryCard(canvas, opts) {
  const dpr = opts.dpr || 2
  const title = String(opts.title || '我们相识').trim() || '我们相识'
  const previewText = String(opts.previewText || '').trim()
  const start = toDotDate(opts.startDate)
  const end = toDotDate(opts.endDate)
  const rangeLabel = start && end ? `${start} → ${end}` : ''

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
    ctx.fillText('纪念日', 72, 158)

    const metrics = mascot
      ? getMascotMetrics(HEIGHT, mascot)
      : getMascotMetrics(HEIGHT, null)
    if (mascot) drawMascotOnCard(ctx, mascot, WIDTH, HEIGHT)

    ctx.fillStyle = '#6B7280'
    ctx.font = '500 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, WIDTH / 2, 250)

    const block = layoutTextBlock(ctx, previewText, {
      wrapLines,
      maxWidth: WIDTH - 120,
      contentTop: 290,
      contentBottom: metrics.contentBottom - (rangeLabel ? 40 : 0),
      preferredSize: 44,
      minSize: 28,
      weight: '700',
      lineRatio: 1.5
    })

    ctx.fillStyle = '#111827'
    ctx.font = block.font
    ctx.textAlign = 'center'
    let y = block.startY
    block.lines.forEach((ln) => {
      ctx.fillText(ln, WIDTH / 2, y)
      y += block.lineH
    })

    if (rangeLabel) {
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '400 24px sans-serif'
      const rangeY = Math.min(y + 28, metrics.contentBottom)
      ctx.fillText(rangeLabel, WIDTH / 2, rangeY)
    }

    drawBrandFooter(ctx, WIDTH, HEIGHT, end || '')
  })
}

module.exports = {
  drawAnniversaryCard,
  WIDTH,
  HEIGHT
}
