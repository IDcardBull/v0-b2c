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

  editAddress() {
    const order = this.data.order
    if (!order) return
    if (!(order.status === 'pending_pay' || order.status === 'pending_ship')) {
      wx.showToast({ title: '已发货后不可修改地址', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/address/address?orderId=${this.data.id}` })
  },

  viewLogistics() {
    if (!this.data.order || !this.data.order.trackingNo) {
      wx.showToast({ title: '暂无物流信息', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/logistics/logistics?id=${this.data.id}` })
  },

  /**
   * 调起微信支付。订单状态完全由后端微信支付回调决定，前端不做兜底。
   */
  pay() {
    wx.showLoading({ title: '请稍候', mask: true })
    api.pay
      .order(this.data.id)
      .then((params) => {
        wx.hideLoading()
        if (!params || !params.timeStamp || !params.paySign) {
          wx.showModal({
            title: '支付暂不可用',
            content: '请稍后再试或联系管理员',
            showCancel: false,
          })
          return
        }
        wx.requestPayment({
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType || 'RSA',
          paySign: params.paySign,
          success: () => wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${this.data.id}` }),
          fail: (err) => {
            const cancelled = err && err.errMsg && err.errMsg.indexOf('cancel') >= 0
            wx.showToast({ title: cancelled ? '已取消支付' : '支付未完成', icon: 'none' })
          },
        })
      })
      .catch((err) => {
        wx.hideLoading()
        wx.showModal({
          title: '支付暂不可用',
          content: (err && err.message) || '请稍后再试',
          showCancel: false,
        })
      })
  },

  cancel() {
    wx.showModal({
      title: '撤单',
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
      title: '确收',
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
