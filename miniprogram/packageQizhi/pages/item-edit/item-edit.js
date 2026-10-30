const storage = require('../../utils/storage')
const calc = require('../../utils/calc')

Page({
  data: {
    listId: '',
    id: '',
    categoryId: '',
    categoryIndex: 0,
    categoryNames: [],
    categories: [],
    name: '',
    estimated: '',
    actual: '',
    brandSpec: '',
    note: '',
    diffText: '—',
    diffClass: 'diff-zero'
  },

  onLoad(options) {
    const listId = options.listId || ''
    if (!listId) {
      wx.showToast({ title: '缺少清单', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }

    let list
    try {
      list = storage.getList(listId)
    } catch (e) {
      wx.showToast({ title: e.message || '清单不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }

    const categories = storage.sortByOrder(list.categories)
    const categoryNames = categories.map((c) => c.name)

    let categoryId = options.categoryId || ''
    let categoryIndex = 0
    if (categoryId) {
      const idx = categories.findIndex((c) => c.id === categoryId)
      categoryIndex = idx >= 0 ? idx : 0
      categoryId = categories[categoryIndex] ? categories[categoryIndex].id : ''
    } else if (categories.length) {
      categoryId = categories[0].id
      categoryIndex = 0
    }

    const patch = {
      listId,
      categories,
      categoryNames,
      categoryId,
      categoryIndex
    }

    if (options.id) {
      const item = list.items.find((i) => i.id === options.id)
      if (!item) {
        wx.showToast({ title: '条目不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 500)
        return
      }
      const cIdx = categories.findIndex((c) => c.id === item.categoryId)
      Object.assign(patch, {
        id: item.id,
        categoryId: item.categoryId,
        categoryIndex: cIdx >= 0 ? cIdx : 0,
        name: item.name || '',
        estimated: item.estimated === null || item.estimated === undefined ? '' : String(item.estimated),
        actual: item.actual === null || item.actual === undefined ? '' : String(item.actual),
        brandSpec: item.brandSpec || '',
        note: item.note || ''
      })
      wx.setNavigationBarTitle({ title: '编辑条目' })
    } else {
      wx.setNavigationBarTitle({ title: '新增条目' })
    }

    this.setData(patch)
    this.refreshDiff()
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value)
    const cat = this.data.categories[index]
    this.setData({
      categoryIndex: index,
      categoryId: cat ? cat.id : ''
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onEstimatedInput(e) {
    this.setData({ estimated: e.detail.value }, () => this.refreshDiff())
  },

  onActualInput(e) {
    this.setData({ actual: e.detail.value }, () => this.refreshDiff())
  },

  onBrandInput(e) {
    this.setData({ brandSpec: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  refreshDiff() {
    const estimated = this.data.estimated === '' ? null : Number(this.data.estimated)
    const actual = this.data.actual === '' ? null : Number(this.data.actual)
    const safeEstimated = Number.isFinite(estimated) ? estimated : null
    const safeActual = Number.isFinite(actual) ? actual : null
    const diff = calc.itemDiff({ estimated: safeEstimated, actual: safeActual })
    this.setData({
      diffText: calc.formatDiff(diff),
      diffClass: calc.diffClass(diff)
    })
  },

  onSave() {
    if (!this.data.categories.length) {
      wx.showToast({ title: '请先创建分类', icon: 'none' })
      return
    }
    try {
      storage.upsertItem(this.data.listId, {
        id: this.data.id || undefined,
        categoryId: this.data.categoryId,
        name: this.data.name,
        estimated: this.data.estimated,
        actual: this.data.actual,
        brandSpec: this.data.brandSpec,
        note: this.data.note
      })
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 400)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    }
  },

  onDelete() {
    if (!this.data.id) return
    wx.showModal({
      title: '删除条目',
      content: '确定删除这一条吗？',
      confirmColor: '#c0392b',
      success: (res) => {
        if (!res.confirm) return
        try {
          storage.deleteItem(this.data.listId, this.data.id)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 400)
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      }
    })
  }
})
