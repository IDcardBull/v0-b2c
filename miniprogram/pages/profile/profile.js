// pages/profile/profile.js
const app = getApp()
const { chooseAndUpload } = require('../../utils/upload.js')
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

const guestUser = {
  initial: '釉',
  name: '未入席',
  level: '点击登录',
  motto: '一盏清茗，静听风声。',
  collect: 0,
  follow: 0,
  points: 0,
  avatar: '',
  isGuest: true,
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    user: guestUser,
    orders: [
      { key: 'pending_pay', glyph: '款', label: '待付款', count: 0 },
      { key: 'pending_ship', glyph: '制', label: '待发货', count: 0 },
      { key: 'shipped', glyph: '途', label: '待收货', count: 0 },
      { key: 'completed', glyph: '成', label: '已完成', count: 0 },
    ],
    menu: [
      { key: 'address', glyph: '址', label: '地址簿', sub: '收件人·配送地址' },
      { key: 'coupon', glyph: '券', label: '我的券', sub: '手作券·典藏券' },
      { key: 'review', glyph: '评', label: '晒图评价', sub: '一器一感·一图一字' },
      { key: 'footprint', glyph: '迹', label: '足迹', sub: '近日所观之器' },
      { key: 'custom', glyph: '定', label: '定制订做', sub: '一器一议' },
      { key: 'feedback', glyph: '问', label: '客户服务', sub: '联系主理人·售后凭证' },
      { key: 'about', glyph: '志', label: '关于釉见', sub: '品牌·匠人' },
    ],
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    this.bootstrap()
  },
  // 入口：未登录则静默走微信登录拿 token，再加载资料
  bootstrap() {
    const token = wx.getStorageSync('token') || app.globalData.token
    if (token) {
      this.loadProfile()
    } else {
      this.silentLogin().catch(() => {
        // 登录失败保持游客态，等用户主动点头像或登录按钮
      })
    }
  },
  silentLogin() {
    if (!app.miniLogin) return Promise.reject(new Error('miniLogin 未注册'))
    return app.miniLogin().then(() => this.loadProfile())
  },
  loadProfile() {
    const cached = wx.getStorageSync('userInfo') || app.globalData.userInfo
    if (cached) this.applyUser(cached)
    return Promise.all([
      api.user.profile().catch(() => null),
      api.order.counts().catch(() => null),
    ]).then(([profile, counts]) => {
      if (profile) {
        this.applyUser(profile)
        wx.setStorageSync('userInfo', profile)
        app.globalData.userInfo = profile
      }
      if (counts && typeof counts === 'object') {
        const orders = this.data.orders.map((o) => ({ ...o, count: counts[o.key] || 0 }))
        this.setData({ orders })
      }
    })
  },
  applyUser(raw) {
    const u = adapter.normalizeUser(raw) || {}
    const avatar = raw.avatar || raw.avatarUrl || wx.getStorageSync('user_avatar') || ''
    const nickname = u.name && u.name !== '无名氏' ? u.name : raw.nickname || raw.nickName || '微信用户'
    this.setData({
      user: {
        ...guestUser,
        ...u,
        name: nickname,
        avatar: avatar,
        level: u.level || '入席·甲',
        collect: raw.collectCount || raw.favoriteCount || u.collect || 0,
        follow: raw.followCount || raw.footprintCount || u.follow || 0,
        points: raw.points || u.points || 0,
        isGuest: false,
      },
    })
  },
  // 头像点击：未登录引导登录；已登录则上传头像
  onAvatarTap() {
    if (this.data.user.isGuest) {
      this.doLogin()
      return
    }
    chooseAndUpload({ count: 1, sourceType: ['album', 'camera'] })
      .then((urls) => {
        const url = urls[0]
        wx.setStorageSync('user_avatar', url)
        this.setData({ 'user.avatar': url })
        // 同步到后端
        api.user.updateProfile({ avatar: url }).catch(() => {})
        wx.showToast({ title: '头像已更新', icon: 'none' })
      })
      .catch((err) => {
        if (err && (err.message === 'CANCELLED' || err.message === 'OVER_SIZE')) return
        wx.showToast({ title: '上传失败', icon: 'none' })
      })
  },
  doLogin() {
    wx.showLoading({ title: '入席中', mask: true })
    this.silentLogin()
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已入席', icon: 'none' })
      })
      .catch(() => {
        wx.hideLoading()
        wx.navigateTo({ url: '/pages/login/login?redirect=%2Fpages%2Fprofile%2Fprofile' })
      })
  },
  goSetting() {
    if (this.data.user.isGuest) {
      this.doLogin()
      return
    }
    wx.showActionSheet({
      itemList: ['账户设置', '通知偏好', '退出登录'],
      success: (res) => {
        if (res.tapIndex === 2) {
          if (app.clearLogin) app.clearLogin()
          wx.removeStorageSync('user_avatar')
          this.setData({ user: guestUser, orders: this.data.orders.map((o) => ({ ...o, count: 0 })) })
          wx.showToast({ title: '已退出', icon: 'none' })
        } else {
          wx.showToast({ title: '设置即将开放', icon: 'none' })
        }
      },
      fail: () => {},
    })
  },
  ensureLoggedIn(redirect) {
    if (!this.data.user.isGuest) return true
    wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent(redirect || '/pages/profile/profile') })
    return false
  },
  goOrders() {
    if (!this.ensureLoggedIn('/pages/orders/orders')) return
    wx.navigateTo({ url: '/pages/orders/orders' })
  },
  goOrderTab(e) {
    const key = e.currentTarget.dataset.key
    if (!this.ensureLoggedIn('/pages/orders/orders')) return
    wx.navigateTo({ url: `/pages/orders/orders?status=${key}` })
  },
  onMenu(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'review') {
      wx.navigateTo({ url: '/pages/review/review' })
      return
    }
    if (key === 'feedback') {
      wx.navigateTo({ url: '/pages/feedback/feedback' })
      return
    }
    if (key === 'address') {
      if (!this.ensureLoggedIn('/pages/address/address')) return
      wx.navigateTo({ url: '/pages/address/address' })
      return
    }
    wx.showToast({ title: `${key} 即将开放`, icon: 'none' })
  },
})
