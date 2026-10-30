/**
 * 自定义导航栏尺寸（避开右上角胶囊）
 */
function getNavBarLayout() {
  const sys = wx.getSystemInfoSync()
  const statusBarHeight = sys.statusBarHeight || 20
  let menu = null
  try {
    menu = wx.getMenuButtonBoundingClientRect()
  } catch (e) {
    menu = null
  }

  const menuHeight = (menu && menu.height) || 32
  const menuTop = (menu && menu.top) || statusBarHeight + 6
  const menuRightGap = menu
    ? Math.max(sys.windowWidth - menu.right, 8)
    : 8
  const navBarHeight = (menuTop - statusBarHeight) * 2 + menuHeight
  const totalHeight = statusBarHeight + navBarHeight

  return {
    statusBarHeight,
    navBarHeight,
    totalHeight,
    menuHeight,
    menuTop,
    menuRightGap,
    windowWidth: sys.windowWidth
  }
}

module.exports = {
  getNavBarLayout
}
