const { createId } = require('./id')

const STORAGE_KEY = 'decoration_budget_v1'
const STORE_VERSION = 2

function nowIso() {
  return new Date().toISOString()
}

function emptyList(name) {
  return {
    id: createId(),
    name: (name || '未命名清单').trim() || '未命名清单',
    updatedAt: nowIso(),
    categories: [],
    items: []
  }
}

function emptyStore() {
  return {
    version: STORE_VERSION,
    lists: []
  }
}

function migrateRaw(raw) {
  if (!raw || typeof raw !== 'object') {
    return emptyStore()
  }

  // v2: { version: 2, lists: [...] }
  if (Array.isArray(raw.lists)) {
    return {
      version: STORE_VERSION,
      lists: raw.lists.map((list, index) => normalizeList(list, index)).filter(Boolean)
    }
  }

  // v1: single budget at root
  if (Array.isArray(raw.categories) || Array.isArray(raw.items)) {
    const list = {
      id: createId(),
      name: '装修预算',
      updatedAt: raw.updatedAt || nowIso(),
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      items: Array.isArray(raw.items) ? raw.items : []
    }
    return {
      version: STORE_VERSION,
      lists: [normalizeList(list, 0)]
    }
  }

  return emptyStore()
}

function normalizeList(list, index) {
  if (!list || typeof list !== 'object') return null
  return {
    id: list.id ? String(list.id) : createId(),
    name: String(list.name || `清单${index + 1}`).trim() || `清单${index + 1}`,
    updatedAt: list.updatedAt || nowIso(),
    categories: Array.isArray(list.categories) ? list.categories : [],
    items: Array.isArray(list.items) ? list.items : []
  }
}

function loadStore() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    const store = migrateRaw(raw)
    // 若发生了从空/旧格式迁移，落盘一次
    if (!raw || raw.version !== STORE_VERSION || !Array.isArray(raw.lists)) {
      wx.setStorageSync(STORAGE_KEY, store)
    }
    return store
  } catch (e) {
    console.error('loadStore failed', e)
    throw e
  }
}

function saveStore(store) {
  const next = {
    version: STORE_VERSION,
    lists: (store && store.lists) || []
  }
  try {
    wx.setStorageSync(STORAGE_KEY, next)
    return next
  } catch (e) {
    console.error('saveStore failed', e)
    throw e
  }
}

function listSummaries() {
  const store = loadStore()
  const calc = require('./calc')
  return store.lists
    .slice()
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .map((list) => {
      const total = calc.sumAll(list.items)
      return {
        id: list.id,
        name: list.name,
        updatedAt: list.updatedAt,
        categoryCount: (list.categories || []).length,
        itemCount: (list.items || []).length,
        estimated: total.estimated,
        actual: total.actual,
        diff: total.diff,
        estimatedText: calc.formatMoney(total.estimated),
        actualText: calc.formatMoney(total.actual),
        diffText: calc.formatDiff(total.diff),
        diffClass: calc.diffClass(total.diff)
      }
    })
}

function getList(listId) {
  const store = loadStore()
  const list = store.lists.find((l) => l.id === listId)
  if (!list) {
    const err = new Error('清单不存在')
    err.code = 'LIST_NOT_FOUND'
    throw err
  }
  return list
}

function saveList(list) {
  const store = loadStore()
  const idx = store.lists.findIndex((l) => l.id === list.id)
  const nextList = {
    ...list,
    updatedAt: nowIso()
  }
  if (idx < 0) {
    store.lists.push(nextList)
  } else {
    store.lists[idx] = nextList
  }
  saveStore(store)
  return nextList
}

function createList(name) {
  const store = loadStore()
  const list = emptyList(name)
  store.lists.unshift(list)
  saveStore(store)
  return list
}

function renameList(listId, name) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('清单名称不能为空')
  const list = getList(listId)
  list.name = trimmed
  return saveList(list)
}

function deleteList(listId) {
  const store = loadStore()
  store.lists = store.lists.filter((l) => l.id !== listId)
  return saveStore(store)
}

