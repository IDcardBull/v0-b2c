// app.js
const api = require('./utils/api.js')

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
    this.globalData.adminToken = wx.getStorageSync('adminToken') || ''
    this.globalData.adminInfo = wx.getStorageSync('adminInfo') || null
  },
  miniLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          try {
            if (!res.code) throw new Error('wx.login 未返回 code，请确认开发者工具已使用真实 AppID 并重新打开项目')
            const data = await api.auth.miniLogin(res.code)
            // 后端 dev fallback：jscode2session 失败时给的占位 openid，无法发起真实支付
            if (data?.dev) {
              console.warn(
                '[miniLogin] 命中后端 dev fallback，原因:', data.reason,
                '\n→ openid 是假的，下单后支付会被拒绝。\n' +
                '请检查：\n' +
                '  1. 微信开发者工具 → 详情 → 项目设置 中的 AppID 是否与后端 .env 的 WX_APPID 一致\n' +
                '  2. server/.env 的 WX_SECRET 是否正确\n' +
                '  3. 真机调试时 server 必须能联网访问 api.weixin.qq.com',
              )
            }
            wx.setStorageSync('token', data.token)
            wx.setStorageSync('userInfo', data.user)
            this.globalData.token = data.token
            this.globalData.userInfo = data.user
            this.globalData.isDevLogin = !!data?.dev
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
  setAdmin(payload) {
    if (!payload) return
    const token = payload.token || ''
    const user = payload.user || null
    this.globalData.adminToken = token
    this.globalData.adminInfo = user
    if (token) wx.setStorageSync('adminToken', token)
    if (user) wx.setStorageSync('adminInfo', user)
  },
  clearAdmin() {
    this.globalData.adminToken = ''
    this.globalData.adminInfo = null
    wx.removeStorageSync('adminToken')
    wx.removeStorageSync('adminInfo')
  },
  ensureAdmin(redirect) {
    const token = this.globalData.adminToken || wx.getStorageSync('adminToken')
    if (token) return Promise.resolve()
    const url = redirect
      ? '/pages/admin/login/login?redirect=' + encodeURIComponent(redirect)
      : '/pages/admin/login/login'
    return new Promise((resolve, reject) => {
      wx.navigateTo({ url, success: resolve, fail: reject })
    })
  },


  // 企微机器人改由服务端 WorkWxService 通过 server/.env WORK_WX_BOT_WEBHOOK 推送，
  // 客户端不再调用 qyapi.weixin.qq.com（小程序合法域名白名单不允许）。
  globalData: {
    statusBarHeight: 20,
    navBarHeight: 44,
    menuRect: null,
    token: '',
    userInfo: null,
    cart: [],
    pendingCategory: null,
    adminToken: '',
    adminInfo: null,
  },
})
