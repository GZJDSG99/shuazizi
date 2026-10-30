const STORAGE_KEY = 'voice_records_v1'
const MAX_ITEMS = 50

function loadRaw() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (Array.isArray(raw)) return raw
  } catch (e) {
    /* ignore */
  }
  return []
}

function saveRaw(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, list)
  } catch (e) {
    /* ignore */
  }
}

function listRecords() {
  return loadRaw()
    .filter((item) => item && item.id && item.path)
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function addRecord(item) {
  const list = loadRaw()
  list.unshift(item)
  while (list.length > MAX_ITEMS) {
    const removed = list.pop()
    if (removed && removed.path) removeFile(removed.path)
  }
  saveRaw(list)
  return listRecords()
}

function updateRecord(id, patch) {
  const list = loadRaw()
  const idx = list.findIndex((item) => item.id === id)
  if (idx < 0) return listRecords()
  list[idx] = { ...list[idx], ...patch, id }
  saveRaw(list)
  return listRecords()
}

function removeRecord(id) {
  const list = loadRaw()
  const next = []
  list.forEach((item) => {
    if (item.id === id) {
      if (item.path) removeFile(item.path)
      return
    }
    next.push(item)
  })
  saveRaw(next)
  return listRecords()
}

function removeFile(path) {
  try {
    wx.getFileSystemManager().unlinkSync(path)
  } catch (e) {
    /* ignore */
  }
}

function ensureDir() {
  const dir = `${wx.env.USER_DATA_PATH}/records`
  try {
    wx.getFileSystemManager().accessSync(dir)
  } catch (e) {
    try {
      wx.getFileSystemManager().mkdirSync(dir, true)
    } catch (err) {
      /* ignore */
    }
  }
  return dir
}

function persistTempFile(tempFilePath, id) {
  ensureDir()
  const dest = `${wx.env.USER_DATA_PATH}/records/${id}.mp3`
  wx.getFileSystemManager().saveFileSync(tempFilePath, dest)
  return dest
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatTime(ts) {
  const d = new Date(ts || Date.now())
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

module.exports = {
  listRecords,
  addRecord,
  updateRecord,
  removeRecord,
  persistTempFile,
  formatDuration,
  formatTime
}
