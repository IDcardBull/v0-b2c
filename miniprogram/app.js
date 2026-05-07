// app.js
const api = require('./utils/api.js')
const wecomBot = require('./utils/wecom-bot.js')

App({
  onLaunch() {
    const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const menu = wx.getMenuButtonBoundingClientRect()
    this.globalData.statusBarHeight = sys.statusBarHeight || 20
    this.globalData.menuRect = menu
    this.globalData.navBarHeight =
      (menu.top - sys.statusBarHeight) * 2 + menu.height
    this.globalData.token = wx.getStorageSync('token') || ''
    this.globalData.userInfo = wx.getStorageSync('userInfo') || null
    this.globalData.cart = wx.getStorageSync('cart') || []
  },
  miniLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          try {
            if (!res.code) throw new Error('wx.login 未返回 code，请确认开发者工具已使用真实 AppID 并重新打开项目')
            const data = await api.auth.miniLogin(res.code)
            wx.setStorageSync('token', data.token)
            wx.setStorageSync('userInfo', data.user)
            this.globalData.token = data.token
            this.globalData.userInfo = data.user
            resolve(data)
          } catch (err) {
            reject(err)
          }
        },
        fail: reject,
      })
    })
  },
  ensureLogin() {
    if (this.globalData.token || wx.getStorageSync('token')) return Promise.resolve()
    return new Promise((resolve, reject) => {
      wx.navigateTo({
        url: '/pages/login/login',
        success: resolve,
        fail: reject,
      })
    })
  },
  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    this.globalData.cart = cart
    return cart
  },
  saveCart(cart) {
    this.globalData.cart = cart || []
    wx.setStorageSync('cart', this.globalData.cart)
  },
  clearLogin() {
    this.globalData.token = ''
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  },

  // 设置企微机器人 key
  setWecomBotKey(key) {
    wecomBot.setBotKey(key)
  },

  // 获取企微机器人 key
  getWecomBotKey() {
    return wecomBot.getBotKey()
  },
  globalData: {
    statusBarHeight: 20,
    navBarHeight: 44,
    menuRect: null,
    token: '',
    userInfo: null,
    cart: [],
    pendingCategory: null,
  },
})
