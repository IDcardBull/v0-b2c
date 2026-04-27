const app = getApp()
const fallback = require('../../utils/data.js')
const api = require('../../utils/api.js')

function normalizeCategoryNode(raw, index = 0, parentId = null) {
  const children = raw.children || raw.childList || raw.subCategories || raw.childrenList || []
  return {
    id: raw.id,
    key: `${parentId == null ? 'p' : 'c'}-${raw.id}`,
    parentId,
    code: raw.code || raw.sub || '',
    name: raw.name || raw.title || `品类${index + 1}`,
    sub: raw.sub || raw.enName || raw.code || '',
    desc: raw.desc || raw.description || '一器一境，器以载道',
    children: children.map((child, childIndex) => normalizeCategoryNode(child, childIndex, raw.id)),
  }
}

function flattenCategoryIds(category) {
  if (!category) return []
  const ids = [category.id]
  ;(category.children || []).forEach((child) => {
    ids.push(...flattenCategoryIds(child))
  })
  return ids
}

function uniqueProducts(list) {
  const seen = {}
  return list.filter((item) => {
    const key = `${item.id}`
    if (seen[key]) return false
    seen[key] = true
    return true
  })
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    categories: [],
    current: '',
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
        const raw = Array.isArray(data) ? data : data && data.list ? data.list : []
        const roots = raw
          .filter((item) => item.parentId == null && item.status !== 0)
          .sort((a, b) => (a.sort || 0) - (b.sort || 0))
        const categories = roots.map((item, index) => normalizeCategoryNode(item, index))
        if (!categories.length) throw new Error('EMPTY')
        this.setData({ categories })
        this.select(this.data.current || categories[0].id)
      })
      .catch(() => {
        const categories = fallback.categories.map((item, index) => normalizeCategoryNode({
          id: item.id,
          code: item.id,
          name: item.name,
          sub: item.sub,
          desc: item.desc,
          children: [],
        }, index))
        this.setData({ categories })
        this.select(categories[0].id)
      })
  },
  onTapCat(e) {
    this.select(e.currentTarget.dataset.id)
  },
  findCategory(id) {
    const target = `${id}`
    for (let i = 0; i < this.data.categories.length; i += 1) {
      const parent = this.data.categories[i]
      if (`${parent.id}` === target) return parent
      const child = (parent.children || []).find((item) => `${item.id}` === target)
      if (child) return child
    }
    return this.data.categories[0]
  },
  select(id) {
    const meta = this.findCategory(id)
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
    const { currentMeta, page, pageSize, loading, finished } = this.data
    if (loading || (!reset && finished)) return Promise.resolve()
    this.setData({ loading: true })
    const ids = flattenCategoryIds(currentMeta)
    const requests = ids.map((categoryId) => api.product.list({ categoryId, page, pageSize, channel: 'retail' }))
    return Promise.all(requests)
      .then((results) => {
        const products = []
        results.forEach((data) => {
          const raw = Array.isArray(data) ? data : (data && (data.list || data.items || data.records || data.rows)) || []
          api.normalizeRetailProducts(data).forEach((item) => products.push(item))
        })
        const list = uniqueProducts(products)
        this.setData({
          list: reset ? list : this.data.list.concat(list),
          page: page + 1,
          finished: list.length < pageSize,
          loading: false,
        })
      })
      .catch(() => {
        const fb = []
        this.setData({ list: reset ? fb : this.data.list.concat(fb), loading: false, finished: true })
        wx.showToast({ title: '商品接口获取失败', icon: 'none' })
      })
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
  onSearch() {
    wx.showToast({ title: '搜索功能即将开放', icon: 'none' })
  },
})
