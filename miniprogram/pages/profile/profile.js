// pages/profile/profile.js
const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')
const { products } = require('../../utils/data.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    user: {
      initial: '茗',
      name: '无名氏',
      level: '入席·甲',
      motto: '一盏清茗，静听风声。',
      collect: 0,
      follow: 0,
      points: 0,
    },
    orders: [
      { key: 'pending_pay', glyph: '款', label: '待付款', count: 0 },
      { key: 'pending_ship', glyph: '制', label: '待发货', count: 0 },
      { key: 'shipped', glyph: '途', label: '待收货', count: 0 },
      { key: 'completed', glyph: '成', label: '已完成', count: 0 },
    ],
    collected: [],
    menu: [
      { key: 'address', glyph: '址', label: '地址簿', sub: '收件人·配送地址' },
      { key: 'coupon', glyph: '券', label: '我的券', sub: '手作券·典藏券' },
      { key: 'footprint', glyph: '迹', label: '足迹', sub: '近日所观之器' },
      { key: 'custom', glyph: '定', label: '定制订做', sub: '一器一议' },
      { key: 'service', glyph: '问', label: '客户服务', sub: '联系主理人' },
      { key: 'about', glyph: '志', label: '关于央茗', sub: '品牌·匠人' },
    ],
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      collected: products.slice(0, 5),
    })
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    this.loadProfile()
  },
  async loadProfile() {
    if (!wx.getStorageSync('token')) return
    try {
      const [profile, counts] = await Promise.all([api.user.profile(), api.order.counts()])
      const user = adapter.normalizeUser(profile)
      const orders = this.data.orders.map((item) => ({ ...item, count: counts[item.key] || 0 }))
      this.setData({ user, orders })
    } catch (err) {}
  },
  goSetting() {
    wx.showActionSheet({
      itemList: ['账户设置', '通知偏好', '退出登录'],
      success: (res) => {
        if (res.tapIndex === 2) {
          app.clearLogin()
          wx.showToast({ title: '已退出', icon: 'none' })
          this.setData({ user: adapter.normalizeUser(null) })
        } else {
          wx.showToast({ title: '设置即将开放', icon: 'none' })
        }
      },
      fail: () => {},
    })
  },
  goOrders() {
    if (!wx.getStorageSync('token')) {
      wx.navigateTo({ url: '/pages/login/login?redirect=%2Fpages%2Fprofile%2Fprofile' })
      return
    }
    wx.navigateTo({ url: '/pages/orders/orders' })
  },
  goOrderTab(e) {
    const key = e.currentTarget.dataset.key
    if (!wx.getStorageSync('token')) {
      wx.navigateTo({ url: '/pages/login/login?redirect=%2Fpages%2Fprofile%2Fprofile' })
      return
    }
    wx.navigateTo({ url: `/pages/orders/orders?status=${key}` })
  },
  onMenu(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'address') {
      if (!wx.getStorageSync('token')) {
        wx.navigateTo({ url: '/pages/login/login?redirect=%2Fpages%2Faddress%2Faddress' })
        return
      }
      wx.navigateTo({ url: '/pages/address/address' })
      return
    }
    wx.showToast({ title: `${key} 即将开放`, icon: 'none' })
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
})
