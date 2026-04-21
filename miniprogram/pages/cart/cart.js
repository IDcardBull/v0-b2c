// pages/cart/cart.js
const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    list: [],
    editing: false,
    note: '',
    allChecked: false,
    total: 0,
    selectedCount: 0,
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
  },
  onShow() {
    this.syncFromGlobal()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
      this.getTabBar().refreshCount()
    }
  },
  syncFromGlobal() {
    const raw = app.globalData.cart || []
    const list = raw.map((i) => ({ ...i, checked: i.checked !== false }))
    this.setData({ list }, () => this.recalc())
  },
  recalc() {
    const { list } = this.data
    let total = 0
    let selectedCount = 0
    let allChecked = list.length > 0
    list.forEach((i) => {
      if (i.checked) {
        total += i.price * i.qty
        selectedCount += i.qty
      } else {
        allChecked = false
      }
    })
    this.setData({ total, selectedCount, allChecked })
    this.writeBack()
  },
  writeBack() {
    app.globalData.cart = this.data.list.map(({ h, ...rest }) => rest)
  },
  toggleEdit() {
    this.setData({ editing: !this.data.editing })
  },
  toggleCheck(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list.map((i) =>
      i.id === id ? { ...i, checked: !i.checked } : i
    )
    this.setData({ list }, () => this.recalc())
  },
  toggleAll() {
    const next = !this.data.allChecked
    const list = this.data.list.map((i) => ({ ...i, checked: next }))
    this.setData({ list }, () => this.recalc())
  },
  inc(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list.map((i) =>
      i.id === id ? { ...i, qty: Math.min(99, i.qty + 1) } : i
    )
    this.setData({ list }, () => this.recalc())
  },
  dec(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list.map((i) =>
      i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i
    )
    this.setData({ list }, () => this.recalc())
  },
  remove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '移除此器',
      content: '确定将此件器物从袋中取出？',
      cancelText: '再看看',
      confirmText: '移除',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.list.filter((i) => i.id !== id)
          this.setData({ list }, () => this.recalc())
        }
      },
    })
  },
  onNote(e) {
    this.setData({ note: e.detail.value })
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
  checkout() {
    const { list, total } = this.data
    const chosen = list.filter((i) => i.checked)
    if (chosen.length === 0) {
      wx.showToast({ title: '请选择器物', icon: 'none' })
      return
    }
    wx.showModal({
      title: '结 · 算',
      content: `共 ${chosen.length} 件器物，合计 ¥${total}。`,
      cancelText: '再想想',
      confirmText: '前往付款',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '订单已生成', icon: 'none' })
        }
      },
    })
  },
})
