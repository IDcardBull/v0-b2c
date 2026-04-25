const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

const TABS = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待付' },
  { key: 'pending_ship', label: '待发' },
  { key: 'shipped', label: '在途' },
  { key: 'completed', label: '已成' },
]

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    tabs: TABS,
    status: '',
    list: [],
    loading: true,
    empty: false,
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      status: options.status || '',
    })
  },

  onShow() {
    this.fetch()
  },

  onPullDownRefresh() {
    this.fetch().finally(() => wx.stopPullDownRefresh())
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) })
  },

  switchTab(e) {
    const status = e.currentTarget.dataset.status
    if (status === this.data.status) return
    this.setData({ status, list: [], loading: true })
    this.fetch()
  },

  fetch() {
    this.setData({ loading: true })
    const params = {}
    if (this.data.status) params.status = this.data.status
    return api.order
      .list(params)
      .then((data) => {
        const list = adapter.pickList(data).map(adapter.normalizeOrder)
        this.setData({ list, loading: false, empty: list.length === 0 })
      })
      .catch(() => this.setData({ loading: false, empty: true }))
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  goShop() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  payOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showLoading({ title: '请稍候', mask: true })
    api.pay
      .order(id)
      .then((res) => {
        wx.hideLoading()
        const params = res && (res.payParams || res)
        if (!params || !params.timeStamp) {
          return wx.redirectTo({
            url: `/pages/pay-result/pay-result?orderId=${id}`,
          })
        }
        wx.requestPayment({
          ...params,
          success: () =>
            wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${id}` }),
          fail: () => wx.showToast({ title: '已取消支付', icon: 'none' }),
        })
      })
      .catch((err) => {
        wx.hideLoading()
        wx.showToast({ title: err.message || '发起失败', icon: 'none' })
      })
  },

  cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '撤 · 单',
      content: '确认撤销此订单？',
      confirmText: '撤销',
      cancelText: '保留',
      success: ({ confirm }) => {
        if (!confirm) return
        api.order
          .cancel(id)
          .then(() => {
            wx.showToast({ title: '已撤销', icon: 'none' })
            this.fetch()
          })
          .catch((err) =>
            wx.showToast({ title: err.message || '撤销失败', icon: 'none' }),
          )
      },
    })
  },

  confirmReceive(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确 · 收',
      content: '确认已收到此器物？',
      success: ({ confirm }) => {
        if (!confirm) return
        api.order
          .confirm(id)
          .then(() => {
            wx.showToast({ title: '已确认', icon: 'none' })
            this.fetch()
          })
          .catch((err) =>
            wx.showToast({ title: err.message || '操作失败', icon: 'none' }),
          )
      },
    })
  },
})
