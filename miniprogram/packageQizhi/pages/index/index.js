const storage = require('../../utils/storage')
const calc = require('../../utils/calc')
const backup = require('../../utils/backup')
const { drawSummaryImage, buildSections } = require('../../utils/canvas-share')

Page({
  data: {
    listId: '',
    listName: '',
    categories: [],
    items: [],
    activeCategoryId: '',
    scrollIntoView: '',
    totalEstimatedText: '0',
    totalActualText: '0',
    totalDiffText: '—',
    totalDiffClass: 'diff-zero',
    sharing: false
  },

  onLoad(options) {
    const listId = options.listId || ''
    if (!listId) {
      wx.showToast({ title: '缺少清单', icon: 'none' })
      setTimeout(() => wx.navigateBack({ fail: () => wx.reLaunch({ url: '/packageQizhi/pages/lists/lists' }) }), 400)
      return
    }
    this.setData({ listId })
  },

  onShow() {
    if (!this.data.listId) return
    this.refresh()
  },

  refresh() {
    try {
      const list = storage.getList(this.data.listId)
      const categoriesRaw = storage.sortByOrder(list.categories)
      const total = calc.sumAll(list.items)

      const categories = categoriesRaw.map((c) => {
        const sub = calc.sumCategory(list.items, c.id)
        return {
          ...c,
          subText: calc.formatMoney(sub.actual > 0 || sub.hasActual ? sub.actual : sub.estimated),
          estimated: sub.estimated,
          actual: sub.actual,
          diff: sub.diff
        }
      })

      let activeCategoryId = this.data.activeCategoryId
      if (!categories.find((c) => c.id === activeCategoryId)) {
        activeCategoryId = categories.length ? categories[0].id : ''
      }

      const items = this.buildItems(list.items, activeCategoryId)

      this._list = list
      this._total = total

      wx.setNavigationBarTitle({ title: list.name || '清单' })

      this.setData({
        listName: list.name || '',
        categories,
        items,
        activeCategoryId,
        scrollIntoView: activeCategoryId ? `tab-${activeCategoryId}` : '',
        totalEstimatedText: calc.formatMoney(total.estimated),
        totalActualText: calc.formatMoney(total.actual),
        totalDiffText: calc.formatDiff(total.diff),
        totalDiffClass: calc.diffClass(total.diff)
      })
    } catch (e) {
      wx.showToast({ title: e.message || '读取失败', icon: 'none' })
      if (e.code === 'LIST_NOT_FOUND') {
        setTimeout(() => wx.navigateBack({ fail: () => wx.reLaunch({ url: '/packageQizhi/pages/lists/lists' }) }), 500)
      }
    }
  },

  buildItems(allItems, categoryId) {
    return storage
      .sortByOrder((allItems || []).filter((item) => item.categoryId === categoryId))
      .map((item) => {
        const diff = calc.itemDiff(item)
        return {
          ...item,
          estimatedEmpty: item.estimated === null || item.estimated === undefined,
          actualEmpty: item.actual === null || item.actual === undefined,
          estimatedText: calc.formatMoney(item.estimated),
          actualText: calc.formatMoney(item.actual),
          diffText: calc.formatDiff(diff),
          diffClass: calc.diffClass(diff)
        }
      })
  },

  onTabTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.activeCategoryId) return
    const items = this.buildItems(this._list.items, id)
    this.setData({
      activeCategoryId: id,
      scrollIntoView: `tab-${id}`,
      items
    })
  },

  goCategory() {
    wx.navigateTo({
      url: `/packageQizhi/pages/category/category?listId=${this.data.listId}`
    })
  },

  onAdd() {
    if (!this.data.categories.length) {
      wx.showToast({ title: '请先创建分类', icon: 'none' })
      return
    }
    const cid = this.data.activeCategoryId
    wx.navigateTo({
      url: `/packageQizhi/pages/item-edit/item-edit?listId=${this.data.listId}&categoryId=${cid}`
    })
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/packageQizhi/pages/item-edit/item-edit?listId=${this.data.listId}&id=${id}`
    })
  },

  onBackup() {
    wx.showActionSheet({
      itemList: ['导出备份到剪贴板', '从剪贴板导入到本清单'],
      success: (res) => {
        if (res.tapIndex === 0) this.exportBackup()
        if (res.tapIndex === 1) this.importBackup()
      }
    })
  },

  exportBackup() {
    try {
      const list = storage.getList(this.data.listId)
      const text = backup.stringifyBackup(list)
      const summary = backup.summarize(list)
      wx.setClipboardData({
        data: text,
        success: () => {
          wx.showModal({
            title: '已复制备份',
            content: `清单「${list.name}」：${summary.categoryCount} 类、${summary.itemCount} 项。\n微信发给另一台 → 打开掐指一算 → 导入为新清单，或在某份清单内覆盖导入。`,
            showCancel: false,
            confirmText: '知道了'
          })
        },
        fail: () => wx.showToast({ title: '复制失败', icon: 'none' })
      })
    } catch (e) {
      wx.showToast({ title: '导出失败', icon: 'none' })
    }
  },

  importBackup() {
    wx.getClipboardData({
      success: (res) => {
        let parsed
        try {
          parsed = backup.parseBackupText(res.data)
        } catch (err) {
          wx.showToast({ title: err.message || '备份无效', icon: 'none' })
          return
        }
        const summary = backup.summarize(parsed)
        wx.showModal({
          title: '确认导入？',
          content: `将覆盖清单「${this.data.listName}」的当前数据。\n备份含 ${summary.categoryCount} 类、${summary.itemCount} 项。`,
          confirmText: '覆盖导入',
          confirmColor: '#c0392b',
          success: (modalRes) => {
            if (!modalRes.confirm) return
            try {
              storage.replaceListContent(this.data.listId, parsed)
              this.setData({ activeCategoryId: '' })
              this.refresh()
              wx.showToast({ title: '导入成功', icon: 'success' })
            } catch (e) {
              wx.showToast({ title: '写入失败', icon: 'none' })
            }
          }
        })
      },
      fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
    })
  },

  onShare() {
    if (this.data.sharing) return
    this.setData({ sharing: true })

    const query = wx.createSelectorQuery()
    query
      .select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ sharing: false })
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        const canvas = res[0].node
        try {
          const list = this._list || storage.getList(this.data.listId)
          const total = this._total || calc.sumAll(list.items)
          drawSummaryImage(canvas, {
            title: list.name || '清单',
            total,
            sections: buildSections(list),
            itemCount: (list.items || []).length,
            dpr: wx.getSystemInfoSync().pixelRatio || 2
          })

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
        } catch (err) {
          this.setData({ sharing: false })
          wx.showToast({ title: '绘制失败', icon: 'none' })
        }
      })
  },

  presentShare(path) {
    if (wx.showShareImageMenu) {
      wx.showShareImageMenu({
        path,
        fail: () => this.saveOrPreview(path)
      })
      return
    }
    this.saveOrPreview(path)
  },

  saveOrPreview(path) {
    wx.showActionSheet({
      itemList: ['保存到相册', '预览图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.saveToAlbum(path)
        } else {
          wx.previewImage({ urls: [path], current: path })
        }
      }
    })
  },

  saveToAlbum(path) {
    wx.saveImageToPhotosAlbum({
      filePath: path,
      success: () => wx.showToast({ title: '已保存', icon: 'success' }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting({})
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  }
})
