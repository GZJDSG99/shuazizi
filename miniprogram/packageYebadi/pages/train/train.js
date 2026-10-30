const storage = require('../../utils/storage')
const { drawYebadiCard, formatDisplayDate } = require('../../../utils/yebadi-share')
const { getNavBarLayout } = require('../../../utils/navbar')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    actionName: '当前动作',
    restSeconds: 60,
    sets: 0,
    doneActions: [],
    presets: storage.PRESETS,
    resting: false,
    remainSec: 0,
    remainText: '0',
    canShare: false,
    sharing: false
  },

  _timer: null,
  _endsAt: 0,

  onLoad() {
    const app = getApp()
    const nav = (app && app.globalData && app.globalData.nav) || getNavBarLayout()
    if (app && app.globalData) app.globalData.nav = nav
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      navTotalHeight: nav.totalHeight
    })
    this.hydrate()
  },

  onShow() {
    if (!this._endsAt) return
    this.tickRest()
    if (this._endsAt && !this._timer) {
      this._timer = setInterval(() => this.tickRest(), 250)
    }
  },

  onHide() {
    this.clearTimer()
  },

  onUnload() {
    this.clearTimer()
  },

  hydrate() {
    const state = storage.load()
    const sets = state.sets || 0
    const doneActions = state.doneActions || []
    this.setData({
      actionName: state.actionName,
      restSeconds: state.restSeconds,
      sets,
      doneActions,
      canShare: doneActions.length > 0
    })
  },

  syncShareFlag(doneActions) {
    const list = doneActions == null ? this.data.doneActions : doneActions
    this.setData({ canShare: !!(list && list.length > 0) })
  },

  onShareToday() {
    if (this.data.sharing) return
    if (!this.data.canShare) {
      wx.showToast({ title: '先添加已完成动作', icon: 'none' })
      return
    }
    this.setData({ sharing: true })
    wx.createSelectorQuery()
      .select('#yebadiShareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ sharing: false })
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        const canvas = res[0].node
        drawYebadiCard(canvas, {
          doneActions: this.data.doneActions || [],
          dateLabel: formatDisplayDate(),
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

  onAddDone() {
    if (this.data.resting) return
    const defaultName = this.data.actionName === '当前动作' ? '' : this.data.actionName
    const defaultSets = this.data.sets > 0 ? String(this.data.sets) : '4'
    wx.showModal({
      title: '已完成动作',
      editable: true,
      placeholderText: '例如：深蹲',
      content: defaultName,
      success: (res) => {
        if (!res.confirm) return
        const name = (res.content || '').trim()
        if (!name) {
          wx.showToast({ title: '请填写动作名', icon: 'none' })
          return
        }
        wx.showModal({
          title: '完成组数',
          editable: true,
          placeholderText: '组数',
          content: defaultSets,
          success: (setsRes) => {
            if (!setsRes.confirm) return
            const sets = Math.max(0, Math.floor(Number(setsRes.content) || 0))
            try {
              const state = storage.addDoneAction(name, sets)
              this.setData({ doneActions: state.doneActions })
              this.syncShareFlag(state.doneActions)
              wx.showToast({ title: '已添加', icon: 'success' })
            } catch (e) {
              wx.showToast({ title: '保存失败', icon: 'none' })
            }
          }
        })
      }
    })
  },

  onRemoveDone(e) {
    if (this.data.resting) return
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条已完成动作？',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return
        try {
          const state = storage.removeDoneAction(id)
          this.setData({ doneActions: state.doneActions })
          this.syncShareFlag(state.doneActions)
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  onEditAction() {
    if (this.data.resting) return
    wx.showModal({
      title: '当前动作',
      editable: true,
      placeholderText: '例如：深蹲',
      content: this.data.actionName,
      success: (res) => {
        if (!res.confirm) return
        try {
          const name = (res.content || '').trim() || '当前动作'
          storage.update({ actionName: name })
          this.setData({ actionName: name })
        } catch (e) {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  onPickPreset(e) {
    if (this.data.resting) return
    const sec = storage.clampRest(e.currentTarget.dataset.sec)
    try {
      storage.update({ restSeconds: sec })
      this.setData({ restSeconds: sec })
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onAdjustRest(e) {
    if (this.data.resting) return
    const delta = Number(e.currentTarget.dataset.delta) || 0
    const sec = storage.clampRest(this.data.restSeconds + delta)
    try {
      storage.update({ restSeconds: sec })
      this.setData({ restSeconds: sec })
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onCompleteSet() {
    if (this.data.resting) return
    let sets = this.data.sets + 1
    try {
      storage.update({ sets, restSeconds: this.data.restSeconds })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
      return
    }
    this.setData({ sets })
    this.startRest(this.data.restSeconds)
  },

  startRest(seconds) {
    const sec = storage.clampRest(seconds)
    this.clearTimer()
    this._endsAt = Date.now() + sec * 1000
    this.setData({
      resting: true,
      remainSec: sec,
      remainText: String(sec)
    })
    this._timer = setInterval(() => this.tickRest(), 250)
  },

  tickRest() {
    if (!this._endsAt) return
    const leftMs = this._endsAt - Date.now()
    const left = Math.max(0, Math.ceil(leftMs / 1000))
    if (left !== this.data.remainSec) {
      this.setData({ remainSec: left, remainText: String(left) })
    }
    if (leftMs <= 0) {
      this.finishRest(true)
    }
  },

  onSkipRest() {
    this.finishRest(false)
  },

  finishRest(vibrate) {
    this.clearTimer()
    this._endsAt = 0
    this.setData({
      resting: false,
      remainSec: 0,
      remainText: '0'
    })
    if (vibrate) {
      try {
        wx.vibrateLong()
      } catch (e) {
        /* ignore */
      }
    }
  },

  clearTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  onResetSets() {
    if (this.data.resting || this.data.sets === 0) return
    wx.showModal({
      title: '重置组数',
      content: '将当前组数清零？',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return
        try {
          storage.update({ sets: 0 })
          this.setData({ sets: 0 })
          this.syncShareFlag(this.data.doneActions)
        } catch (e) {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  }
})
