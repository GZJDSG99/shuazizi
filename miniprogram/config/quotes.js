/**
 * 首页语录（单独维护）
 * 新增：在 QUOTES 数组末尾追加一行字符串即可。
 */
const QUOTES = [
  '学会爱自己，是终身浪漫的开始。',
  '当你真的喜欢一个人的时候其实很多感觉是不需要别人告诉你的。',
  '两个人之间还是需要有一点缝隙和空间。这不是在逃避另一个人，也不代表我不爱你，而是每个人都需要有完全属于自己的时间。',
  '一段感情的价值不应该只用两个人有没有走到一起去判断。有些人只是陪你走了一段路但那段路它确实存在，那段快乐和痛苦都是真的，而你因为他发生过的改变也是真的。',
  '在成为谁的男朋友、女朋友之前，我们首先都是一个独立的人。这个世界上真正能陪你走到最后的人，其实只有你自己。',
  '我希望你留在我身边，不是因为没有你我就活不下去了，而是我一个人也可以继续生活，我也可以照顾好我自己，也可以往前继续走，但是我还是希望那路上有你。',
  '允许自己有些事情就是做不好，允许别人不喜欢你，允许自己去嫉妒别人，允许自己偶尔什么都不想做，放弃我本来就应该成为谁的这个念头，接受有些选择就是选错了，别用别人的进度条来衡量自己，允许一些问题永远都没有答案，接受人生不会一直向上，放过那个一直想把自己变得更好的人。'
]

const DAY_KEY = 'home_quote_day'
const INDEX_KEY = 'home_quote_today_index'

function getQuoteList() {
  return QUOTES.filter((q) => q && String(q).trim())
}

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

/** 按日期稳定取索引，同日首次打开一致 */
function daySeedIndex(day, len) {
  if (!len) return 0
  let h = 0
  for (let i = 0; i < day.length; i++) {
    h = (h * 31 + day.charCodeAt(i)) >>> 0
  }
  return h % len
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
  writeTodayIndex(day, index)
  return { day, index }
}

function writeTodayIndex(day, index) {
  try {
    wx.setStorageSync(DAY_KEY, day)
    wx.setStorageSync(INDEX_KEY, index)
  } catch (e) {
    /* ignore */
  }
}

/** 今日一句（同日固定，跨日换新） */
function getTodayQuote() {
  const list = getQuoteList()
  if (!list.length) return ''
  const { index } = readTodayIndex(list)
  return list[index]
}

/** 换一句，仍记为今日 */
function refreshTodayQuote() {
  const list = getQuoteList()
  if (!list.length) return ''
  const { day, index: last } = readTodayIndex(list)
  let index = Math.floor(Math.random() * list.length)
  if (list.length > 1 && index === last) {
    index = (index + 1) % list.length
  }
  writeTodayIndex(day, index)
  return list[index]
}

/** @deprecated 兼容旧调用，等同 getTodayQuote */
function getDefaultQuote() {
  return getTodayQuote()
}

/** @deprecated 兼容旧调用，等同 refreshTodayQuote */
function getRandomQuote() {
  return refreshTodayQuote()
}

module.exports = {
  QUOTES,
  getQuoteList,
  getTodayQuote,
  refreshTodayQuote,
  getDefaultQuote,
  getRandomQuote,
  todayStr,
  formatDisplayDate
}
