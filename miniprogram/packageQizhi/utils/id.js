function createId() {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${Date.now().toString(36)}_${rand}`
}

module.exports = {
  createId
}
