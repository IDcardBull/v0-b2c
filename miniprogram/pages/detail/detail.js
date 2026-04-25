// pages/detail/detail.js
const app = getApp()
const { products: fallbackProducts } = require('../../utils/data.js')
const { getProduct, getProducts } = require('../../utils/api.js')
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')
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
    loading: true,
  },
  onLoad(options) {
    const id = options.id
    const fallbackItem = products.find((p) => `${p.id}` === `${id}`) || products[0]
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
    this.fetchDetail(id)
    this.fetchRelated(id)
    this.renderDetail(fallbackItem, products.filter((p) => p.id !== fallbackItem.id).slice(0, 6))
    this.loadDetail(id)
    this.refreshCartCount()
  },
  async loadDetail(id) {
    try {
      const data = await api.product.detail(id)
      const item = adapter.normalizeProduct(data)
      let related = []
      try {
        const rec = await api.product.recommend(6)
        related = adapter.normalizeProducts(rec).filter((p) => `${p.id}` !== `${item.id}`)
      } catch (err) {
        related = products.filter((p) => `${p.id}` !== `${item.id}`).slice(0, 6)
      }
      this.renderDetail(item, related)
    } catch (err) {}
  },
  renderDetail(item, related) {
    const gallery = item.gallery && item.gallery.length ? item.gallery : [item.cover, '/images/hero-celadon.jpg', item.cover]
    this.setData({ item, gallery, related })
  },
  onShow() {
    this.refreshCartCount()
  },
  fetchDetail(id) {
    const fb = fallbackProducts.find((p) => p.id === id) || fallbackProducts[0]
    return getProduct(id)
      .then((item) => {
        if (!item) throw new Error('EMPTY')
        this.applyItem(item)
      })
      .catch(() => {
        // 兜底
        this.applyItem(fb)
      })
  },
  applyItem(item) {
    const gallery = (item.images && item.images.length > 0)
      ? item.images
      : item.mainImage ? [item.mainImage] : []
    this.setData({ item, gallery, loading: false })
  },
  fetchRelated(currentId) {
    return getProducts({ pageSize: 8 })
      .then((list) => {
        const arr = (list && list.length > 0 ? list : fallbackProducts).filter(
          (p) => String(p.id) !== String(currentId)
        )
        this.setData({ related: arr.slice(0, 6) })
      })
      .catch(() => {
        const arr = fallbackProducts.filter((p) => String(p.id) !== String(currentId))
        this.setData({ related: arr.slice(0, 6) })
      })
  },
  refreshCartCount() {
    const cart = app.loadCart ? app.loadCart() : (app.globalData.cart || [])
    const count = cart.reduce((s, i) => s + (i.qty || 0), 0)
    this.setData({ cartCount: count })
  },
  onScroll(e) {
    const top = e.detail.scrollTop
    this.setData({ showTitle: top > 600 })
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
    if (!item || !item.id) return
    const cart = app.globalData.cart || []
    const exist = cart.find((i) => i.id === item.id)
    const cart = app.loadCart ? app.loadCart() : (app.globalData.cart || [])
    const skuId = item.skuId || item.id
    const exist = cart.find((i) => `${i.skuId || i.id}` === `${skuId}`)
    if (exist) {
      exist.qty += 1
    } else {
      cart.push({
        id: item.id,
        productId: item.productId || item.id,
        skuId,
        name: item.name,
        sub: item.skuSpec || item.sub,
        price: item.price,
        // 购物袋只需缩略图：取主图作为 cover 字段
        cover: item.mainImage,
        tag: item.tag,
        qty: 1,
        checked: true,
      })
    }
    if (app.saveCart) app.saveCart(cart)
    else app.globalData.cart = cart
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
      title: `釉见 · ${this.data.item.name || ''}`,
      path: `/pages/detail/detail?id=${this.data.item.id || ''}`,
      imageUrl: this.data.item.mainImage || '',
    }
  },
})
