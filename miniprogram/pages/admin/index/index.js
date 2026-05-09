// pages/admin/index/index.js —— 移动端管理员工作台
const app = getApp()
const api = require('../../../utils/api.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    admin: null,
    loading: true,
    overview: {
      todayOrderCount: 0,
      todayOrderAmount: 0,
      pendingShipCount: 0,
      lowStockCount: 0,
      productCount: 0,
      skuCount: 0,
      retailCustomerCount: 0,
      dealerCount: 0,
    },
    counts: {
      pending_pay: 0,
      pending_ship: 0,
      shipped: 0,
      completed: 0,
    },
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      admin: app.globalData.adminInfo || wx.getStorageSync('adminInfo'),
    })
  },
  onShow() {
    if (!app.globalData.adminToken && !wx.getStorageSync('adminToken')) {
      wx.redirectTo({ url: '/pages/admin/login/login?redirect=%2Fpages%2Fadmin%2Findex%2Findex' })
      return
    }
    this.fetch()
  },
  onPullDownRefresh() {
    this.fetch().finally(() => wx.stopPullDownRefresh())
  },
  fetch() {
    this.setData({ loading: true })
    return Promise.all([
      api.admin.dashboard.overview().catch(() => null),
      api.admin.order.counts().catch(() => null),
      api.admin.profile().catch(() => null),
    ]).then(([overview, counts, profile]) => {
      const next = {}
      if (overview) {
        next.overview = {
          todayOrderCount: Number(overview.todayOrderCount || 0),
          todayOrderAmount: Number(overview.todayOrderAmount || 0),
          pendingShipCount: Number(overview.pendingShipCount || 0),
          lowStockCount: Number(overview.lowStockCount || 0),
          productCount: Number(overview.productCount || 0),
          skuCount: Number(overview.skuCount || 0),
          retailCustomerCount: Number(overview.retailCustomerCount || 0),
          dealerCount: Number(overview.dealerCount || 0),
        }
      }
      if (counts) {
        next.counts = {
          pending_pay: Number(counts.pending_pay || 0),
          pending_ship: Number(counts.pending_ship || 0),
          shipped: Number(counts.shipped || 0),
          completed: Number(counts.completed || 0),
        }
      }
      if (profile) {
        next.admin = profile
        app.globalData.adminInfo = profile
        wx.setStorageSync('adminInfo', profile)
      }
      next.loading = false
      this.setData(next)
    })
  },
  goOrders(e) {
    const status = e.currentTarget.dataset.status || ''
    wx.navigateTo({ url: `/pages/admin/orders/orders${status ? '?status=' + status : ''}` })
  },
  goProducts() { wx.navigateTo({ url: '/pages/admin/products/products' }) },
  goShop() { wx.switchTab({ url: '/pages/profile/profile' }) },
  signOut() {
    wx.showModal({
      title: '退出工作台',
      content: '退出后将回到客户端身份，可随时再次登录。',
      confirmText: '退出',
      cancelText: '取消',
      success: ({ confirm }) => {
        if (!confirm) return
        api.admin.logout().catch(() => {})
        app.clearAdmin()
        wx.redirectTo({ url: '/pages/admin/login/login' })
      },
    })
  },
})
