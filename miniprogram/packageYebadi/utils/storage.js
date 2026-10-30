const KEY = 'tool_yebadi_v1'
const PRESETS = [30, 60, 90, 120]
const MIN_REST = 5
const MAX_REST = 600

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function defaultState() {
  return {
    version: 1,
    actionName: '当前动作',
    restSeconds: 60,
    sets: 0,
    doneActions: [],
    updatedAt: Date.now()
  }
}

function clampRest(sec) {
  const n = Math.round(Number(sec))
  if (!Number.isFinite(n)) return 60
  return Math.min(MAX_REST, Math.max(MIN_REST, n))
}

function normalizeDone(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => ({
      id: item.id || createId(),
      name: (item.name && String(item.name).trim()) || '未命名',
      sets: Math.max(0, Math.floor(Number(item.sets) || 0)),
      at: item.at || Date.now()
    }))
    .slice(0, 50)
}

function load() {
  try {
    const raw = wx.getStorageSync(KEY)
    if (!raw || typeof raw !== 'object') {
      const fresh = defaultState()
      save(fresh)
      return fresh
    }
    return {
      version: 1,
      actionName: (raw.actionName && String(raw.actionName).trim()) || '当前动作',
      restSeconds: clampRest(raw.restSeconds),
      sets: Math.max(0, Math.floor(Number(raw.sets) || 0)),
      doneActions: normalizeDone(raw.doneActions),
      updatedAt: raw.updatedAt || Date.now()
    }
  } catch (e) {
    return defaultState()
  }
}

function save(state) {
  const next = {
    version: 1,
    actionName: (state.actionName && String(state.actionName).trim()) || '当前动作',
    restSeconds: clampRest(state.restSeconds),
    sets: Math.max(0, Math.floor(Number(state.sets) || 0)),
    doneActions: normalizeDone(state.doneActions),
    updatedAt: Date.now()
  }
  wx.setStorageSync(KEY, next)
  return next
}

function update(partial) {
  const cur = load()
  return save({ ...cur, ...partial })
}

function addDoneAction(name, sets) {
  const cur = load()
  const item = {
    id: createId(),
    name: (name && String(name).trim()) || '未命名',
    sets: Math.max(0, Math.floor(Number(sets) || 0)),
    at: Date.now()
  }
  const doneActions = [item, ...cur.doneActions].slice(0, 50)
  return save({ ...cur, doneActions })
}

function removeDoneAction(id) {
  const cur = load()
  const doneActions = cur.doneActions.filter((item) => item.id !== id)
  return save({ ...cur, doneActions })
}

module.exports = {
  KEY,
  PRESETS,
  MIN_REST,
  MAX_REST,
  clampRest,
  createId,
  load,
  save,
  update,
  addDoneAction,
  removeDoneAction
}
