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
      { key: 'feedback', glyph: '问', label: '客户服务', sub: '联系主理人·售后凭证' },
      { key: 'about', glyph: '志', label: '关于釉见', sub: '品牌·匠人' },
    ],
    profileEditorVisible: false,
    profileSaving: false,
    profileForm: {
      nickname: '',
      motto: '',
    },
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
  bootstrap() {
    const token = wx.getStorageSync('token') || app.globalData.token
    if (token) {
      this.loadProfile()
    } else {
      this.silentLogin().catch(() => {})
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
      api.order.list({}).catch(() => []),
    ]).then(([profile, orderList]) => {
      if (profile) {
        this.applyUser(profile)
        wx.setStorageSync('userInfo', profile)
        app.globalData.userInfo = profile
      }
      const normalized = adapter.pickList(orderList).map(adapter.normalizeOrder)
      const counts = normalized.reduce((acc, item) => {
        const key = item.statusKey
        if (!acc[key]) acc[key] = 0
        acc[key] += 1
        return acc
      }, {})
      const orders = this.data.orders.map((o) => ({ ...o, count: counts[o.key] || 0 }))
      this.setData({ orders })
    })
  },
  applyUser(raw) {
    if (!raw) return
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
        motto: u.motto || guestUser.motto,
        collect: u.collect || 0,
        follow: u.follow || 0,
        points: u.points || 0,
        isGuest: false,
      },
    })
  },
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
        api.user.updateProfile({ avatar: url }).catch(() => {})
        wx.showToast({ title: '头像已更新', icon: 'none' })
      })
      .catch((err) => {
        if (err && (err.message === 'CANCELLED' || err.message === 'OVER_SIZE')) return
        wx.showToast({ title: '上传失败', icon: 'none' })
      })
  },
  openProfileEditor() {
    if (this.data.user.isGuest) {
      this.doLogin()
      return
    }
    this.setData({
      profileEditorVisible: true,
      profileForm: {
        nickname: this.data.user.name || '',
        motto: this.data.user.motto || '',
      },
    })
  },
  closeProfileEditor() {
    if (this.data.profileSaving) return
    this.setData({ profileEditorVisible: false })
  },
  onProfileInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`profileForm.${key}`]: e.detail.value })
  },
  saveProfile() {
    if (this.data.profileSaving) return
    const nickname = (this.data.profileForm.nickname || '').trim()
    const motto = (this.data.profileForm.motto || '').trim()
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    const payload = { nickname, name: nickname, motto, signature: motto }
    this.setData({ profileSaving: true })
    api.user.updateProfile(payload)
      .then((profile) => {
        const merged = Object.assign({}, wx.getStorageSync('userInfo') || {}, profile || payload)
        wx.setStorageSync('userInfo', merged)
        app.globalData.userInfo = merged
        this.applyUser(merged)
        this.setData({ profileEditorVisible: false })
        wx.showToast({ title: '已保存', icon: 'none' })
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ profileSaving: false })
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

  onSecretTap() {
    // 7 次连点进入移动端管理工作台；管理员已登录则直接跳工作台
    const adminToken = (app.globalData && app.globalData.adminToken) || wx.getStorageSync('adminToken')
    if (adminToken) {
      wx.navigateTo({ url: '/pages/admin/index/index' })
      return
    }
    const now = Date.now()
    if (!this._secretTaps || now - this._secretTaps.last > 1500) {
      this._secretTaps = { count: 0, last: now }
    }
    this._secretTaps.count += 1
    this._secretTaps.last = now
    if (this._secretTaps.count >= 7) {
      this._secretTaps = null
      wx.navigateTo({ url: '/pages/admin/login/login' })
    } else if (this._secretTaps.count >= 4) {
      wx.showToast({
        title: `还差 ${7 - this._secretTaps.count} 次`,
        icon: 'none',
        duration: 600,
      })
    }
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
    if (key === 'wecom') {
      const currentKey = app.getWecomBotKey ? app.getWecomBotKey() : ''
      wx.showModal({
        title: '企微机器人配置',
        editable: true,
        placeholderText: '请输入 Webhook Key',
        content: currentKey,
        success: (res) => {
          if (res.confirm && res.content) {
            if (app.setWecomBotKey) app.setWecomBotKey(res.content.trim())
            wx.showToast({ title: '配置已保存', icon: 'success' })
          }
        },
      })
      return
    }
    wx.showToast({ title: `${key} 即将开放`, icon: 'none' })
  },
})
