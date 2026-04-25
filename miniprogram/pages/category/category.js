// pages/category/category.js
const app = getApp()
const fallback = require('../../utils/data.js')
const api = require('../../utils/api.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    categories: [],
    current: null,
    currentMeta: {},
    list: [],
    loading: false,
    page: 1,
    pageSize: 20,
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
    if (pending && pending !== this.data.current) {
      app.globalData.pendingCategory = null
      // 等分类加载完再切换
      const wait = () => {
        if (this.data.categories.length) this.select(pending)
        else setTimeout(wait, 80)
      }
      wait()
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },
  loadCategories() {
    return api.category.tree()
      .then((data) => {
        const list = (Array.isArray(data) ? data : []).filter(
          (c) => c.parentId == null && c.status !== 0,
        )
        list.sort((a, b) => (a.sort || 0) - (b.sort || 0))
        const cats = list.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          sub: c.code ? c.code.toUpperCase() : '',
          desc: c.description || '一器一境，器以载道',
        }))
        if (cats.length === 0) throw new Error('EMPTY')
        this.setData({ categories: cats })
        this.select(cats[0].id)
      })
      .catch(() => {
        const cats = fallback.categories.map((c, i) => ({
          id: i + 1,
          code: c.id,
          name: c.name,
          sub: c.sub,
          desc: c.desc,
        }))
        this.setData({ categories: cats })
        this.select(cats[0].id)
      })
  },
  onTapCat(e) {
    this.select(e.currentTarget.dataset.id)
  },
  select(id) {
    const meta =
      this.data.categories.find((c) => `${c.id}` === `${id}`) ||
      this.data.categories[0]
    if (!meta) return
    this.setData({
      current: meta.id,
      currentMeta: meta,
      page: 1,
      list: [],
      finished: false,
    })
    this.loadProducts(true)
  },
  loadProducts(reset) {
    const { current, page, pageSize, loading, finished } = this.data
    if (loading || (!reset && finished)) return Promise.resolve()
    this.setData({ loading: true })
    return api.product
      .list({ categoryId: current, page, pageSize })
      .then((data) => {
        const raw = Array.isArray(data) ? data : (data && (data.list || data.items || data.records)) || []
        const list = raw.map(api.normalizeProduct).filter(Boolean)
        this.setData({
          list: reset ? list : this.data.list.concat(list),
          page: page + 1,
          finished: list.length < pageSize,
          loading: false,
        })
      })
      .catch(() => {
        const meta = this.data.currentMeta || {}
        const fb = fallback.products.filter((p) => p.category === meta.code || p.category === meta.id)
        this.setData({ list: fb, loading: false, finished: true })
      })
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
  onSearch() {
    wx.showToast({ title: '搜索功能即将开放', icon: 'none' })
  },
})
