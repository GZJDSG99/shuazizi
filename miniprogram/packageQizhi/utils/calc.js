function toCents(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

function fromCents(cents) {
  if (cents === null || cents === undefined) return null
  return Math.round(cents) / 100
}

function itemDiff(item) {
  const e = toCents(item && item.estimated)
  const a = toCents(item && item.actual)
  if (e === null || a === null) return null
  return fromCents(a - e)
}

function sumItems(items) {
  let estimatedCents = 0
  let actualCents = 0
  let hasEstimated = false
  let hasActual = false

  ;(items || []).forEach((item) => {
    const e = toCents(item.estimated)
    const a = toCents(item.actual)
    if (e !== null) {
      estimatedCents += e
      hasEstimated = true
    }
    if (a !== null) {
      actualCents += a
      hasActual = true
    }
  })

  const estimated = hasEstimated ? fromCents(estimatedCents) : 0
  const actual = hasActual ? fromCents(actualCents) : 0
  let diff = null
  if (hasEstimated || hasActual) {
    diff = fromCents(actualCents - estimatedCents)
  }

  return { estimated, actual, diff, hasEstimated, hasActual }
}

function sumCategory(items, categoryId) {
  const filtered = (items || []).filter((item) => item.categoryId === categoryId)
  return sumItems(filtered)
}

function sumAll(items) {
  return sumItems(items)
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const fixed = Math.round(n * 100) / 100
  return fixed.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

function formatDiff(value) {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  const abs = formatMoney(Math.abs(n))
  return n > 0 ? `超支 ${abs}` : `结余 ${abs}`
}

function diffClass(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'diff-zero'
  const n = Number(value)
  if (n > 0) return 'diff-over'
  if (n < 0) return 'diff-save'
  return 'diff-zero'
}

module.exports = {
  itemDiff,
  sumCategory,
  sumAll,
  formatMoney,
  formatDiff,
  diffClass,
  toCents,
  fromCents
}
