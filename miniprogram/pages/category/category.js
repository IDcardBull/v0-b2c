// pages/category/category.js
const app = getApp()
const { categories, products: fallbackProducts } = require('../../utils/data.js')
const { getProducts } = require('../../utils/api.js')

// 前端固定品类与后端 categoryId 的软映射
const CAT_TO_ID = { tea: 1, vase: 2, incense: 3, art: 4 }

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    categories,
    current: 'tea',
    currentMeta: {},
    list: [],
    loading: false,
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
    this.select(this.data.current)
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
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
  onSearch() {
    wx.showToast({ title: '搜索功能即将开放', icon: 'none' })
  },
})
