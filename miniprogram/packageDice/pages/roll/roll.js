const { getNavBarLayout } = require('../../../utils/navbar')

function randomFace() {
  return 1 + Math.floor(Math.random() * 6)
}

function makeFaces(count) {
  const n = Math.min(3, Math.max(1, count))
  const faces = []
  for (let i = 0; i < n; i++) faces.push(randomFace())
  return faces
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    diceCount: 1,
    countOptions: [1, 2, 3],
    faces: [1],
    rolling: false,
    shake: false
  },

  _timer: null,
  _tick: null,

  onLoad() {
    const app = getApp()
    const nav = (app && app.globalData && app.globalData.nav) || getNavBarLayout()
    if (app && app.globalData) app.globalData.nav = nav
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      navTotalHeight: nav.totalHeight,
      faces: makeFaces(1)
    })
  },

  onUnload() {
    this.clearTimers()
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/home/home' })
    })
  },

  onPickCount(e) {
    if (this.data.rolling) return
    const count = Number(e.currentTarget.dataset.count) || 1
    this.setData({
      diceCount: count,
      faces: makeFaces(count)
    })
  },

  onRoll() {
    if (this.data.rolling) return
    const count = this.data.diceCount
    this.clearTimers()
    this.setData({ rolling: true, shake: true })

    // 滚动过程中快速闪点
    this._tick = setInterval(() => {
      this.setData({ faces: makeFaces(count) })
    }, 80)

    this._timer = setTimeout(() => {
      clearInterval(this._tick)
      this._tick = null
      const faces = makeFaces(count)
      this.setData({
        faces,
        rolling: false,
        shake: false
      })
      try {
        wx.vibrateShort({ type: 'medium' })
      } catch (e) {
        /* ignore */
      }
    }, 900)
  },

  clearTimers() {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
    if (this._tick) {
      clearInterval(this._tick)
      this._tick = null
    }
  }
})
