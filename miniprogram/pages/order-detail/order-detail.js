const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    id: '',
    order: null,
    loading: true,
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      id: options.id,
    })
    this.load()
  },

  onShow() {
    if (this.data.id && this.data.order) this.load()
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) })
  },

  load() {
    return api.order
      .detail(this.data.id)
      .then((data) => {
        this.setData({ order: adapter.normalizeOrder(data), loading: false })
      })
      .catch(() => this.setData({ loading: false }))
  },

  copyOrderNo() {
    if (!this.data.order) return
    wx.setClipboardData({
      data: this.data.order.orderNo || String(this.data.order.id),
      success: () => wx.showToast({ title: '已抄录', icon: 'none' }),
    })
  },

  pay() {
    wx.showLoading({ title: '请稍候', mask: true })
    api.pay
      .order(this.data.id)
      .then((pay) => {
        wx.hideLoading()
        const params = pay && (pay.payParams || pay)
        if (!params || !params.timeStamp) {
          return wx.redirectTo({
            url: `/pages/pay-result/pay-result?orderId=${this.data.id}`,
          })
        }
        wx.requestPayment({
          ...params,
          success: () =>
            wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${this.data.id}` }),
          fail: () => wx.showToast({ title: '已取消支付', icon: 'none' }),
        })
      })
      .catch((err) => {
        wx.hideLoading()
        wx.showModal({
          title: '支付暂不可用',
          content: err.message || '请稍后再试',
          showCancel: false,
        })
      })
  },

  cancel() {
    wx.showModal({
      title: '撤 · 单',
      content: '确认撤销此订单？',
      success: ({ confirm }) => {
        if (!confirm) return
        api.order
          .cancel(this.data.id)
          .then(() => {
            wx.showToast({ title: '已撤销', icon: 'none' })
            this.load()
          })
          .catch((err) =>
            wx.showToast({ title: err.message || '撤销失败', icon: 'none' }),
          )
      },
    })
  },

  confirm() {
    wx.showModal({
      title: '确 · 收',
      content: '确认已收到此器物？',
      success: ({ confirm }) => {
        if (!confirm) return
        api.order
          .confirm(this.data.id)
          .then(() => {
            wx.showToast({ title: '已确认', icon: 'none' })
            this.load()
          })
          .catch((err) =>
            wx.showToast({ title: err.message || '操作失败', icon: 'none' }),
          )
      },
    })
  },
})
