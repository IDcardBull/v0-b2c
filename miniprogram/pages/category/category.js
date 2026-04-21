// pages/category/category.js
const app = getApp()
const { categories, products } = require('../../utils/data.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    categories,
    current: 'tea',
    currentMeta: {},
    list: [],
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
    this.select(this.data.current)
  },
  onShow() {
    // 若从首页圆环点入并带了分类，则切换
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
    const list = products.filter((p) => p.category === meta.id)
    this.setData({ current: meta.id, currentMeta: meta, list })
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
  onSearch() {
    wx.showToast({ title: '搜索功能即将开放', icon: 'none' })
  },
})
