const app = getApp()
const api = require('../../utils/api.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    loading: false,
    redirect: '',
    avatarUrl: '',
    nickName: '',
    isReturningUser: false,
    canSubmit: false,
  },
  onLoad(options) {
    const cached = wx.getStorageSync('userInfo') || {}
    const avatarUrl = cached.avatar || cached.avatarUrl || ''
    const nickName = cached.nickname || cached.nickName || cached.name || ''
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      redirect: options.redirect ? decodeURIComponent(options.redirect) : '',
      avatarUrl,
      nickName,
      isReturningUser: !!(cached && (cached.id || cached.nickname || cached.nickName || cached.name)),
      canSubmit: !!(avatarUrl && nickName),
    })
  },
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl || ''
    this.setData({ avatarUrl, canSubmit: !!(avatarUrl && this.data.nickName.trim()) })
  },
  onNickInput(e) {
    const nickName = e.detail.value
    this.setData({ nickName, canSubmit: !!(this.data.avatarUrl && nickName.trim()) })
  },
  async login() {
    if (this.data.loading || !this.data.canSubmit) return
    const nickName = (this.data.nickName || '').trim()
    this.setData({ loading: true })
    try {
      const loginData = await app.miniLogin()
      const profile = {
        avatar: this.data.avatarUrl,
        avatarUrl: this.data.avatarUrl,
        nickname: nickName,
        nickName,
        name: nickName,
      }
      const savedProfile = await api.user.updateProfile(profile).catch(() => null)
      const merged = Object.assign({}, loginData.user || {}, profile, savedProfile || {})
      wx.setStorageSync('userInfo', merged)
      app.globalData.userInfo = merged
      wx.showToast({ title: this.data.isReturningUser ? '欢迎回来' : '已完成入席', icon: 'none' })
      setTimeout(() => this.redirectAfterLogin(), 320)
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
  redirectAfterLogin() {
    const target = this.data.redirect
    if (target && target !== '/pages/login/login') {
      const tabRoutes = ['/pages/index/index', '/pages/category/category', '/pages/cart/cart', '/pages/profile/profile']
      if (tabRoutes.includes(target)) wx.switchTab({ url: target })
      else wx.redirectTo({ url: target })
      return
    }
    wx.switchTab({ url: '/pages/index/index' })
  },
  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },
})
