/**
 * 耶巴蒂训练日签卡：展示「已完成」动作列表
 */
const {
  loadMascot,
  getMascotMetrics,
  drawMascotOnCard,
  drawBrandFooter
} = require('./share-mascot')

const WIDTH = 750
const HEIGHT = 1000

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatDisplayDate(d) {
  const date = d || new Date()
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`
}

function normalizeDone(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => ({
      name: (item && item.name && String(item.name).trim()) || '未命名',
      sets: Math.max(0, Math.floor(Number(item && item.sets) || 0))
    }))
    .filter((item) => item.sets > 0 || item.name)
}

/**
 * @param {WechatMiniprogram.Canvas} canvas
 * @param {{
 *   doneActions?: Array<{ name?: string, sets?: number }>,
 *   dateLabel?: string,
 *   dpr?: number
 * }} opts
 * @returns {Promise<void>}
 */
function drawYebadiCard(canvas, opts) {
  const dpr = opts.dpr || 2
  const doneActions = normalizeDone(opts.doneActions)
  const dateLabel = opts.dateLabel || formatDisplayDate()
  const totalSets = doneActions.reduce((sum, item) => sum + item.sets, 0)
  const doneCount = doneActions.length

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
    ctx.fillText('耶巴蒂，莱维贝贝~', 72, 158)

    const metrics = mascot
      ? getMascotMetrics(HEIGHT, mascot)
      : getMascotMetrics(HEIGHT, null)
    if (mascot) drawMascotOnCard(ctx, mascot, WIDTH, HEIGHT)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#6B7280'
    ctx.font = '500 26px sans-serif'
    ctx.fillText('今日已完成', WIDTH / 2, 240)

    ctx.fillStyle = '#111827'
    ctx.font = '800 100px sans-serif'
    ctx.fillText(String(totalSets), WIDTH / 2, 360)

    ctx.fillStyle = '#6B7280'
    ctx.font = '500 28px sans-serif'
    ctx.fillText(`组 · ${doneCount} 个动作`, WIDTH / 2, 410)

    // 列表：限制在刷子安全区之上
    const listTop = 460
    const listBottom = metrics.contentBottom
    const rowH = 48
    const maxRows = Math.max(1, Math.floor((listBottom - listTop) / rowH))
    const rows = doneActions.slice(0, maxRows)
    const overflow = doneActions.length - rows.length

    ctx.textAlign = 'left'
    let y = listTop
    rows.forEach((item, idx) => {
      const label = `${idx + 1}. ${item.name}`
      ctx.fillStyle = '#1F2937'
      ctx.font = '500 28px sans-serif'
      // 名称过长截断
      let name = label
      while (ctx.measureText(name).width > WIDTH - 280 && name.length > 2) {
        name = `${name.slice(0, -2)}…`
      }
      ctx.fillText(name, 100, y)

      ctx.textAlign = 'right'
      ctx.fillStyle = '#6B7280'
      ctx.font = '500 26px sans-serif'
      ctx.fillText(`${item.sets} 组`, WIDTH - 100, y)
      ctx.textAlign = 'left'
      y += rowH
    })

    if (overflow > 0) {
      ctx.fillStyle = '#9CA3AF'
      ctx.font = '400 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`还有 ${overflow} 项…`, WIDTH / 2, Math.min(y + 8, listBottom))
    }

    drawBrandFooter(ctx, WIDTH, HEIGHT, dateLabel)
  })
}

module.exports = {
  drawYebadiCard,
  formatDisplayDate,
  WIDTH,
  HEIGHT
}
