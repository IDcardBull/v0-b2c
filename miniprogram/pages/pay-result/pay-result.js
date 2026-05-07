const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    orderId: '',
    order: null,
    loading: true,
    success: false,
  },

  onLoad(options) {
    const mock = options.mock === '1'
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      orderId: options.orderId || options.id || '',
      success: mock,
    })
    if (this.data.orderId) {
      setTimeout(() => this.loadOrder(), mock ? 200 : 800)
    } else {
      this.setData({ loading: false })
    }
  },

  loadOrder() {
    return api.order
      .detail(this.data.orderId)
      .then((data) => {
        const order = adapter.normalizeOrder(data)
        const success =
          order.status === 'pending_ship' ||
          order.status === 'shipped' ||
          order.status === 'completed'
        this.setData({ order, loading: false, success })
        if (order.status === 'pending_pay') {
          setTimeout(() => this.loadOrder(), 4000)
        }
      })
      .catch(() => this.setData({ loading: false }))
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goOrder() {
    wx.redirectTo({
      url: `/pages/order-detail/order-detail?id=${this.data.orderId}`,
    })
  },

  goOrders() {
    wx.redirectTo({ url: '/pages/orders/orders' })
  },
})
