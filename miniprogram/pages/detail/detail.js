// pages/detail/detail.js
const app = getApp()
const { products } = require('../../utils/data.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    item: {},
    gallery: [],
    galleryIdx: 0,
    related: [],
    collected: false,
    showTitle: false,
    cartCount: 0,
  },
  onLoad(options) {
    const id = options.id
    const item = products.find((p) => p.id === id) || products[0]
    const gallery = [
      item.cover,
      '/images/hero-celadon.jpg',
      item.cover,
    ]
    const related = products.filter((p) => p.id !== item.id).slice(0, 6)
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      item,
      gallery,
      related,
    })
    this.refreshCartCount()
  },
  onShow() {
    this.refreshCartCount()
  },
  refreshCartCount() {
    const cart = app.globalData.cart || []
    const count = cart.reduce((s, i) => s + (i.qty || 0), 0)
    this.setData({ cartCount: count })
  },
  onScroll(e) {
    const top = e.detail.scrollTop
    this.setData({ showTitle: top > 600 })
    // 导航背景随滚动渐显（通过 setData 类切换亦可；此处保持轻量）
  },
  onSwiper(e) {
    this.setData({ galleryIdx: e.detail.current })
  },
  back() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/index/index' })
  },
  share() {
    wx.showActionSheet({
      itemList: ['分享给朋友', '生成海报', '复制链接'],
      fail: () => {},
    })
  },
  toggleCollect() {
    this.setData({ collected: !this.data.collected })
    wx.showToast({
      title: this.data.collected ? '已纳入雅藏' : '已移出雅藏',
      icon: 'none',
    })
  },
  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },
  goService() {
    wx.navigateTo({ url: '/pages/feedback/feedback?type=consult' })
  },
  viewMaker() {
    wx.showToast({ title: '作坊志即将开放', icon: 'none' })
  },
  addToCart() {
    const { item } = this.data
    const cart = app.globalData.cart || []
    const exist = cart.find((i) => i.id === item.id)
    if (exist) {
      exist.qty += 1
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        sub: item.sub,
        price: item.price,
        cover: item.cover,
        tag: item.tag,
        qty: 1,
        checked: true,
      })
    }
    app.globalData.cart = cart
    this.refreshCartCount()
    wx.showToast({ title: '已入袋', icon: 'none' })
  },
  buyNow() {
    this.addToCart()
    setTimeout(() => wx.switchTab({ url: '/pages/cart/cart' }), 300)
  },
  goOther(e) {
    const id = e.currentTarget.dataset.id
    wx.redirectTo({ url: `/pages/detail/detail?id=${id}` })
  },
  onShareAppMessage() {
    return {
      title: `央茗 · ${this.data.item.name}`,
      path: `/pages/detail/detail?id=${this.data.item.id}`,
    }
  },
})
