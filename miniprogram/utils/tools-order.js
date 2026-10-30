const KEY = 'tools_order_v1'

function loadOrder() {
  try {
    const raw = wx.getStorageSync(KEY)
    if (!Array.isArray(raw)) return []
    return raw.map((id) => String(id)).filter(Boolean)
  } catch (e) {
    return []
  }
}

function saveOrder(ids) {
  const next = (ids || []).map((id) => String(id)).filter(Boolean)
  wx.setStorageSync(KEY, next)
  return next
}

function applyOrder(tools) {
  const list = Array.isArray(tools) ? tools.slice() : []
  const order = loadOrder()
  if (!order.length || !list.length) return list

  const map = {}
  list.forEach((t) => {
    map[t.id] = t
  })

  const sorted = []
  order.forEach((id) => {
    if (map[id]) {
      sorted.push(map[id])
      delete map[id]
    }
  })
  // 新工具追加到末尾
  list.forEach((t) => {
    if (map[t.id]) sorted.push(t)
  })
  return sorted
}

module.exports = {
  KEY,
  loadOrder,
  saveOrder,
  applyOrder
}
