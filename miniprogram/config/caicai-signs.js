/**
 * 来财 · 今日招财签
 * 新增：在 SIGNS 末尾追加 { title, line }
 */
const SIGNS = [
  { title: '招财进宝', line: '财气东来，诸事顺遂。今天适合把该收的收好。' },
  { title: '好运常在', line: '你认真过的每一天，都在替未来铺路。' },
  { title: '稳中有进', line: '不急不躁，钱会认得努力的人。' },
  { title: '贵人相助', line: '开口问问，也许好运就在一句闲聊里。' },
  { title: '心想事成', line: '先把一件小事做成，好运会跟着来。' },
  { title: '福至心灵', line: '照顾好自己，就是最大的生财之道。' },
  { title: '开运聚财', line: '今日宜清桌面、清心事，空间腾出来财就进来。' },
  { title: '喜从天降', line: '意外的小确幸，记得笑着收下。' },
  { title: '财源广进', line: '多一条路就多一份可能，今天适合打听新机会。' },
  { title: '平安是福', line: '账目清楚，身心安稳，才是真富足。' }
]

const DAY_KEY = 'caicai_sign_day'
const INDEX_KEY = 'caicai_sign_index'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function todayStr(d) {
  const date = d || new Date()
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatDisplayDate(d) {
  const date = d || new Date()
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`
}

function daySeedIndex(day, len) {
  if (!len) return 0
  let h = 0
  for (let i = 0; i < day.length; i++) {
    h = (h * 31 + day.charCodeAt(i)) >>> 0
  }
  return h % len
}

function getSignList() {
  return SIGNS.filter((s) => s && s.title && s.line)
}

function writeToday(day, index) {
  try {
    wx.setStorageSync(DAY_KEY, day)
    wx.setStorageSync(INDEX_KEY, index)
  } catch (e) {
    /* ignore */
  }
}

function readTodayIndex(list) {
  const day = todayStr()
  try {
    const savedDay = wx.getStorageSync(DAY_KEY)
    const savedIdx = wx.getStorageSync(INDEX_KEY)
    if (
      savedDay === day &&
      typeof savedIdx === 'number' &&
      savedIdx >= 0 &&
      savedIdx < list.length
    ) {
      return { day, index: savedIdx }
    }
  } catch (e) {
    /* ignore */
  }
  const index = daySeedIndex(day, list.length)
  writeToday(day, index)
  return { day, index }
}

function getTodaySign() {
  const list = getSignList()
  if (!list.length) return null
  const { index } = readTodayIndex(list)
  return { ...list[index], dateLabel: formatDisplayDate() }
}

/** 同日换一支签，仍记为今日 */
function refreshTodaySign() {
  const list = getSignList()
  if (!list.length) return null
  const { day, index: last } = readTodayIndex(list)
  let index = Math.floor(Math.random() * list.length)
  if (list.length > 1 && index === last) {
    index = (index + 1) % list.length
  }
  writeToday(day, index)
  return { ...list[index], dateLabel: formatDisplayDate() }
}

module.exports = {
  SIGNS,
  getTodaySign,
  refreshTodaySign,
  todayStr,
  formatDisplayDate
}
