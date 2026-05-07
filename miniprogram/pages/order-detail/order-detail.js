const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

function markMockOrderPaid(orderId, order) {
  const mockPaid = wx.getStorageSync('mockPaidOrders') || {}
  mockPaid[`${orderId}`] = true
  wx.setStorageSync('mockPaidOrders', mockPaid)

  if (!order || !Array.isArray(order.items)) return
  const snapshots = wx.getStorageSync('orderItemSnapshots') || {}
  snapshots[`${orderId}`] = order.items.map((item) => ({
    productId: item.productId || item.id,
    skuId: item.skuId,
    name: item.name,
    image: item.image || item.skuImage || item.cover || '',
    cover: item.cover || item.image || item.skuImage || '',
    skuImage: item.skuImage || item.image || item.cover || '',
    spec: item.spec || item.skuSpec || '',
    skuSpec: item.skuSpec || item.spec || '',
    price: Number(item.price || 0),
    quantity: Number(item.quantity || item.qty || 1),
    qty: Number(item.quantity || item.qty || 1),
  }))
  wx.setStorageSync('orderItemSnapshots', snapshots)
}

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

  pay() {
    wx.showLoading({ title: '请稍候', mask: true })
    api.pay
      .order(this.data.id)
      .then((pay) => {
        wx.hideLoading()
        const params = pay && (pay.payParams || pay)
        if (!params || !params.timeStamp) {
          markMockOrderPaid(this.data.id, this.data.order)
          return wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${this.data.id}` })
        }
        wx.requestPayment({
          ...params,
          success: () => {
            markMockOrderPaid(this.data.id, this.data.order)
            wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${this.data.id}` })
          },
          fail: () => wx.showToast({ title: '已取消支付', icon: 'none' }),
        })
      })
      .catch((err) => {
        wx.hideLoading()
        const message = String((err && err.message) || '')
        if (message.includes('503') || message.includes('Service Unavailable') || message.includes('支付')) {
          markMockOrderPaid(this.data.id, this.data.order)
          wx.showToast({ title: '已走模拟支付', icon: 'none' })
          setTimeout(() => {
            wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${this.data.id}&mock=1` })
          }, 280)
          return
        }
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
