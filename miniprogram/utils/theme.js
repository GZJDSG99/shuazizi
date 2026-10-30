const THEME_KEY = 'home_theme'

function getTheme() {
  try {
    const raw = wx.getStorageSync(THEME_KEY)
    if (raw === 'dark' || raw === 'light') return raw
  } catch (e) {
    /* ignore */
  }
  return 'light'
}

function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light'
  try {
    wx.setStorageSync(THEME_KEY, next)
  } catch (e) {
    /* ignore */
  }
  return next
}

function toggleTheme(current) {
  return setTheme(current === 'dark' ? 'light' : 'dark')
}

module.exports = {
  getTheme,
  setTheme,
  toggleTheme
}
