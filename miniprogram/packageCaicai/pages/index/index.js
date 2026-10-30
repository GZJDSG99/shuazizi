const { getTodaySign, refreshTodaySign } = require('../../../config/caicai-signs')
const { drawCaicaiCard } = require('../../../utils/caicai-share')
const { getNavBarLayout } = require('../../../utils/navbar')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    title: '',
    line: '',
    dateLabel: '',
    sharing: false,
    reveal: false
  },

  onLoad() {
    const app = getApp()
    const nav = (app && app.globalData && app.globalData.nav) || getNavBarLayout()
    if (app && app.globalData) app.globalData.nav = nav
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      navTotalHeight: nav.totalHeight
    })
    this.applySign(getTodaySign())
    setTimeout(() => this.setData({ reveal: true }), 40)
  },

  onShow() {
    this.applySign(getTodaySign())
  },

  applySign(sign) {
    if (!sign) return
    this.setData({
      title: sign.title,
      line: sign.line,
      dateLabel: sign.dateLabel || ''
    })
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/home/home' })
    })
  },

  onRefreshSign() {
    this.setData({ reveal: false })
    const sign = refreshTodaySign()
    this.applySign(sign)
    setTimeout(() => this.setData({ reveal: true }), 30)
    try {
      wx.vibrateShort({ type: 'light' })
    } catch (e) {
      /* ignore */
    }
  },

  onShareCard() {
    if (this.data.sharing || !this.data.title) return
    this.setData({ sharing: true })
    wx.createSelectorQuery()
      .select('#caicaiShareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ sharing: false })
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        const canvas = res[0].node
        drawCaicaiCard(canvas, {
          title: this.data.title,
          line: this.data.line,
          dateLabel: this.data.dateLabel,
          dpr: wx.getSystemInfoSync().pixelRatio || 2
        })
          .then(() => {
            wx.canvasToTempFilePath({
              canvas,
              success: (fileRes) => {
                this.setData({ sharing: false })
                this.presentShare(fileRes.tempFilePath)
              },
              fail: () => {
                this.setData({ sharing: false })
                wx.showToast({ title: '生成图片失败', icon: 'none' })
              }
            })
          })
          .catch(() => {
            this.setData({ sharing: false })
            wx.showToast({ title: '绘制失败', icon: 'none' })
          })
      })
  },

  presentShare(path) {
    if (wx.showShareImageMenu) {
      wx.showShareImageMenu({
        path,
        fail: () => this.fallbackShare(path)
      })
      return
    }
    this.fallbackShare(path)
  },

  fallbackShare(path) {
    wx.showActionSheet({
      itemList: ['保存到相册', '预览图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.saveImageToPhotosAlbum({
            filePath: path,
            success: () => wx.showToast({ title: '已保存', icon: 'success' }),
            fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
          })
        } else if (res.tapIndex === 1) {
          wx.previewImage({ urls: [path], current: path })
        }
      }
    })
  }
})
