const KEY = 'tool_anniversary_v1'
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_TEMPLATE = '今天是我们相识的第{n}天'

function pad(n) {
  return n < 10 ? `0${n}` : String(n)
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function todayStr() {
  return formatDate(new Date())
}

function parseDate(str) {
  if (!str || typeof str !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null
  return dt
}

/** 相识第 N 天：含开始日当天为第 1 天 */
function daysBetween(startStr, endStr) {
  const start = parseDate(startStr)
  const end = parseDate(endStr || todayStr())
  if (!start || !end) return null
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return Math.floor((b - a) / DAY_MS) + 1
}

function normalizeTemplate(str) {
  const t = (str && String(str).trim()) || DEFAULT_TEMPLATE
  return t.slice(0, 40)
}

/** 用天数替换模板中的 {n} / {N} */
function applyTemplate(template, days) {
  const raw = normalizeTemplate(template)
  const n = String(days)
  if (raw.includes('{n}') || raw.includes('{N}')) {
    return raw.replace(/\{n\}/gi, n)
  }
  // 没有占位符时，默认接到文案后面，避免只剩固定字
  return `${raw}${n}`
}

function defaultState() {
  return {
    version: 1,
    title: '我们相识',
    startDate: '',
    endDate: '',
    cardTemplate: DEFAULT_TEMPLATE,
    updatedAt: Date.now()
  }
}

function load() {
  try {
    const raw = wx.getStorageSync(KEY)
    if (!raw || typeof raw !== 'object') {
      const fresh = defaultState()
      save(fresh)
      return fresh
    }
    return {
      version: 1,
      title: (raw.title && String(raw.title).trim()) || '我们相识',
      startDate: parseDate(raw.startDate) ? raw.startDate : '',
      endDate: parseDate(raw.endDate) ? raw.endDate : '',
      cardTemplate: normalizeTemplate(raw.cardTemplate),
      updatedAt: raw.updatedAt || Date.now()
    }
  } catch (e) {
    return defaultState()
  }
}

function save(state) {
  const next = {
    version: 1,
    title: (state.title && String(state.title).trim()) || '我们相识',
    startDate: parseDate(state.startDate) ? state.startDate : '',
    endDate: parseDate(state.endDate) ? state.endDate : '',
    cardTemplate: normalizeTemplate(state.cardTemplate),
    updatedAt: Date.now()
  }
  wx.setStorageSync(KEY, next)
  return next
}

function update(partial) {
  return save({ ...load(), ...partial })
}

function homeDesc() {
  const state = load()
  if (!state.startDate) return '设置相识纪念日'
  const days = daysBetween(state.startDate, todayStr())
  if (days === null) return '设置相识纪念日'
  if (days < 1) return '开始日期在今天之后'
  return applyTemplate(state.cardTemplate, days)
}

module.exports = {
  KEY,
  DEFAULT_TEMPLATE,
  todayStr,
  formatDate,
  parseDate,
  daysBetween,
  applyTemplate,
  normalizeTemplate,
  load,
  save,
  update,
  homeDesc
}
