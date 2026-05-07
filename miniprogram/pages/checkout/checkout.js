const app = getApp()
const api = require('../../utils/api.js')

const FREE_SHIPPING_THRESHOLD = 199
const FLAT_FREIGHT = 12

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    items: [],
    address: null,
    remark: '',
    subtotal: 0,
    freight: 0,
    total: 0,
    submitting: false,
  },
  onLoad() {
    const items = wx.getStorageSync('checkoutItems') || []
    const remark = wx.getStorageSync('checkoutNote') || ''
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      items,
      remark,
    })
    this.recalc()
    this.loadAddress()
  },
  recalc() {
    const subtotal = this.data.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0,
    )
    const freight = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : FLAT_FREIGHT
    const total = subtotal + freight
    this.setData({ subtotal, freight, total })
  },
  async loadAddress() {
    try {
      const list = await api.address.list()
      const address = (list || []).find((item) => item.isDefault) || (list || [])[0] || null
      this.setData({ address })
    } catch (err) {}
  },
  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/cart/cart' }) })
  },
  chooseAddress() {
    wx.navigateTo({ url: '/pages/address/address' })
  },
  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },
  async submit() {
    if (this.data.submitting) return
    if (!wx.getStorageSync('token')) {
      wx.navigateTo({ url: '/pages/login/login?redirect=%2Fpages%2Fcheckout%2Fcheckout' })
      return
    }
    if (!this.data.address) {
      wx.showToast({ title: '请选择收件地址', icon: 'none' })
      return
    }
    const items = this.data.items.map((item) => ({
      skuId: item.skuId,
      qty: item.qty,
    }))
    if (!items.length || items.some((item) => !item.skuId)) {
      wx.showToast({ title: '请选择规格后再下单', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    try {
      const order = await api.order.create({
        channel: 'retail',
        source: 'miniprogram_a',
        items,
        addressId: this.data.address.id,
        remark: this.data.remark,
      })
      await this.pay(order.id)
    } catch (err) {
      this.setData({ submitting: false })
    }
  },
  async pay(orderId) {
    try {
      const pay = await api.pay.order(orderId)
      wx.requestPayment({
        ...pay,
        success: () => {
          this.markMockOrderPaid(orderId)
          this.removePaidItems()
          wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${orderId}` })
        },
        fail: () => {
          wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${orderId}&pending=1` })
        },
      })
    } catch (err) {
      const message = String((err && err.message) || '')
      const isMockPay = message.includes('503') || message.includes('Service Unavailable') || message.includes('支付')
      if (isMockPay) {
        this.markMockOrderPaid(orderId)
        this.removePaidItems()
        wx.showToast({ title: '已走模拟支付', icon: 'none' })
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${orderId}&mock=1` })
        }, 280)
        return
      }
      wx.showModal({
        title: '支付暂不可用',
        content: err.message || '请联系管理员处理支付配置',
        showCancel: false,
      })
      wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${orderId}` })
    }
  },
  markMockOrderPaid(orderId) {
    const snapshots = wx.getStorageSync('orderItemSnapshots') || {}
    snapshots[`${orderId}`] = this.data.items.map((item) => ({
      productId: item.productId || item.id,
      skuId: item.skuId,
      name: item.name,
      image: item.cover || item.mainImage || item.image || '',
      cover: item.cover || item.mainImage || item.image || '',
      skuImage: item.cover || item.mainImage || item.image || '',
      spec: item.skuSpec || item.spec || '',
      skuSpec: item.skuSpec || item.spec || '',
      price: Number(item.price || 0),
      quantity: Number(item.qty || item.quantity || 1),
      qty: Number(item.qty || item.quantity || 1),
    }))
    wx.setStorageSync('orderItemSnapshots', snapshots)
    const mockPaid = wx.getStorageSync('mockPaidOrders') || {}
    mockPaid[`${orderId}`] = true
    wx.setStorageSync('mockPaidOrders', mockPaid)
  },
  removePaidItems() {
    const ids = this.data.items.map((item) => `${item.skuId}`)
    const cart = (app.loadCart ? app.loadCart() : []).filter((item) => !ids.includes(`${item.skuId}`))
    if (app.saveCart) app.saveCart(cart)
    this.setData({ submitting: false })
  },
})
