// app.js
App({
  onLaunch() {
    // 获取系统信息以便自定义导航栏计算状态栏高度
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const menu = wx.getMenuButtonBoundingClientRect()
    this.globalData.statusBarHeight = sys.statusBarHeight || 20
    this.globalData.menuRect = menu
    // 自定义导航栏高度 = 胶囊上边距与状态栏间距 * 2 + 胶囊高度
    this.globalData.navBarHeight =
      (menu.top - sys.statusBarHeight) * 2 + menu.height
  },
  globalData: {
    statusBarHeight: 20,
    navBarHeight: 44,
    menuRect: null,
    // 购物袋数据（内存态，真实项目请接入后端）
    cart: [],
  },
})
