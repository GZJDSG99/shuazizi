const MAGIC = 'decoration-budget-backup'
const MAGIC_V2 = 'qiazhiyisuan-list-backup'
const BACKUP_VERSION = 2

function buildExportPayload(list) {
  return {
    magic: MAGIC_V2,
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    listName: (list && list.name) || '',
    data: {
      name: (list && list.name) || '',
      categories: (list && list.categories) || [],
      items: (list && list.items) || []
    }
  }
}

function stringifyBackup(list) {
  return JSON.stringify(buildExportPayload(list))
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

function parseBackupText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('剪贴板为空')
  }
  const trimmed = text.trim()
  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    throw new Error('不是有效的备份内容')
  }

  let data = parsed
  let listName = ''

  if (parsed && (parsed.magic === MAGIC_V2 || parsed.magic === MAGIC) && parsed.data) {
    data = parsed.data
    listName = parsed.listName || parsed.data.name || ''
  } else if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.items)) {
    data = parsed
    listName = parsed.name || ''
  } else {
    throw new Error('备份格式不正确')
  }

  if (!Array.isArray(data.categories) || !Array.isArray(data.items)) {
    throw new Error('备份缺少分类或条目')
  }

  const categories = data.categories
    .filter((c) => c && c.id && String(c.name || '').trim())
    .map((c, index) => ({
      id: String(c.id),
      name: String(c.name).trim(),
      order: Number.isFinite(Number(c.order)) ? Number(c.order) : index
    }))

  const categoryIds = {}
  categories.forEach((c) => {
    categoryIds[c.id] = true
  })

  const items = data.items
    .filter((item) => item && item.id && item.categoryId && categoryIds[item.categoryId] && String(item.name || '').trim())
    .map((item, index) => ({
      id: String(item.id),
      categoryId: String(item.categoryId),
      name: String(item.name).trim(),
      estimated: normalizeAmount(item.estimated),
      actual: normalizeAmount(item.actual),
      brandSpec: String(item.brandSpec || ''),
      note: String(item.note || ''),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
    }))

  return {
    name: String(listName || data.name || '').trim(),
    categories,
    items
  }
}

function summarize(listLike) {
  return {
    categoryCount: (listLike.categories || []).length,
    itemCount: (listLike.items || []).length,
    name: listLike.name || ''
  }
}

module.exports = {
  MAGIC,
  MAGIC_V2,
  stringifyBackup,
  parseBackupText,
  summarize
}
