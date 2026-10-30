const MODE_KEY = 'home_tools_view_mode'
const BOX_TIP_KEY = 'toy_box_tip_seen'

function getViewMode() {
  try {
    const raw = wx.getStorageSync(MODE_KEY)
    if (raw === 'box' || raw === 'list') return raw
  } catch (e) {
    /* ignore */
  }
  return 'box'
}

function setViewMode(mode) {
  const next = mode === 'box' ? 'box' : 'list'
  try {
    wx.setStorageSync(MODE_KEY, next)
  } catch (e) {
    /* ignore */
  }
  return next
}

function toggleViewMode(current) {
  return setViewMode(current === 'box' ? 'list' : 'box')
}

function hasSeenBoxTip() {
  try {
    return !!wx.getStorageSync(BOX_TIP_KEY)
  } catch (e) {
    return false
  }
}

function markBoxTipSeen() {
  try {
    wx.setStorageSync(BOX_TIP_KEY, 1)
  } catch (e) {
    /* ignore */
  }
}

module.exports = {
  getViewMode,
  setViewMode,
  toggleViewMode,
  hasSeenBoxTip,
  markBoxTipSeen
}
