const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    loading: false,
    redirect: '',
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      redirect: options.redirect ? decodeURIComponent(options.redirect) : '',
    })
  },
  async login() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      await app.miniLogin()
      wx.showToast({ title: '已入席', icon: 'none' })
      setTimeout(() => {
        const target = this.data.redirect
        if (target && target !== '/pages/login/login') {
          const tabRoutes = ['/pages/index/index', '/pages/category/category', '/pages/cart/cart', '/pages/profile/profile']
          if (tabRoutes.includes(target)) wx.switchTab({ url: target })
          else wx.redirectTo({ url: target })
        } else {
          wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) })
        }
      }, 300)
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },
})
