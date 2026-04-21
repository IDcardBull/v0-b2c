// pages/profile/profile.js
const app = getApp()
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
      collect: 12,
      follow: 48,
      points: 1680,
    },
    orders: [
      { key: 'unpaid', glyph: '款', label: '待付款', count: 1 },
      { key: 'unship', glyph: '制', label: '待发货', count: 0 },
      { key: 'shipped', glyph: '途', label: '待收货', count: 2 },
      { key: 'done', glyph: '成', label: '已完成', count: 0 },
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
  },
  goSetting() {
    wx.showActionSheet({
      itemList: ['账户设置', '通知偏好', '退出登录'],
      success: () => wx.showToast({ title: '设置即将开放', icon: 'none' }),
      fail: () => {},
    })
  },
  goOrders() {
    wx.showToast({ title: '订单中心即将开放', icon: 'none' })
  },
  goOrderTab(e) {
    const key = e.currentTarget.dataset.key
    wx.showToast({ title: `进入 ${key}`, icon: 'none' })
  },
  onMenu(e) {
    const key = e.currentTarget.dataset.key
    wx.showToast({ title: `${key} 即将开放`, icon: 'none' })
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
})
