const { getNavBarLayout } = require('../../../utils/navbar')

const COLORS = ['#111827', '#EF4444', '#3B82F6', '#F59E0B', '#10B981']
const SIZES = [
  { id: 'fine', width: 3, dot: 10 },
  { id: 'mid', width: 8, dot: 18 },
  { id: 'thick', width: 16, dot: 28 }
]
const MAX_UNDO = 20

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    colors: COLORS,
    sizes: SIZES,
    color: COLORS[0],
    sizeId: 'mid',
    eraser: false,
    exporting: false
  },

  _canvas: null,
  _ctx: null,
  _dpr: 1,
  _width: 0,
  _height: 0,
  _drawing: false,
  _current: null,
  _strokes: [],
  _lineWidth: 8,
  _rect: null,

  onLoad() {
    const app = getApp()
    const nav = (app && app.globalData && app.globalData.nav) || getNavBarLayout()
    if (app && app.globalData) app.globalData.nav = nav
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      navTotalHeight: nav.totalHeight
    })
    const mid = SIZES.find((s) => s.id === 'mid')
    this._lineWidth = mid ? mid.width : 8
  },

  onReady() {
    this.initCanvas()
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/home/home' })
    })
  },

  initCanvas() {
    const query = this.createSelectorQuery()
    query
      .select('#doodle')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const width = res[0].width
        const height = res[0].height
        const dpr = wx.getWindowInfo
          ? wx.getWindowInfo().pixelRatio
          : wx.getSystemInfoSync().pixelRatio
        canvas.width = Math.floor(width * dpr)
        canvas.height = Math.floor(height * dpr)
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        this._canvas = canvas
        this._ctx = ctx
        this._dpr = dpr
        this._width = width
        this._height = height
        this.clearBoard(false)
        this.measureCanvas()
      })
  },

  measureCanvas() {
    this.createSelectorQuery()
      .select('#doodle')
      .boundingClientRect((rect) => {
        this._rect = rect
      })
      .exec()
  },

  clearBoard(pushEmpty) {
    const ctx = this._ctx
    if (!ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
    ctx.restore()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, this._width, this._height)
    if (pushEmpty !== false) {
      this._strokes = []
    }
  },

  pointFromTouch(touch) {
    const rect = this._rect
    if (!rect) {
      return { x: touch.x, y: touch.y }
    }
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  },

  strokeStyle() {
    return {
      color: this.data.eraser ? '#ffffff' : this.data.color,
      width: this._lineWidth,
      eraser: !!this.data.eraser
    }
  },

  beginStroke(point) {
    const style = this.strokeStyle()
    this._current = {
      color: style.color,
      width: style.width,
      eraser: style.eraser,
      points: [point]
    }
    this._drawing = true
    const ctx = this._ctx
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.width
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  },

  continueStroke(point) {
    if (!this._drawing || !this._current) return
    const pts = this._current.points
    const prev = pts[pts.length - 1]
    pts.push(point)
    const ctx = this._ctx
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  },

  endStroke() {
    if (!this._drawing || !this._current) {
      this._drawing = false
      this._current = null
      return
    }
    if (this._current.points.length === 1) {
      const p = this._current.points[0]
      const ctx = this._ctx
      ctx.beginPath()
      ctx.fillStyle = this._current.color
      ctx.arc(p.x, p.y, this._current.width / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    this._strokes.push(this._current)
    if (this._strokes.length > MAX_UNDO) {
      this._strokes.shift()
    }
    this._drawing = false
    this._current = null
  },

  redraw() {
    this.clearBoard(false)
    const ctx = this._ctx
    this._strokes.forEach((stroke) => {
      if (!stroke.points.length) return
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      if (stroke.points.length === 1) {
        const p = stroke.points[0]
        ctx.beginPath()
        ctx.fillStyle = stroke.color
        ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2)
        ctx.fill()
        return
      }
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    })
  },

  onTouchStart(e) {
    if (!this._ctx || this.data.exporting) return
    if (!this._rect) this.measureCanvas()
    const touch = e.touches[0]
    if (!touch) return
    this.beginStroke(this.pointFromTouch(touch))
  },

  onTouchMove(e) {
    if (!this._drawing) return
    const touch = e.touches[0]
    if (!touch) return
    this.continueStroke(this.pointFromTouch(touch))
  },

  onTouchEnd() {
    this.endStroke()
  },

  onPickColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({ color, eraser: false })
  },

  onPickEraser() {
    this.setData({ eraser: true })
  },

  onPickSize(e) {
    const id = e.currentTarget.dataset.id
    const size = SIZES.find((s) => s.id === id)
    if (!size) return
    this._lineWidth = size.width
    this.setData({ sizeId: id })
  },

  onUndo() {
    if (!this._strokes.length) {
      wx.showToast({ title: '没有可撤销的笔画', icon: 'none' })
      return
    }
    this._strokes.pop()
    this.redraw()
  },

  onClear() {
    if (!this._strokes.length) return
    wx.showModal({
      title: '清空画板',
      content: '确定清空当前涂鸦吗？',
      confirmText: '清空',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) this.clearBoard(true)
      }
    })
  },

  onShare() {
    if (!this._canvas || this.data.exporting) return
    this.setData({ exporting: true })
    wx.showLoading({ title: '生成图片', mask: true })
    wx.canvasToTempFilePath({
      canvas: this._canvas,
      fileType: 'png',
      quality: 1,
      success: (res) => {
        wx.hideLoading()
        this.setData({ exporting: false })
        this.shareImage(res.tempFilePath)
      },
      fail: () => {
        wx.hideLoading()
        this.setData({ exporting: false })
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  },

  shareImage(path) {
    if (typeof wx.showShareImageMenu === 'function') {
      wx.showShareImageMenu({
        path,
        fail: () => this.saveImage(path)
      })
      return
    }
    this.saveImage(path)
  },

  saveImage(path) {
    wx.saveImageToPhotosAlbum({
      filePath: path,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('auth') !== -1 || msg.indexOf('authorize') !== -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存图片到相册',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting({})
            }
          })
          return
        }
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  }
})
