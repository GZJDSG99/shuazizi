/**
 * 来财日签分享卡（竖版浅色母版，与今日一句/纪念日同气质）
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

/**
 * @param {WechatMiniprogram.Canvas} canvas
 * @param {{ title: string, line: string, dateLabel?: string, dpr?: number }} opts
 * @returns {Promise<void>}
 */
function drawCaicaiCard(canvas, opts) {
  const dpr = opts.dpr || 2
  const title = String(opts.title || '招财进宝').trim()
  const line = String(opts.line || '').trim()
  const dateLabel = opts.dateLabel || ''

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
    ctx.fillText('今日招财签', 72, 158)

    const metrics = mascot
      ? getMascotMetrics(HEIGHT, mascot)
      : getMascotMetrics(HEIGHT, null)
    if (mascot) drawMascotOnCard(ctx, mascot, WIDTH, HEIGHT)

    ctx.fillStyle = '#B91C1C'
    ctx.font = '700 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, WIDTH / 2, 280)

    const block = layoutTextBlock(ctx, line, {
      wrapLines,
      maxWidth: WIDTH - 144,
      contentTop: 320,
      contentBottom: metrics.contentBottom,
      preferredSize: 32,
      minSize: 22,
      weight: '500',
      lineRatio: 1.55
    })

    ctx.fillStyle = '#1F2937'
    ctx.font = block.font
    ctx.textAlign = 'center'
    let y = block.startY
    block.lines.forEach((ln) => {
      ctx.fillText(ln, WIDTH / 2, y)
      y += block.lineH
    })

    drawBrandFooter(ctx, WIDTH, HEIGHT, dateLabel)
  })
}

module.exports = {
  drawCaicaiCard,
  WIDTH,
  HEIGHT
}
