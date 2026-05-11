// pages/index/index.js
const app = getApp()
const fallback = require('../../utils/data.js')
const api = require('../../utils/api.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    categories: [], // 来自 /client/categories/tree 的真实顶级分类
    banners: [],
    bannerIdx: 0,
    list: [],
    waterfallLeft: [],
    waterfallRight: [],
    loading: true,
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
    this.loadAll()
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },
  onPullDownRefresh() {
    this.loadAll().then(() => wx.stopPullDownRefresh())
  },
  loadAll() {
    return Promise.all([
      this.loadCategories(),
      this.loadProducts(),
      this.loadBanners(),
    ]).catch(() => {})
  },
  loadCategories() {
    return api.category.tree()
      .then((data) => {
        // 顶级分类（parentId 为 null），最多 4 个，按 sort 排序
        const list = (Array.isArray(data) ? data : []).filter((c) => c.parentId == null && c.status !== 0)
        list.sort((a, b) => (a.sort || 0) - (b.sort || 0))
        const top = list.slice(0, 4).map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          icon: c.icon || '',
        }))
        if (top.length === 0) throw new Error('EMPTY')
        this.setData({ categories: top })
      })
      .catch(() => {
        // 兜底：本地静态分类
        this.setData({
          categories: fallback.categories.map((c) => ({
            id: c.id,
            code: c.id,
            name: c.name,
            icon: '',
          })),
        })
      })
  },
  loadProducts() {
    return api.getProducts({ page: 1, pageSize: 30, channel: 'retail' })
      .then((list) => {
        const all = list || []
        const swiperList = all.slice(0, 8)
        const wfSource = all.slice(0, 20)
        const left = []
        const right = []
        wfSource.forEach((item, i) => {
          if (i % 2 === 0) left.push(item)
          else right.push(item)
        })
        this.setData({ list: swiperList, waterfallLeft: left, waterfallRight: right })
      })
      .catch(() => {
        this.setData({ list: [] })
        wx.showToast({ title: '商品接口获取失败', icon: 'none' })
      })
      .then(() => this.setData({ loading: false }))
  },
  loadBanners() {
    return api.getBanners()
      .then((list) => this.setData({ banners: list || [] }))
      .catch(() => this.setData({ banners: [] }))
  },
  onBannerChange(e) {
    this.setData({ bannerIdx: e.detail.current })
  },
  onBannerTap(e) {
    const link = e.currentTarget.dataset.link
    if (!link) return
    if (/^\/pages\//.test(link)) {
      wx.navigateTo({ url: link, fail: () => wx.switchTab({ url: link }) })
    }
  },
  onSearch() {
    wx.showToast({ title: '搜索功能即将开放', icon: 'none' })
  },
  goCategory(e) {
    const id = e.currentTarget.dataset.id
    wx.switchTab({
      url: '/pages/category/category',
      success: () => {
        getApp().globalData.pendingCategory = id
      },
    })
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },
})
