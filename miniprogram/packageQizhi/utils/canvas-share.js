const calc = require('./calc')
const storage = require('./storage')

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDiffShort(value) {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  const abs = calc.formatMoney(Math.abs(n))
  return n > 0 ? `+${abs}` : `-${abs}`
}

function diffColor(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '#888888'
  const n = Number(value)
  if (n > 0) return '#c0392b'
  if (n < 0) return '#1a7f4b'
  return '#888888'
}

/**
 * 从账本数据组装绘制用的分区：分类头 + 明细项
 */
function buildSections(budget) {
  const categories = storage.sortByOrder((budget && budget.categories) || [])
  const items = (budget && budget.items) || []
  return categories.map((cat) => {
    const catItems = storage.sortByOrder(items.filter((item) => item.categoryId === cat.id))
    const sub = calc.sumCategory(items, cat.id)
    return {
      name: cat.name,
      estimated: sub.estimated,
      actual: sub.actual,
      diff: sub.diff,
      items: catItems.map((item) => ({
        name: item.name,
        brandSpec: item.brandSpec || '',
        estimated: item.estimated,
        actual: item.actual,
        diff: calc.itemDiff(item)
      }))
    }
  })
}

/**
 * 绘制「总览 + 分类小计 + 各类明细」长图
 */
function drawSummaryImage(canvas, opts) {
  const dpr = opts.dpr || 2
  const width = 750
  const headerH = 280
  const colHeaderH = 44
  const sectionH = 72
  const itemH = 64
  const itemSubExtra = 28
  const emptyH = 52
  const footerH = 80
  const sections = opts.sections || []

  let bodyH = 0
  sections.forEach((sec) => {
    bodyH += sectionH + colHeaderH
    if (!sec.items.length) {
      bodyH += emptyH
    } else {
      sec.items.forEach((item) => {
        bodyH += itemH + (item.brandSpec ? itemSubExtra : 0)
      })
    }
  })

  const height = Math.max(headerH + footerH + 40, headerH + bodyH + footerH + 40)

  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // header
  ctx.fillStyle = '#1e4a8c'
  ctx.fillRect(0, 0, width, 140)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 40px sans-serif'
  ctx.textAlign = 'center'
  const title = truncate(opts.title || '清单', 16)
  ctx.fillText(title, width / 2, 62)
  ctx.font = '24px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText('单位：人民币（元） · 预估与实际', width / 2, 104)

  // summary
  ctx.fillStyle = '#eef3fb'
  ctx.fillRect(0, 140, width, 100)
  const total = opts.total || { estimated: 0, actual: 0, diff: null }
  const cols = [
    { label: '预估合计', value: calc.formatMoney(total.estimated), color: '#222222' },
    { label: '实际合计', value: calc.formatMoney(total.actual), color: '#222222' },
    {
      label: '差额',
      value: formatDiffShort(total.diff),
      color: diffColor(total.diff)
    }
  ]
  cols.forEach((col, i) => {
    const x = (width / 3) * i + width / 6
    ctx.fillStyle = '#666666'
    ctx.font = '22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(col.label, x, 178)
    ctx.fillStyle = col.color
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText(col.value, x, 220)
  })

  ctx.fillStyle = '#888888'
  ctx.font = '22px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(
    `生成日期：${formatDate(new Date())}  ·  ${sections.length} 类  ${opts.itemCount || 0} 项`,
    32,
    268
  )

  let y = headerH
  sections.forEach((sec) => {
    // category header
    ctx.fillStyle = '#eef3fb'
    ctx.fillRect(0, y, width, sectionH)
    ctx.fillStyle = '#1e4a8c'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(truncate(sec.name, 14), 32, y + 46)

    ctx.font = '22px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#555555'
    ctx.fillText(
      `估 ${calc.formatMoney(sec.estimated)}  实 ${calc.formatMoney(sec.actual)}`,
      width - 140,
      y + 46
    )
    ctx.fillStyle = diffColor(sec.diff)
    ctx.fillText(formatDiffShort(sec.diff), width - 32, y + 46)
    y += sectionH

    // column titles
    ctx.fillStyle = '#f5f7fb'
    ctx.fillRect(0, y, width, colHeaderH)
    ctx.fillStyle = '#999999'
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('项目', 48, y + 30)
    ctx.textAlign = 'right'
    ctx.fillText('预估', width - 280, y + 30)
    ctx.fillText('实际', width - 160, y + 30)
    ctx.fillText('差额', width - 32, y + 30)
    y += colHeaderH

    if (!sec.items.length) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, y, width, emptyH)
      ctx.fillStyle = '#bbbbbb'
      ctx.font = '22px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('（暂无项目）', 48, y + 34)
      y += emptyH
      return
    }

    sec.items.forEach((item, index) => {
      const rowHeight = itemH + (item.brandSpec ? itemSubExtra : 0)
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#fafbfc'
      ctx.fillRect(0, y, width, rowHeight)

      ctx.strokeStyle = '#f0f2f5'
      ctx.beginPath()
      ctx.moveTo(0, y + rowHeight)
      ctx.lineTo(width, y + rowHeight)
      ctx.stroke()

      ctx.fillStyle = '#222222'
      ctx.font = '26px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(truncate(item.name, 16), 48, y + 38)

      if (item.brandSpec) {
        ctx.fillStyle = '#999999'
        ctx.font = '20px sans-serif'
        ctx.fillText(truncate(item.brandSpec, 22), 48, y + 66)
      }

      ctx.font = '24px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = '#555555'
      ctx.fillText(calc.formatMoney(item.estimated), width - 280, y + 38)
      ctx.fillText(calc.formatMoney(item.actual), width - 160, y + 38)
      ctx.fillStyle = diffColor(item.diff)
      ctx.fillText(formatDiffShort(item.diff), width - 32, y + 38)

      y += rowHeight
    })
  })

  ctx.fillStyle = '#aaaaaa'
  ctx.font = '22px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('由「掐指一算」小程序生成', width / 2, height - 32)

  return { width, height }
}

function truncate(text, max) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

module.exports = {
  drawSummaryImage,
  buildSections
}
