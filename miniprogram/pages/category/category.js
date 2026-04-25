// pages/category/category.js
const app = getApp()
const { categories, products: fallbackProducts } = require('../../utils/data.js')
const { getProducts } = require('../../utils/api.js')

// 前端固定品类与后端 categoryId 的软映射
const CAT_TO_ID = { tea: 1, vase: 2, incense: 3, art: 4 }
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
    loading: false,
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
  select(id) {
    const meta = categories.find((c) => c.id === id) || categories[0]
    this.setData({ current: meta.id, currentMeta: meta, loading: true })
    const categoryId = CAT_TO_ID[meta.id]
    getProducts({ categoryId: categoryId, pageSize: 60 })
      .then((list) => {
        // 后端若不支持按 categoryId 过滤，则前端再过一遍
        const filtered = list.filter(
          (p) => !p.category || p.category === meta.id || p.categoryId === categoryId
        )
        if (filtered.length === 0) throw new Error('EMPTY')
        this.setData({ list: filtered, loading: false })
      })
      .catch(() => {
        const fb = fallbackProducts.filter((p) => p.category === meta.id)
        this.setData({ list: fb, loading: false })
      })
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
