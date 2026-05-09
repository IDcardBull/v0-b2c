// pages/admin/login/login.js
const app = getApp()
const api = require('../../../utils/api.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    redirect: '',
    username: '',
    password: '',
    loading: false,
    error: '',
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      redirect: options.redirect ? decodeURIComponent(options.redirect) : '',
      username: wx.getStorageSync('lastAdminUsername') || '',
    })
  },
  onUsername(e) { this.setData({ username: e.detail.value, error: '' }) },
  onPassword(e) { this.setData({ password: e.detail.value, error: '' }) },
  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) })
  },
  async submit() {
    if (this.data.loading) return
    const username = (this.data.username || '').trim()
    const password = this.data.password || ''
    if (!username) return this.setData({ error: '请输入账号' })
    if (password.length < 6) return this.setData({ error: '密码至少 6 位' })
    this.setData({ loading: true, error: '' })
    try {
      const data = await api.admin.login(username, password)
      app.setAdmin(data)
      wx.setStorageSync('lastAdminUsername', username)
      wx.showToast({ title: '已进入工作台', icon: 'none' })
      const target = this.data.redirect || '/pages/admin/index/index'
      setTimeout(() => {
        wx.redirectTo({
          url: target,
          fail: () => wx.redirectTo({ url: '/pages/admin/index/index' }),
        })
      }, 240)
    } catch (err) {
      this.setData({ error: (err && err.message) || '登录失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
