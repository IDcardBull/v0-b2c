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
    paying: false,
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      orderId: options.orderId || options.id || '',
    })
    if (this.data.orderId) {
      // 进页面立即查一次订单状态，回调可能略有延迟，再补一次轮询
      setTimeout(() => this.loadOrder(), 600)
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
          // 微信回调有时延迟，pending_pay 状态下继续轮询几次
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

  /**
   * 再次支付：未付款状态下让用户重新唤起微信收银台
   */
  retryPay() {
    if (!this.data.orderId || this.data.paying) return
    this.setData({ paying: true })
    wx.showLoading({ title: '请稍候', mask: true })
    api.pay
      .order(this.data.orderId)
      .then((params) => {
        wx.hideLoading()
        if (!params || !params.timeStamp || !params.paySign) {
          this.setData({ paying: false })
          wx.showToast({ title: '支付暂不可用', icon: 'none' })
          return
        }
        wx.requestPayment({
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType || 'RSA',
          paySign: params.paySign,
          success: () => {
            this.setData({ paying: false })
            this.loadOrder()
          },
          fail: (err) => {
            this.setData({ paying: false })
            const cancelled = err && err.errMsg && err.errMsg.indexOf('cancel') >= 0
            wx.showToast({ title: cancelled ? '已取消支付' : '支付未完成', icon: 'none' })
          },
        })
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ paying: false })
        wx.showToast({ title: (err && err.message) || '发起失败', icon: 'none' })
      })
  },
})
