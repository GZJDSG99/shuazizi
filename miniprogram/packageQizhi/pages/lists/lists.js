const storage = require('../../utils/storage')
const backup = require('../../utils/backup')
const { getNavBarLayout } = require('../../../utils/navbar')

Page({
  data: {
    lists: [],
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64
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
  },

  onShow() {
    this.refresh()
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/home/home' })
    })
  },

  refresh() {
    try {
      this.setData({ lists: storage.listSummaries() })
    } catch (e) {
      wx.showToast({ title: '读取失败', icon: 'none' })
    }
  },

  noop() {},

  onCreate() {
    wx.showModal({
      title: '新建清单',
      editable: true,
      placeholderText: '例如：装修预算',
      success: (res) => {
        if (!res.confirm) return
        try {
          const list = storage.createList(res.content || '未命名清单')
          this.refresh()
          wx.navigateTo({ url: `/packageQizhi/pages/index/index?listId=${list.id}` })
        } catch (err) {
          wx.showToast({ title: err.message || '创建失败', icon: 'none' })
        }
      }
    })
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packageQizhi/pages/index/index?listId=${id}` })
  },

  onRename(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '重命名清单',
      editable: true,
      placeholderText: '清单名称',
      content: name,
      success: (res) => {
        if (!res.confirm) return
        try {
          storage.renameList(id, res.content)
          this.refresh()
        } catch (err) {
          wx.showToast({ title: err.message || '改名失败', icon: 'none' })
        }
      }
    })
  },

  onDelete(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '删除清单',
      content: `确定删除「${name}」吗？其中的分类和条目也会一起删除。`,
      confirmColor: '#c0392b',
      success: (res) => {
        if (!res.confirm) return
        try {
          storage.deleteList(id)
          this.refresh()
          wx.showToast({ title: '已删除', icon: 'success' })
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      }
    })
  },

  onImportNew() {
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
        const defaultName = parsed.name || '导入的清单'
        wx.showModal({
          title: '导入为新清单',
          content: `将新建「${defaultName}」\n含 ${summary.categoryCount} 类、${summary.itemCount} 项`,
          confirmText: '导入',
          success: (modalRes) => {
            if (!modalRes.confirm) return
            try {
              const list = storage.createList(defaultName)
              storage.replaceListContent(list.id, parsed)
              this.refresh()
              wx.showToast({ title: '导入成功', icon: 'success' })
            } catch (e) {
              wx.showToast({ title: '导入失败', icon: 'none' })
            }
          }
        })
      },
      fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
    })
  }
})
