const { getNavBarLayout } = require('../../../utils/navbar')

const MODES = [
  { id: 'cool', name: '冷白', color: '#E8F1FF' },
  { id: 'neutral', name: '正白', color: '#FFFFFF' },
  { id: 'warm', name: '暖黄', color: '#FFE4B8' }
]

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    modes: MODES,
    modeId: 'neutral',
    color: '#FFFFFF',
    brightness: 0.9,
    brightnessPct: 90,
    controlsVisible: true
  },

  _prevBrightness: null,
  _restored: false,

  onLoad() {
    const app = getApp()
    const nav = (app && app.globalData && app.globalData.nav) || getNavBarLayout()
    if (app && app.globalData) app.globalData.nav = nav
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      navTotalHeight: nav.totalHeight
    })
    this.activateLight()
  },

  onShow() {
    this._restored = false
    this.activateLight()
  },

  onHide() {
    this.restoreScreen()
  },

  onUnload() {
    this.restoreScreen()
  },

  activateLight() {
    try {
      wx.setKeepScreenOn({ keepScreenOn: true })
    } catch (e) {
      /* ignore */
    }

    if (this._prevBrightness == null) {
      wx.getScreenBrightness({
        success: (res) => {
          this._prevBrightness = typeof res.value === 'number' ? res.value : 0.5
          this.applyBrightness(this.data.brightness)
        },
        fail: () => {
          this._prevBrightness = 0.5
          this.applyBrightness(this.data.brightness)
        }
      })
    } else {
      this.applyBrightness(this.data.brightness)
    }
  },

  applyBrightness(value) {
    const v = Math.min(1, Math.max(0.1, Number(value) || 0.9))
    try {
      wx.setScreenBrightness({ value: v })
    } catch (e) {
      /* ignore */
    }
  },

  restoreScreen() {
    if (this._restored) return
    this._restored = true
    try {
      wx.setKeepScreenOn({ keepScreenOn: false })
    } catch (e) {
      /* ignore */
    }
    if (typeof this._prevBrightness === 'number') {
      try {
        wx.setScreenBrightness({ value: this._prevBrightness })
      } catch (e) {
        /* ignore */
      }
    }
  },

  noop() {},

  onBack() {
    this.restoreScreen()
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/home/home' })
    })
  },

  onToggleControls() {
    this.setData({ controlsVisible: !this.data.controlsVisible })
  },

  onPickMode(e) {
    const id = e.currentTarget.dataset.id
    const mode = MODES.find((m) => m.id === id)
    if (!mode) return
    this.setData({ modeId: mode.id, color: mode.color })
  },

  onBrightnessChanging(e) {
    const pct = Math.round(Number(e.detail.value) || 10)
    const brightness = pct / 100
    this.setData({ brightness, brightnessPct: pct })
    this.applyBrightness(brightness)
  },

  onBrightnessChange(e) {
    this.onBrightnessChanging(e)
  }
})
