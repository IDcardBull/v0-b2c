// custom-tab-bar/index.js
const app = getApp()

Component({
  data: {
    selected: 0,
    cartCount: 0,
    hidden: false,
    list: [
      { pagePath: '/pages/index/index', text: '首页' },
      { pagePath: '/pages/category/category', text: '分类' },
      { pagePath: '/pages/cart/cart', text: '购物袋' },
      { pagePath: '/pages/profile/profile', text: '我' },
    ],
  },
  lifetimes: {
    attached() {
      this.refreshCount()
    },
  },
  pageLifetimes: {
    show() {
      this.refreshCount()
    },
  },
  methods: {
    refreshCount() {
      const cart = (app.globalData && app.globalData.cart) || []
      const count = cart.reduce((s, i) => s + (i.qty || 0), 0)
      this.setData({ cartCount: count })
    },
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    },
  },
})
