// pages/category/category.js
const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')
const fallback = require('../../utils/data.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    categories: fallback.categories,
    current: 'tea',
    currentMeta: {},
    list: [],
    page: 1,
    pageSize: 10,
    loading: false,
    finished: false,
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
    this.loadCategories()
  },
  onShow() {
    const pending = app.globalData.pendingCategory
    if (pending) {
      this.select(pending)
      app.globalData.pendingCategory = null
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },
  async loadCategories() {
    try {
      const data = await api.category.tree()
      const categories = adapter.normalizeCategories(data)
      const next = categories.length ? categories : fallback.categories
      this.setData({ categories: next })
      this.select(this.data.current || next[0].id)
    } catch (err) {
      this.setData({ categories: fallback.categories })
      this.select(this.data.current)
    }
  },
  onTapCat(e) {
    this.select(e.currentTarget.dataset.id)
  },
  async select(id) {
    const meta = this.data.categories.find((c) => `${c.id}` === `${id}`) || this.data.categories[0]
    if (!meta) return
    this.setData({ current: meta.id, currentMeta: meta, page: 1, list: [], finished: false })
    await this.loadProducts(true)
  },
  async loadProducts(reset) {
    const { current, page, pageSize, loading, finished } = this.data
    if (loading || (!reset && finished)) return
    this.setData({ loading: true })
    try {
      const data = await api.product.list({ categoryId: current, page, pageSize })
      const list = adapter.normalizeProducts(data)
      this.setData({
        list: reset ? list : this.data.list.concat(list),
        page: page + 1,
        finished: list.length < pageSize,
        loading: false,
      })
    } catch (err) {
      const meta = fallback.categories.find((c) => `${c.id}` === `${current}`) || fallback.categories[0]
      const list = fallback.products.filter((p) => p.category === meta.id)
      this.setData({ list, loading: false, finished: true })
    }
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
  onSearch() {
    wx.showToast({ title: '搜索功能即将开放', icon: 'none' })
  },
})
