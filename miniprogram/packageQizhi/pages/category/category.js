const storage = require('../../utils/storage')

Page({
  data: {
    listId: '',
    categories: []
  },

  onLoad(options) {
    const listId = options.listId || ''
    if (!listId) {
      wx.showToast({ title: '缺少清单', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
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
      const counts = storage.countItemsByCategory(list)
      const categories = storage.sortByOrder(list.categories).map((c) => ({
        ...c,
        count: counts[c.id] || 0
      }))
      this.setData({ categories })
    } catch (e) {
      wx.showToast({ title: e.message || '读取失败', icon: 'none' })
    }
  },

  onAdd() {
    wx.showModal({
      title: '新建分类',
      editable: true,
      placeholderText: '例如：材料、人工、其他',
      success: (res) => {
        if (!res.confirm) return
        this.saveCategoryName(null, res.content)
      }
    })
  },

  onRename(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '修改分类名',
      editable: true,
      placeholderText: '分类名称',
      content: name,
      success: (res) => {
        if (!res.confirm) return
        this.saveCategoryName(id, res.content)
      }
    })
  },

  saveCategoryName(id, rawName) {
    try {
      storage.upsertCategory(this.data.listId, { id, name: rawName })
      this.refresh()
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    }
  },

  onMove(e) {
    const { id, dir } = e.currentTarget.dataset
    try {
      storage.moveCategory(this.data.listId, id, dir)
      this.refresh()
    } catch (err) {
      wx.showToast({ title: err.message || '调整失败', icon: 'none' })
    }
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    const cat = this.data.categories.find((c) => c.id === id)
    if (cat && cat.count > 0) {
      wx.showToast({ title: '请先清空该分类下的条目', icon: 'none' })
      return
    }
    wx.showModal({
      title: '删除分类',
      content: `确定删除「${cat ? cat.name : ''}」吗？`,
      confirmColor: '#c0392b',
      success: (res) => {
        if (!res.confirm) return
        try {
          storage.deleteCategory(this.data.listId, id)
          this.refresh()
        } catch (err) {
          wx.showToast({
            title: err.message || '删除失败',
            icon: 'none'
          })
        }
      }
    })
  }
})
