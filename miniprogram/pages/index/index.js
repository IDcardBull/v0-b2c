// pages/index/index.js
const app = getApp()
const { categories, products: fallbackProducts } = require('../../utils/data.js')
const { getProducts, getBanners } = require('../../utils/api.js')
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')
const fallback = require('../../utils/data.js')

const HEIGHTS = [420, 520, 600, 480, 560, 440]

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    categories,
    banners: [],
    bannerIdx: 0,
    list: [],
    loading: true,
    categories: fallback.categories,
    left: [],
    right: [],
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
    this.loadAll()
    this.renderProducts(fallback.products)
    this.loadHome()
  },
  async loadHome() {
    try {
      const [categories, products] = await Promise.all([
        api.category.tree(),
        api.product.recommend(8),
      ])
      const nextCategories = adapter.normalizeCategories(categories)
      const nextProducts = adapter.normalizeProducts(products)
      this.setData({ categories: nextCategories.length ? nextCategories : fallback.categories })
      this.renderProducts(nextProducts.length ? nextProducts : fallback.products)
    } catch (err) {
      this.renderProducts(fallback.products)
    }
  },
  renderProducts(products) {
    const list = products.map((p, i) => ({
      ...p,
      h: HEIGHTS[i % HEIGHTS.length],
    }))
    const left = []
    const right = []
    list.forEach((p, i) => (i % 2 === 0 ? left.push(p) : right.push(p)))
    this.setData({ left, right })
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
    return Promise.all([this.loadProducts(), this.loadBanners()]).catch(() => {})
  },
  loadProducts() {
    return getProducts({ pageSize: 60 })
      .then((list) => {
        if (!list || list.length === 0) throw new Error('EMPTY')
        this.setData({ list })
      })
      .catch(() => {
        this.setData({ list: fallbackProducts })
      })
      .then(() => this.setData({ loading: false }))
  },
  loadBanners() {
    return getBanners()
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
