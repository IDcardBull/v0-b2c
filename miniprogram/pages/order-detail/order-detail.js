const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

Page({
  data: { statusBarHeight: 20, navBarHeight: 44, id: '', order: null },
  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight, id: options.id })
    this.load()
  },
  async load() {
    try { this.setData({ order: adapter.normalizeOrder(await api.order.detail(this.data.id)) }) } catch (err) {}
  },
  back() { wx.navigateBack({ fail: () => wx.navigateTo({ url: '/pages/orders/orders' }) }) },
  async pay() {
    try {
      const pay = await api.pay.order(this.data.id)
      wx.requestPayment({ ...pay, success: () => wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${this.data.id}` }), fail: () => {} })
    } catch (err) { wx.showModal({ title: '支付暂不可用', content: err.message || '请联系管理员处理支付配置', showCancel: false }) }
  },
  cancel() {
    wx.showModal({ title: '取消订单', content: '确定取消此订单？', success: async (res) => { if (res.confirm) { await api.order.cancel(this.data.id); this.load() } } })
  },
  async confirm() { await api.order.confirm(this.data.id); this.load() },
})
