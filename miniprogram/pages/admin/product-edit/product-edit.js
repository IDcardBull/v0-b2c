// pages/admin/product-edit/product-edit.js —— 商品 SKU 库存编辑
const app = getApp()
const api = require('../../../utils/api.js')
const adapter = require('../../../utils/adapter.js')

function buildSkuRow(sku) {
  const specText = (() => {
    const specs = sku.specs || sku.spec || {}
    if (typeof specs === 'string') {
      try {
        const obj = JSON.parse(specs)
        return Object.values(obj || {}).join(' · ')
      } catch (e) { return specs }
    }
    return Object.values(specs || {}).join(' · ')
  })()
  const priceCandidate = sku.retailPrice != null ? sku.retailPrice : (sku.price != null ? sku.price : 0)
  return {
    id: sku.id,
    code: sku.code || '',
    specText: specText || '默认规格',
    retailPrice: Number(priceCandidate || 0),
    memberPrice: sku.memberPrice != null ? Number(sku.memberPrice) : null,
    stockOriginal: Number(sku.stock || 0),
    stockInput: String(Number(sku.stock || 0)),
    saving: false,
  }
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    id: 0,
    loading: true,
    product: null,
    skus: [],
    toggleBusy: false,
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      id: Number(options.id || 0),
    })
  },
  onShow() {
    if (!app.globalData.adminToken && !wx.getStorageSync('adminToken')) {
      wx.redirectTo({ url: '/pages/admin/login/login' })
      return
    }
    if (!this.data.id) return wx.navigateBack()
    this.fetch()
  },
  back() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/admin/products/products' }) })
  },
  fetch() {
    this.setData({ loading: true })
    return api.admin.product.detail(this.data.id).then((raw) => {
      const product = adapter.normalizeProduct(raw)
      const rawSkus = Array.isArray(raw && raw.skus) ? raw.skus : (Array.isArray(product.skus) ? product.skus : [])
      const skus = rawSkus.map(buildSkuRow)
      this.setData({ product, skus, loading: false })
    }).catch((err) => {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    })
  },
  onStockInput(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const value = String(e.detail.value || '').replace(/[^0-9-]/g, '')
    this.setData({ [`skus[${idx}].stockInput`]: value })
  },
  step(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const delta = Number(e.currentTarget.dataset.delta)
    const sku = this.data.skus[idx]
    const next = Math.max(0, Number(sku.stockInput || 0) + delta)
    this.setData({ [`skus[${idx}].stockInput`]: String(next) })
  },
  saveStock(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const sku = this.data.skus[idx]
    if (!sku || sku.saving) return
    const stock = Math.max(0, Math.floor(Number(sku.stockInput || 0)))
    if (stock === sku.stockOriginal) return wx.showToast({ title: '未变更', icon: 'none' })
    this.setData({ [`skus[${idx}].saving`]: true })
    api.admin.sku.updateStock(sku.id, stock).then(() => {
      this.setData({
        [`skus[${idx}].stockOriginal`]: stock,
        [`skus[${idx}].saving`]: false,
      })
      wx.showToast({ title: '已保存', icon: 'none' })
    }).catch((err) => {
      this.setData({ [`skus[${idx}].saving`]: false })
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    })
  },
  scanLocate() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        const code = res && res.result
        if (!code) return
        const idx = this.data.skus.findIndex((s) => s.code && String(s.code) === String(code))
        if (idx >= 0) {
          wx.showToast({ title: '已定位 ' + this.data.skus[idx].specText, icon: 'none' })
          // 简单滚动定位：把焦点设到该行（通过 setData 触发滚动）
          this.setData({ [`skus[${idx}].stockInput`]: this.data.skus[idx].stockInput })
        } else {
          wx.showToast({ title: '该商品下没有此 SKU', icon: 'none' })
        }
      },
      fail: () => {},
    })
  },
  toggleListing() {
    if (!this.data.product || this.data.toggleBusy) return
    this.setData({ toggleBusy: true })
    api.admin.product.toggleListing(this.data.id).then(() => {
      wx.showToast({ title: '已切换', icon: 'none' })
      this.fetch().finally(() => this.setData({ toggleBusy: false }))
    }).catch((err) => {
      this.setData({ toggleBusy: false })
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    })
  },
  toggleRetail() {
    if (!this.data.product || this.data.toggleBusy) return
    this.setData({ toggleBusy: true })
    api.admin.product.toggleRetail(this.data.id).then(() => {
      wx.showToast({ title: '零售已切换', icon: 'none' })
      this.fetch().finally(() => this.setData({ toggleBusy: false }))
    }).catch((err) => {
      this.setData({ toggleBusy: false })
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    })
  },
  noop() {},
})
