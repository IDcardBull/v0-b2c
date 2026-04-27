// pages/cart/cart.js
const app = getApp()
const api = require('../../utils/api.js')

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
    address: {},
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
  },
  onShow() {
    this.syncFromGlobal()
    this.loadAddress()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: true })
      this.getTabBar().refreshCount()
    }
  },
  onHide() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: false })
    }
  },
  onUnload() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: false })
    }
  },
  loadAddress() {
    // 优先用购物袋已选地址
    const cached = wx.getStorageSync('cart_address')
    if (cached && cached.id) {
      this.setData({ address: cached })
      return
    }
    // 否则取默认地址
    api.address
      .list()
      .then((list) => {
        const arr = Array.isArray(list) ? list : []
        const def = arr.find((a) => a.isDefault) || arr[0]
        if (def) {
          this.setData({ address: def })
          wx.setStorageSync('cart_address', def)
        }
      })
      .catch(() => {})
  },
  chooseAddress() {
    wx.navigateTo({ url: '/pages/address/address?from=cart' })
  },
  syncFromGlobal() {
    const raw = app.loadCart ? app.loadCart() : (wx.getStorageSync('cart') || [])
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
        total += Number(i.price || 0) * Number(i.qty || 0)
        selectedCount += i.qty || 0
      } else {
        allChecked = false
      }
    })
    this.setData({ total, selectedCount, allChecked })
    this.writeBack()
  },
  writeBack() {
    const cart = this.data.list.map(({ h, ...rest }) => rest)
    if (app.saveCart) app.saveCart(cart)
    else {
      app.globalData.cart = cart
      wx.setStorageSync('cart', cart)
    }
  },
  toggleEdit() {
    this.setData({ editing: !this.data.editing })
  },
  toggleCheck(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list.map((i) =>
      `${i.skuId || i.id}` === `${id}` ? { ...i, checked: !i.checked } : i
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
      `${i.skuId || i.id}` === `${id}` ? { ...i, qty: Math.min(99, i.qty + 1) } : i
    )
    this.setData({ list }, () => this.recalc())
  },
  dec(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list.map((i) =>
      `${i.skuId || i.id}` === `${id}` ? { ...i, qty: Math.max(1, i.qty - 1) } : i
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
          const list = this.data.list.filter((i) => `${i.skuId || i.id}` !== `${id}`)
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
    const { list, total, note, address } = this.data
    const chosen = list.filter((i) => i.checked)
    if (chosen.length === 0) {
      wx.showToast({ title: '请选择器物', icon: 'none' })
      return
    }
    if (!address || !address.id) {
      wx.showModal({
        title: '尚无寄达地址',
        content: '请先选择或新增收件地址，方可结算。',
        cancelText: '稍后',
        confirmText: '去添加',
        success: (res) => {
          if (res.confirm) this.chooseAddress()
        },
      })
      return
    }
    wx.setStorageSync('checkoutItems', chosen)
    wx.setStorageSync('checkoutNote', note)
    wx.setStorageSync('checkoutAddress', address)
    wx.navigateTo({ url: '/pages/checkout/checkout' })
  },
})
