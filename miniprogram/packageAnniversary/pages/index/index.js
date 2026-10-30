const anniversary = require('../../../utils/anniversary')
const { drawAnniversaryCard } = require('../../../utils/anniversary-share')
const { getNavBarLayout } = require('../../../utils/navbar')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    title: '我们相识',
    startDate: '',
    endDate: '',
    today: '',
    cardTemplate: anniversary.DEFAULT_TEMPLATE,
    nPlaceholder: '{n}',
    previewText: '请设置开始日期',
    rangeText: '',
    sharing: false,
    canShare: false
  },

  onLoad() {
    const app = getApp()
    const nav = (app && app.globalData && app.globalData.nav) || getNavBarLayout()
    if (app && app.globalData) app.globalData.nav = nav
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      navTotalHeight: nav.totalHeight,
      today: anniversary.todayStr()
    })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const state = anniversary.load()
    const endDate = state.endDate || anniversary.todayStr()
    const days = state.startDate ? anniversary.daysBetween(state.startDate, endDate) : null
    let previewText = '请设置开始日期'
    let canShare = false
    if (days !== null) {
      if (days < 1) previewText = '开始日期晚于结束日期'
      else {
        previewText = anniversary.applyTemplate(state.cardTemplate, days)
        canShare = true
      }
    }
    const rangeText = state.startDate
      ? `${state.startDate} → ${endDate}`
      : '选择相识的那一天'
    this.setData({
      title: state.title,
      startDate: state.startDate,
      endDate,
      cardTemplate: state.cardTemplate,
      today: anniversary.todayStr(),
      previewText,
      rangeText,
      canShare
    })
  },

  onShareCard() {
    if (this.data.sharing) return
    if (!this.data.canShare) {
      wx.showToast({ title: '请先设置开始日期', icon: 'none' })
      return
    }
    this.setData({ sharing: true })
    wx.createSelectorQuery()
      .select('#anniversaryShareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ sharing: false })
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        const canvas = res[0].node
        drawAnniversaryCard(canvas, {
          title: this.data.title,
          previewText: this.data.previewText,
          startDate: this.data.startDate,
          endDate: this.data.endDate,
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
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/home/home' })
    })
  },

  onEditTemplate() {
    wx.showModal({
      title: '卡片文案',
      editable: true,
      placeholderText: '今天是我们相识的第{n}天',
      content: this.data.cardTemplate,
      success: (res) => {
        if (!res.confirm) return
        try {
          const cardTemplate = anniversary.normalizeTemplate(res.content)
          anniversary.update({ cardTemplate })
          this.refresh()
          wx.showToast({ title: '已保存', icon: 'success' })
        } catch (e) {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  onStartChange(e) {
    const startDate = e.detail.value
    try {
      anniversary.update({ startDate })
      this.refresh()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onEndChange(e) {
    const endDate = e.detail.value
    try {
      anniversary.update({ endDate })
      this.refresh()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onUseToday() {
    try {
      anniversary.update({ endDate: anniversary.todayStr() })
      this.refresh()
      wx.showToast({ title: '已设为今天', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onClearStart() {
    wx.showModal({
      title: '清除开始日期',
      content: '确定清除吗？',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return
        try {
          anniversary.update({ startDate: '', endDate: '' })
          this.refresh()
        } catch (e) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
})
