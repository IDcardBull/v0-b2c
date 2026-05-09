// pages/admin/order-detail/order-detail.js —— 管理员订单详情 + 发货
const app = getApp()
const api = require('../../../utils/api.js')
const adapter = require('../../../utils/adapter.js')

const COMPANY_HINTS = ['顺丰速运', '京东物流', '中通快递', '圆通速递', '韵达快递', '极兔速递', '德邦快递', '邮政EMS']

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    id: 0,
    loading: true,
    order: null,
    logistics: null,
    submitting: false,
    shipForm: {
      company: '',
      trackingNo: '',
      remark: '',
    },
    companyHints: COMPANY_HINTS,
    showHints: false,
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      id: Number(options.id || 0),
    })
  },
  onShow() {
    if (!app.globalData.adminToken && !wx.getStorageSync('adminToken')) {
      wx.redirectTo({ url: '/pages/admin/login/login' })
      return
    }
    if (!this.data.id) {
      wx.showToast({ title: '订单丢失', icon: 'none' })
      return setTimeout(() => wx.navigateBack(), 600)
    }
    this.fetch()
  },
  back() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/admin/orders/orders' }) })
  },
  fetch() {
    this.setData({ loading: true })
    return Promise.all([
      api.admin.order.detail(this.data.id),
      api.admin.order.logistics(this.data.id).catch(() => null),
    ]).then(([detail, logistics]) => {
      const order = adapter.normalizeOrder(detail)
      this.setData({ order, logistics, loading: false })
    }).catch((err) => {
      this.setData({ loading: false })
      wx.showToast({ title: (err && err.message) || '加载失败', icon: 'none' })
    })
  },

  onCompanyInput(e) { this.setData({ 'shipForm.company': e.detail.value, showHints: true }) },
  hideHints() { setTimeout(() => this.setData({ showHints: false }), 200) },
  pickHint(e) {
    this.setData({ 'shipForm.company': e.currentTarget.dataset.value, showHints: false })
  },
  onTrackingInput(e) { this.setData({ 'shipForm.trackingNo': e.detail.value }) },
  onRemarkInput(e) { this.setData({ 'shipForm.remark': e.detail.value }) },
  scanTracking() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        if (res && res.result) {
          this.setData({ 'shipForm.trackingNo': res.result })
        }
      },
      fail: () => {},
    })
  },
  copyOrderNo() {
    if (!this.data.order) return
    wx.setClipboardData({ data: String(this.data.order.orderNo || this.data.order.id) })
  },
  copyTrackingNo(e) {
    const value = e.currentTarget.dataset.value
    if (value) wx.setClipboardData({ data: String(value) })
  },

  doShip() {
    if (this.data.submitting) return
    const form = this.data.shipForm
    if (!form.company) return wx.showToast({ title: '请输入快递公司', icon: 'none' })
    if (!form.trackingNo) return wx.showToast({ title: '请输入运单号', icon: 'none' })
    this.setData({ submitting: true })
    api.admin.order.ship(this.data.id, {
      company: form.company,
      trackingNo: form.trackingNo,
      logisticsCompany: form.company,
      logisticsNo: form.trackingNo,
      remark: form.remark,
    }).then(() => {
      wx.showToast({ title: '已发货', icon: 'none' })
      this.setData({ shipForm: { company: '', trackingNo: '', remark: '' } })
      this.fetch()
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '发货失败', icon: 'none' })
    }).finally(() => this.setData({ submitting: false }))
  },

  markPaid() {
    wx.showModal({
      title: '标记已付款',
      content: '将此订单标记为已付款（线下付款 / 重新对账场景）。',
      success: ({ confirm }) => {
        if (!confirm) return
        api.admin.order.markPaid(this.data.id).then(() => {
          wx.showToast({ title: '已标记', icon: 'none' })
          this.fetch()
        }).catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
      },
    })
  },
  markComplete() {
    wx.showModal({
      title: '标记已完成',
      content: '客户已确认收货？',
      success: ({ confirm }) => {
        if (!confirm) return
        api.admin.order.complete(this.data.id).then(() => {
          wx.showToast({ title: '已完成', icon: 'none' })
          this.fetch()
        }).catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
      },
    })
  },
  closeOrder() {
    wx.showModal({
      title: '关闭订单',
      content: '关闭后无法恢复，确定继续？',
      editable: true,
      placeholderText: '关闭原因（选填）',
      success: (res) => {
        if (!res.confirm) return
        api.admin.order.close(this.data.id, res.content || '').then(() => {
          wx.showToast({ title: '已关闭', icon: 'none' })
          this.fetch()
        }).catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
      },
    })
  },
  noop() {},
})
