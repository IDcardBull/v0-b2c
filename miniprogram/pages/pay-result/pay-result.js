const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

Page({
  data: { statusBarHeight: 20, navBarHeight: 44, orderId: '', order: null, pending: false },
  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight, orderId: options.orderId, pending: !!options.pending })
    setTimeout(() => this.loadOrder(), 1200)
  },
  async loadOrder() {
    try {
      const order = adapter.normalizeOrder(await api.order.detail(this.data.orderId))
      this.setData({ order })
      if (order.status === 'pending_pay' && this.data.pending) setTimeout(() => this.loadOrder(), 5000)
    } catch (err) {}
  },
  goHome() { wx.switchTab({ url: '/pages/index/index' }) },
  goOrder() { wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${this.data.orderId}` }) },
})
