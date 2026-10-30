const { getTools } = require('../../config/tools')
const { getEggs } = require('../../config/eggs')
const { getNavBarLayout } = require('../../utils/navbar')
const { saveOrder } = require('../../utils/tools-order')
const { getTodayQuote, refreshTodayQuote } = require('../../config/quotes')
const { drawQuoteCard } = require('../../utils/quote-share')
const { getTheme, toggleTheme } = require('../../utils/theme')
const {
  getViewMode,
  toggleViewMode,
  hasSeenBoxTip,
  markBoxTipSeen
} = require('../../utils/view-mode')
const physics = require('../../utils/toy-physics')

const TILE_SIZE_RPX = 112
const EGG_SIZE_RPX = 80

Page({
  data: {
    tools: [],
    toolMap: {},
    eggMap: {},
    quote: '',
    quoteSharing: false,
    theme: 'light',
    themeBounce: false,
    viewMode: 'list',
    tiles: [],
    preview: null,
    eggMeme: '',
    boomFlash: false,
    boxTipVisible: false,
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    sorting: false,
    dragIndex: -1
  },

  _dragIndex: -1,
  _rowHeight: 76,
  _listTop: 0,
  _didDrag: false,
  _skipTap: false,
  _bounceTimer: null,
  _world: null,
  _loop: null,
  _lastTs: 0,
  _accelOn: false,
  _boxReady: false,
  _bombTimer: null,
  _bombBusy: false,
  _boxTipTimer: null,

  onLoad() {
    this._onAccel = this._onAccel.bind(this)
    const app = getApp()
    const nav = (app && app.globalData && app.globalData.nav) || getNavBarLayout()
    if (app && app.globalData) app.globalData.nav = nav
    const eggs = getEggs()
    const eggMap = {}
    eggs.forEach((e) => {
      eggMap[e.id] = e
    })
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      navTotalHeight: nav.totalHeight,
      quote: getTodayQuote(),
      theme: getTheme(),
      viewMode: getViewMode(),
      eggMap
    })
  },

  onReady() {
    if (this.data.viewMode === 'box') {
      setTimeout(() => this.startBoxMode(), 80)
    }
  },

  onShow() {
    const tools = getTools()
    const eggs = getEggs()
    const toolMap = {}
    const eggMap = {}
    tools.forEach((t) => {
      toolMap[t.id] = t
    })
    eggs.forEach((e) => {
      eggMap[e.id] = e
    })
    this.setData({
      tools,
      toolMap,
      eggMap,
      quote: getTodayQuote(),
      sorting: false,
      dragIndex: -1
    })
    this._dragIndex = -1
    this._didDrag = false

    if (this.data.viewMode === 'box') {
      setTimeout(() => this.startBoxMode(), 60)
    }
  },

  onHide() {
    this.stopBoxMode()
  },

  onUnload() {
    this.stopBoxMode()
    this.clearBoxTipTimer()
    if (this._bounceTimer) {
      clearTimeout(this._bounceTimer)
      this._bounceTimer = null
    }
  },

  noop() {},

  onToggleTheme() {
    if (this.data.sorting) return
    const theme = toggleTheme(this.data.theme)
    if (this._bounceTimer) clearTimeout(this._bounceTimer)
    this.setData({ theme, themeBounce: true })
    this._bounceTimer = setTimeout(() => {
      this.setData({ themeBounce: false })
      this._bounceTimer = null
    }, 320)
  },

  onToggleViewMode() {
    if (this.data.sorting) return
    const viewMode = toggleViewMode(this.data.viewMode)
    this.setData({
      viewMode,
      preview: null,
      sorting: false,
      dragIndex: -1,
      boxTipVisible: viewMode === 'box' ? this.data.boxTipVisible : false
    })
    if (viewMode === 'box') {
      setTimeout(() => this.startBoxMode(), 80)
    } else {
      this.clearBoxTipTimer()
      this.stopBoxMode()
    }
  },

  maybeShowBoxTip() {
    if (hasSeenBoxTip() || this.data.boxTipVisible) return
    markBoxTipSeen()
    this.setData({ boxTipVisible: true })
    this.clearBoxTipTimer()
    this._boxTipTimer = setTimeout(() => {
      this.setData({ boxTipVisible: false })
      this._boxTipTimer = null
    }, 2500)
  },

  onDismissBoxTip() {
    this.clearBoxTipTimer()
    markBoxTipSeen()
    this.setData({ boxTipVisible: false })
  },

  clearBoxTipTimer() {
    if (this._boxTipTimer) {
      clearTimeout(this._boxTipTimer)
      this._boxTipTimer = null
    }
  },

  rpx2px(rpx) {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      return (rpx / 750) * info.windowWidth
    } catch (e) {
      return rpx * 0.5
    }
  },

  startBoxMode() {
    this.stopBoxMode(false)
    this.clearEggDrops()
    const tools = this.data.tools || []
    const eggs = getEggs()
    if (!tools.length && !eggs.length) return

    this.createSelectorQuery()
      .select('#toyStage')
      .boundingClientRect((rect) => {
        if (!rect || !rect.width || !rect.height) return
        const toolSize = this.rpx2px(TILE_SIZE_RPX)
        const eggSize = this.rpx2px(EGG_SIZE_RPX)
        const toolActors = tools.map((t) => ({ id: t.id, kind: 'tool', size: toolSize }))
        this._world = physics.createWorld(rect.width, rect.height, toolSize)
        physics.seedBodies(this._world, toolActors)
        this._boxReady = true
        this.maybeShowBoxTip()
        this.setData({ tiles: this.decorateTiles(physics.snapshot(this._world)) })
        this.startAccel()
        this.startLoop()
        this.scheduleEggDrops(
          eggs.map((e) => ({ id: e.id, kind: 'egg', size: eggSize }))
        )
      })
      .exec()
  },

  scheduleEggDrops(eggActors) {
    this.clearEggDrops()
    this._eggDropTimers = []
    ;(eggActors || []).forEach((egg, i) => {
      const timer = setTimeout(() => {
        if (!this._world || this.data.viewMode !== 'box') return
        physics.dropEgg(this._world, egg)
      }, 280 + i * 70)
      this._eggDropTimers.push(timer)
    })
  },

  clearEggDrops() {
    if (this._eggDropTimers && this._eggDropTimers.length) {
      this._eggDropTimers.forEach((t) => clearTimeout(t))
    }
    this._eggDropTimers = []
  },

  decorateTiles(list) {
    const toolMap = this.data.toolMap || {}
    const eggMap = this.data.eggMap || {}
    return (list || []).map((t) => {
      const egg = eggMap[t.id]
      if (egg) {
        return {
          ...t,
          kind: 'egg',
          icon: egg.icon || '',
          mark: '',
          name: egg.name || ''
        }
      }
      const tool = toolMap[t.id] || {}
      return {
        ...t,
        kind: 'tool',
        icon: tool.icon || '',
        mark: tool.mark || '',
        name: tool.name || ''
      }
    })
  },

  stopBoxMode(clearTiles) {
    this.clearEggDrops()
    if (this._bombTimer) {
      clearTimeout(this._bombTimer)
      this._bombTimer = null
    }
    this._bombBusy = false
    this.stopLoop()
    this.stopAccel()
    this._world = null
    this._boxReady = false
    if (clearTiles !== false) {
      this.setData({ tiles: [], boomFlash: false })
    }
  },

  startLoop() {
    this.stopLoop()
    this._lastTs = Date.now()
    this._lastTileKey = ''
    const tick = () => {
      if (!this._world || this.data.viewMode !== 'box') return
      const now = Date.now()
      const dt = (now - this._lastTs) / 1000
      this._lastTs = now
      physics.step(this._world, dt)
      const snap = physics.snapshot(this._world)
      const key = snap.map((t) => t.style).join('|')
      if (key !== this._lastTileKey) {
        this._lastTileKey = key
        this.setData({ tiles: this.decorateTiles(snap) })
      }
      this._loop = setTimeout(tick, 16)
    }
    this._loop = setTimeout(tick, 16)
  },

  stopLoop() {
    if (this._loop) {
      clearTimeout(this._loop)
      this._loop = null
    }
  },

  startAccel() {
    if (this._accelOn) return
    try {
      wx.startAccelerometer({ interval: 'game' })
      wx.onAccelerometerChange(this._onAccel)
      this._accelOn = true
    } catch (e) {
      /* ignore — still has base gravity */
    }
  },

  stopAccel() {
    if (!this._accelOn) return
    try {
      wx.offAccelerometerChange(this._onAccel)
      wx.stopAccelerometer()
    } catch (e) {
      /* ignore */
    }
    this._accelOn = false
  },

  _onAccel(res) {
    if (!this._world || this.data.viewMode !== 'box') return
    physics.setAccel(this._world, res.x, res.y)
  },

  onTapToy(e) {
    const id = e.currentTarget.dataset.id
    const egg = (this.data.eggMap || {})[id]
    if (egg) {
      if (egg.bomb) {
        this.triggerBomb(egg)
        return
      }
      if (egg.meme) {
        this.setData({ eggMeme: egg.meme })
        return
      }
      wx.showToast({ title: egg.toast || `发现彩蛋：${egg.name}`, icon: 'none' })
      return
    }
    const tool = (this.data.tools || []).find((t) => t.id === id)
    if (!tool) return
    this.setData({
      preview: {
        id: tool.id,
        name: tool.name,
        desc: tool.desc,
        icon: tool.icon,
        mark: tool.mark,
        path: tool.path
      }
    })
  },

  onClosePreview() {
    this.setData({ preview: null })
  },

  onCloseEggMeme() {
    this.setData({ eggMeme: '' })
  },

  triggerBomb(egg) {
    if (!this._world || this.data.viewMode !== 'box' || this._bombBusy) return
    const body = (this._world.bodies || []).find((b) => b.id === egg.id)
    if (!body) return

    this._bombBusy = true
    physics.explodeBomb(this._world, egg.id, {
      radius: Math.min(this._world.width, this._world.height) * 0.62,
      force: 1180
    })
    this.setData({
      boomFlash: true,
      tiles: this.decorateTiles(physics.snapshot(this._world))
    })
    try {
      wx.vibrateShort({ type: 'heavy' })
    } catch (err) {
      try {
        wx.vibrateShort({ type: 'medium' })
      } catch (e) {
        /* ignore */
      }
    }

    setTimeout(() => {
      this.setData({ boomFlash: false })
    }, 280)

    if (this._bombTimer) clearTimeout(this._bombTimer)
    this._bombTimer = setTimeout(() => {
      this._bombTimer = null
      this._bombBusy = false
      if (!this._world || this.data.viewMode !== 'box') return
      const eggSize = this.rpx2px(EGG_SIZE_RPX)
      physics.dropEgg(this._world, {
        id: egg.id,
        kind: 'egg',
        size: eggSize
      })
    }, 2000)
  },

  onUsePreview(e) {
    const id = (e.currentTarget.dataset && e.currentTarget.dataset.id) || (this.data.preview && this.data.preview.id)
    this.setData({ preview: null })
    this.openTool(id)
  },

  openTool(id) {
    const tool = (this.data.tools || []).find((t) => t.id === id)
    if (!tool || !tool.path) return
    wx.navigateTo({
      url: tool.path,
      fail: () => {
        wx.showToast({ title: '打开失败', icon: 'none' })
      }
    })
  },

  onRefreshQuote() {
    if (this.data.sorting) return
    this.setData({ quote: refreshTodayQuote() })
  },

  onShareQuote() {
    if (this.data.sorting || this.data.quoteSharing) return
    const quote = this.data.quote
    if (!quote) return
    this.setData({ quoteSharing: true })

    wx.createSelectorQuery()
      .select('#quoteShareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ quoteSharing: false })
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        const canvas = res[0].node
        drawQuoteCard(canvas, {
          quote,
          dpr: wx.getSystemInfoSync().pixelRatio || 2
        })
          .then(() => {
            wx.canvasToTempFilePath({
              canvas,
              success: (fileRes) => {
                this.setData({ quoteSharing: false })
                this.presentQuoteShare(fileRes.tempFilePath)
              },
              fail: () => {
                this.setData({ quoteSharing: false })
                wx.showToast({ title: '生成图片失败', icon: 'none' })
              }
            })
          })
          .catch(() => {
            this.setData({ quoteSharing: false })
            wx.showToast({ title: '绘制失败', icon: 'none' })
          })
      })
  },

  presentQuoteShare(path) {
    if (wx.showShareImageMenu) {
      wx.showShareImageMenu({
        path,
        fail: () => this.fallbackQuoteShare(path)
      })
      return
    }
    this.fallbackQuoteShare(path)
  },

  fallbackQuoteShare(path) {
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

  onTapTool(e) {
    if (this._skipTap || this.data.sorting) {
      this._skipTap = false
      return
    }
    this.openTool(e.currentTarget.dataset.id)
  },

  onLongPress(e) {
    if (this.data.viewMode !== 'list') return
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index) || index < 0) return

    wx.createSelectorQuery()
      .selectAll('.row')
      .boundingClientRect()
      .exec((res) => {
        const rows = (res && res[0]) || []
        if (!rows.length) return
        this._rowHeight = rows[0].height || 76
        this._listTop = rows[0].top
        this._dragIndex = index
        this._didDrag = false
        this._skipTap = true
        try {
          wx.vibrateShort({ type: 'medium' })
        } catch (err) {
          /* ignore */
        }
        this.setData({ sorting: true, dragIndex: index })
      })
  },

  onTouchMove(e) {
    if (!this.data.sorting || this._dragIndex < 0) return
    const touch = e.touches && e.touches[0]
    if (!touch) return

    const y = touch.clientY
    let target = Math.floor((y - this._listTop) / this._rowHeight)
    const max = this.data.tools.length - 1
    if (target < 0) target = 0
    if (target > max) target = max

    if (target === this._dragIndex) return

    const tools = this.data.tools.slice()
    const [item] = tools.splice(this._dragIndex, 1)
    tools.splice(target, 0, item)
    this._dragIndex = target
    this._didDrag = true
    this.setData({ tools, dragIndex: target })
  },

  onTouchEnd() {
    if (!this.data.sorting) return
    const ids = (this.data.tools || []).map((t) => t.id)
    try {
      saveOrder(ids)
    } catch (e) {
      wx.showToast({ title: '排序保存失败', icon: 'none' })
    }
    this.setData({ sorting: false, dragIndex: -1 })
    this._dragIndex = -1
    if (this._didDrag) {
      this._skipTap = true
      setTimeout(() => {
        this._skipTap = false
      }, 300)
    } else {
      this._skipTap = false
    }
    this._didDrag = false
  },

  onTouchCancel() {
    this.onTouchEnd()
  }
})
