// pages/detail/detail.js
const app = getApp()
const fallback = require('../../utils/data.js')
const api = require('../../utils/api.js')

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

    // 规格选择浮层
    sheetVisible: false,
    sheetAction: 'cart', // 'cart' | 'buy'
    selection: {},
    selectedSku: null,
    optionView: [], // 渲染用：[{name, values:[{value, selected, disabled}]}]
    qty: 1,
    pickedSpecText: '',
  },
  onLoad(options) {
    const id = options.id
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
    // 先用本地兜底兜一下，避免白屏
    const fb = fallback.products.find((p) => `${p.id}` === `${id}`) || fallback.products[0]
    if (fb) this.applyItem({ ...fb, skus: [], specOptions: [] })
    this.fetchDetail(id)
    this.fetchRelated(id)
    this.refreshCartCount()
  },
  onShow() {
    this.refreshCartCount()
  },
  fetchDetail(id) {
    return api.product.detail(id)
      .then((raw) => {
        const raw = data
        if (!raw || raw.retailEnabled !== true) {
          wx.showToast({ title: '商品已下架', icon: 'none' })
          this.setData({ loading: false })
          return
        }
        const item = api.normalizeProduct(raw)
        if (!item) throw new Error('EMPTY')
        this.applyItem(item)
      })
      .catch(() => {
        this.setData({ loading: false })
      })
  },
  applyItem(item) {
    const gallery = item.images && item.images.length > 0
      ? item.images
      : item.mainImage ? [item.mainImage] : []
    const skus = item.skus || []
    const selection = api.defaultSelection(skus)
    const selectedSku = api.findSkuBySelection(skus, selection)
    this.setData({
      item,
      gallery,
      loading: false,
      selection,
      selectedSku,
      pickedSpecText: this.formatPicked(item.specOptions, selection),
    })
    this.rebuildOptionView()
  },
  formatPicked(options, selection) {
    if (!options || !options.length) return ''
    const picked = options
      .filter((o) => selection[o.name])
      .map((o) => selection[o.name])
    return picked.join(' · ')
  },
  rebuildOptionView() {
    const { item, selection } = this.data
    const options = (item && item.specOptions) || []
    const optionView = options.map((opt) => ({
      name: opt.name,
      values: opt.values.map((v) => ({
        value: v,
        selected: selection[opt.name] === v,
      })),
    }))
    this.setData({ optionView })
  },
  fetchRelated(currentId) {
    return api.getProducts({ pageSize: 8, channel: 'retail' })
      .then((list) => {
        const arr = (list && list.length > 0 ? list : fallback.products).filter(
          (p) => String(p.id) !== String(currentId),
        )
        this.setData({ related: arr.slice(0, 6) })
      })
      .catch(() => {
        const arr = fallback.products.filter((p) => String(p.id) !== String(currentId))
        this.setData({ related: arr.slice(0, 6) })
      })
  },
  refreshCartCount() {
    const cart = app.loadCart ? app.loadCart() : (app.globalData.cart || [])
    const count = cart.reduce((s, i) => s + (i.qty || 0), 0)
    this.setData({ cartCount: count })
  },
  onScroll(e) {
    this.setData({ showTitle: e.detail.scrollTop > 600 })
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

  // ========= 规格浮层 =========
  openSheet(e) {
    const action = (e.currentTarget && e.currentTarget.dataset.action) || 'cart'
    const item = this.data.item
    if (!item || !item.id) return
    if (!item.skus || item.skus.length === 0) {
      wx.showToast({ title: '商品资料同步中', icon: 'none' })
      return
    }
    this.setData({ sheetVisible: true, sheetAction: action, qty: 1 })
  },
  closeSheet() { this.setData({ sheetVisible: false }) },
  noop() {},
  pickSpec(e) {
    const { name, value } = e.currentTarget.dataset
    const selection = { ...this.data.selection, [name]: value }
    const sku = api.findSkuBySelection(this.data.item.skus || [], selection)
    this.setData({
      selection,
      selectedSku: sku,
      pickedSpecText: this.formatPicked(this.data.item.specOptions, selection),
    })
    this.rebuildOptionView()
  },
  qtyMinus() { this.setData({ qty: Math.max(1, this.data.qty - 1) }) },
  qtyPlus() {
    const max = (this.data.selectedSku && this.data.selectedSku.stock) || 99
    this.setData({ qty: Math.min(Math.max(1, max), this.data.qty + 1) })
  },
  confirmSheet() {
    const { item, selectedSku, qty, sheetAction, selection } = this.data
    const optCount = (item.specOptions || []).length
    if (optCount > 0 && Object.keys(selection).length < optCount) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (!selectedSku) {
      wx.showToast({ title: '此规格暂无库存', icon: 'none' })
      return
    }
    if ((selectedSku.stock || 0) < qty) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }
    if (item.retailEnabled !== true) {
      wx.showToast({ title: '商品暂不支持零售购买', icon: 'none' })
      this.setData({ sheetVisible: false })
      return
    }
    const cart = app.loadCart ? app.loadCart() : (app.globalData.cart || [])
    const existIdx = cart.findIndex((i) => `${i.skuId}` === `${selectedSku.id}`)
    let entry
    if (existIdx >= 0) {
      cart[existIdx].qty = Math.min((cart[existIdx].qty || 0) + qty, selectedSku.stock || 99)
      entry = cart[existIdx]
    } else {
      entry = {
        id: item.id,
        productId: item.id,
        skuId: selectedSku.id,
        name: item.name,
        sub: item.sub,
        skuSpec: selectedSku.specText || this.formatPicked(item.specOptions, selection),
        price: selectedSku.price,
        cover: selectedSku.image || item.mainImage,
        tag: item.tag,
        stock: selectedSku.stock,
        qty: qty,
        checked: true,
      }
      cart.push(entry)
    }
    if (app.saveCart) app.saveCart(cart)
    else app.globalData.cart = cart
    this.refreshCartCount()
    this.setData({ sheetVisible: false })

    if (sheetAction === 'buy') {
      const checkoutItem = { ...entry, qty: qty } // 立即请购仅结算本次数量
      wx.setStorageSync('checkoutItems', [checkoutItem])
      wx.setStorageSync('checkoutNote', '')
      wx.navigateTo({ url: '/pages/checkout/checkout' })
    } else {
      wx.showToast({ title: '已入袋', icon: 'none' })
    }
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
