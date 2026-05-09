// pages/admin/products/products.js —— 管理员商品列表
const app = getApp()
const api = require('../../../utils/api.js')
const adapter = require('../../../utils/adapter.js')

const PAGE_SIZE = 20

function statusText(p) {
  const s = p.status == null ? 1 : Number(p.status)
  if (s === 0) return '已下架'
  return p.retailEnabled === false ? '隐藏中' : '在售'
}
function statusKey(p) {
  const s = p.status == null ? 1 : Number(p.status)
  if (s === 0) return 'offline'
  return p.retailEnabled === false ? 'hidden' : 'online'
}

function normalize(p) {
  const product = adapter.normalizeProduct(p)
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    cover: product.cover,
    retailPrice: product.retailPrice || product.price,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    skuCount: (product.skus && product.skus.length) || 0,
    stock: product.stock,
    retailEnabled: product.retailEnabled,
    statusRaw: product.status,
    statusKey: statusKey(product),
    statusText: statusText(product),
    toggling: false,
  }
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    keyword: '',
    list: [],
    page: 1,
    total: 0,
    loading: true,
    loadingMore: false,
    finished: false,
    empty: false,
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
  },
  onShow() {
    if (!app.globalData.adminToken && !wx.getStorageSync('adminToken')) {
      wx.redirectTo({ url: '/pages/admin/login/login' })
      return
    }
    this.refresh()
  },
  onPullDownRefresh() {
    this.refresh().finally(() => wx.stopPullDownRefresh())
  },
  onReachBottom() {
    if (this.data.finished || this.data.loadingMore) return
    this.fetch(this.data.page + 1)
  },
  back() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/admin/index/index' }) })
  },
  refresh() { return this.fetch(1) },
  onKeyword(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() { this.refresh() },
  fetch(page) {
    const isFirst = page === 1
    this.setData(isFirst ? { loading: true } : { loadingMore: true })
    const params = { page, pageSize: PAGE_SIZE, channel: 'all' }
    if (this.data.keyword) params.keyword = this.data.keyword
    return api.admin.product.list(params).then((res) => {
      const records = adapter.pickList(res)
      const list = records.map(normalize)
      const total = Number(res && (res.total || res.count || list.length)) || list.length
      const merged = isFirst ? list : this.data.list.concat(list)
      this.setData({
        list: merged,
        page,
        total,
        finished: merged.length >= total || list.length === 0,
        loading: false,
        loadingMore: false,
        empty: merged.length === 0,
      })
    }).catch(() => this.setData({ loading: false, loadingMore: false, empty: this.data.list.length === 0 }))
  },
  toggleListing(e) {
    const id = e.currentTarget.dataset.id
    const idx = this.data.list.findIndex((p) => p.id === id)
    if (idx < 0) return
    const item = this.data.list[idx]
    if (item.toggling) return
    const key = `list[${idx}].toggling`
    this.setData({ [key]: true })
    api.admin.product.toggleListing(id).then((updated) => {
      const next = updated && typeof updated === 'object'
        ? normalize({ ...item, ...updated })
        : { ...item, statusRaw: item.statusRaw === 0 ? 1 : 0, toggling: false }
      next.toggling = false
      this.setData({ [`list[${idx}]`]: next })
      wx.showToast({ title: next.statusKey === 'online' ? '已上架' : '已下架', icon: 'none' })
    }).catch((err) => {
      this.setData({ [key]: false })
      wx.showToast({ title: err.message || '切换失败', icon: 'none' })
    })
  },
  scanProduct() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        if (res && res.result) this.setData({ keyword: res.result }, () => this.refresh())
      },
      fail: () => {},
    })
  },
  goEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/product-edit/product-edit?id=${id}` })
  },
  noop() {},
})
