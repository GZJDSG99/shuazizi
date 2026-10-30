const { getNavBarLayout } = require('./utils/navbar')

App({
  onLaunch() {
    this.globalData.nav = getNavBarLayout()
  },
  globalData: {
    nav: null
  }
})