function replaceListContent(listId, content) {
  const list = getList(listId)
  list.categories = (content && content.categories) || []
  list.items = (content && content.items) || []
  return saveList(list)
}

function sortByOrder(list) {
  return (list || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))
}

function upsertCategory(listId, payload) {
  const list = getList(listId)
  const name = (payload.name || '').trim()
  if (!name) throw new Error('分类名称不能为空')

  if (payload.id) {
    const idx = list.categories.findIndex((c) => c.id === payload.id)
    if (idx < 0) throw new Error('分类不存在')
    list.categories[idx] = {
      ...list.categories[idx],
      name
    }
  } else {
    const maxOrder = list.categories.reduce((m, c) => Math.max(m, c.order || 0), -1)
    list.categories.push({
      id: createId(),
      name,
      order: maxOrder + 1
    })
  }
  return saveList(list)
}

function deleteCategory(listId, categoryId) {
  const list = getList(listId)
  const hasItems = list.items.some((item) => item.categoryId === categoryId)
  if (hasItems) {
    const err = new Error('该分类下还有条目，请先迁移或删除')
    err.code = 'CATEGORY_NOT_EMPTY'
    throw err
  }
  list.categories = list.categories.filter((c) => c.id !== categoryId)
  return saveList(list)
}

function moveCategory(listId, categoryId, direction) {
  const list = getList(listId)
  const cats = sortByOrder(list.categories)
  const index = cats.findIndex((c) => c.id === categoryId)
  if (index < 0) throw new Error('分类不存在')
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= cats.length) return saveList(list)

  const tmp = cats[index]
  cats[index] = cats[target]
  cats[target] = tmp
  cats.forEach((c, i) => {
    c.order = i
  })
  list.categories = cats
  return saveList(list)
}

function upsertItem(listId, payload) {
  const list = getList(listId)
  const name = (payload.name || '').trim()
  if (!name) throw new Error('项目名称不能为空')
  if (!payload.categoryId) throw new Error('请选择分类')

  const categoryExists = list.categories.some((c) => c.id === payload.categoryId)
  if (!categoryExists) throw new Error('分类不存在')

  const estimated = normalizeAmount(payload.estimated)
  const actual = normalizeAmount(payload.actual)
  const brandSpec = (payload.brandSpec || '').trim()
  const note = (payload.note || '').trim()

  if (payload.id) {
    const idx = list.items.findIndex((item) => item.id === payload.id)
    if (idx < 0) throw new Error('条目不存在')
    list.items[idx] = {
      ...list.items[idx],
      categoryId: payload.categoryId,
      name,
      estimated,
      actual,
      brandSpec,
      note
    }
  } else {
    const siblings = list.items.filter((item) => item.categoryId === payload.categoryId)
    const maxOrder = siblings.reduce((m, item) => Math.max(m, item.order || 0), -1)
    list.items.push({
      id: createId(),
      categoryId: payload.categoryId,
      name,
      estimated,
      actual,
      brandSpec,
      note,
      order: maxOrder + 1
    })
  }
  return saveList(list)
}

function deleteItem(listId, itemId) {
  const list = getList(listId)
  list.items = list.items.filter((item) => item.id !== itemId)
  return saveList(list)
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new Error('金额格式不正确')
  }
  return Math.round(n * 100) / 100
}

function countItemsByCategory(list) {
  const map = {}
  ;(list.items || []).forEach((item) => {
    map[item.categoryId] = (map[item.categoryId] || 0) + 1
  })
  return map
}

module.exports = {
  STORAGE_KEY,
  STORE_VERSION,
  loadStore,
  saveStore,
  listSummaries,
  getList,
  saveList,
  createList,
  renameList,
  deleteList,
  replaceListContent,
  sortByOrder,
  upsertCategory,
  deleteCategory,
  moveCategory,
  upsertItem,
  deleteItem,
  countItemsByCategory,
  emptyList,
  emptyStore
}
