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
    return api.order
      .list({})
      .then((data) => {
        const allList = adapter.pickList(data).map(adapter.normalizeOrder)
        const list = this.data.status
          ? allList.filter((item) => item.statusKey === this.data.status)
          : allList
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

  // catchtap 兜底，阻止冒泡
  noop() {},

  /**
   * 继续支付：直接调后端取得 wx.requestPayment 参数后唤起收银台。
   * 取消/失败时订单仍是 pending_pay，用户可继续重试。
   */
  payOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showLoading({ title: '请稍候', mask: true })
    api.pay
      .order(id)
      .then((params) => {
        wx.hideLoading()
        if (!params || !params.timeStamp || !params.paySign) {
          wx.showToast({ title: '支付暂不可用', icon: 'none' })
          return
        }
        wx.requestPayment({
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType || 'RSA',
          paySign: params.paySign,
          success: () => wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${id}` }),
          fail: (err) => {
            const cancelled = err && err.errMsg && err.errMsg.indexOf('cancel') >= 0
            wx.showToast({ title: cancelled ? '已取消支付' : '支付未完成', icon: 'none' })
          },
        })
      })
      .catch((err) => {
        wx.hideLoading()
        wx.showToast({ title: (err && err.message) || '发起失败', icon: 'none' })
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
