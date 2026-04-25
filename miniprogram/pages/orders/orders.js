const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

const tabs = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待付款' },
  { key: 'pending_ship', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
]

Page({
  data: { statusBarHeight: 20, navBarHeight: 44, tabs, current: '', list: [], page: 1, pageSize: 10, finished: false, loading: false },
  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight, current: options.status || '' })
  },
  onShow() { this.refresh() },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) }) },
  tapTab(e) { this.setData({ current: e.currentTarget.dataset.key }); this.refresh() },
  refresh() { this.setData({ page: 1, list: [], finished: false }); this.loadList(true) },
  async loadList(reset) {
    if (this.data.loading || (!reset && this.data.finished)) return
    this.setData({ loading: true })
    try {
      const params = { page: this.data.page, pageSize: this.data.pageSize }
      if (this.data.current) params.status = this.data.current
      const data = await api.order.list(params)
      const list = adapter.pickList(data).map(adapter.normalizeOrder)
      this.setData({ list: reset ? list : this.data.list.concat(list), page: this.data.page + 1, finished: list.length < this.data.pageSize, loading: false })
    } catch (err) { this.setData({ loading: false }) }
  },
  goDetail(e) { wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${e.currentTarget.dataset.id}` }) },
})
