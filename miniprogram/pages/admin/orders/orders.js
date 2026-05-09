// pages/admin/orders/orders.js —— 管理员订单列表
const app = getApp()
const api = require('../../../utils/api.js')
const adapter = require('../../../utils/adapter.js')

const TABS = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待付' },
  { key: 'pending_ship', label: '待发' },
  { key: 'shipped', label: '在途' },
  { key: 'completed', label: '已成' },
  { key: 'after_sale', label: '售后' },
]

function pageSize() { return 20 }

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    tabs: TABS,
    status: '',
    keyword: '',
    list: [],
    page: 1,
    total: 0,
    loading: true,
    loadingMore: false,
    finished: false,
    empty: false,
    counts: { all: 0, pending_pay: 0, pending_ship: 0, shipped: 0, completed: 0, after_sale: 0 },
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      status: options.status || '',
    })
  },
  onShow() {
    if (!app.globalData.adminToken && !wx.getStorageSync('adminToken')) {
      wx.redirectTo({ url: '/pages/admin/login/login' })
      return
    }
    this.refresh()
    this.fetchCounts()
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
  fetchCounts() {
    api.admin.order.counts().then((counts) => {
      if (counts) this.setData({ counts: Object.assign({}, this.data.counts, counts) })
    }).catch(() => {})
  },
  switchTab(e) {
    const status = e.currentTarget.dataset.status
    if (status === this.data.status) return
    this.setData({ status })
    this.refresh()
  },
  onKeyword(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() { this.refresh() },
  refresh() { return this.fetch(1) },
  fetch(page) {
    const isFirst = page === 1
    this.setData(isFirst ? { loading: true } : { loadingMore: true })
    const params = { page, pageSize: pageSize() }
    if (this.data.status) params.status = this.data.status
    if (this.data.keyword) params.orderNo = this.data.keyword
    return api.admin.order.list(params)
      .then((res) => {
        const records = adapter.pickList(res)
        const list = records.map(adapter.normalizeOrder)
        const total = Number(res && (res.total || res.count || list.length)) || list.length
        const merged = isFirst ? list : this.data.list.concat(list)
        const finished = merged.length >= total || list.length === 0
        this.setData({
          list: merged,
          page,
          total,
          finished,
          loading: false,
          loadingMore: false,
          empty: merged.length === 0,
        })
      })
      .catch(() => this.setData({ loading: false, loadingMore: false, empty: this.data.list.length === 0 }))
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/order-detail/order-detail?id=${id}` })
  },
  // catchtap 兜底
  noop() {},
})
