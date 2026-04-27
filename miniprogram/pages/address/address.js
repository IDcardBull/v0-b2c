const app = getApp()
const api = require('../../utils/api.js')

const emptyForm = {
  receiver: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  tag: '家',
  isDefault: false,
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    list: [],
    showForm: false,
    editingId: '',
    form: emptyForm,
  },
  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight })
  },
  onShow() {
    this.loadList()
  },
  async loadList() {
    try {
      const list = await api.address.list()
      this.setData({ list: list || [] })
    } catch (err) {}
  },
  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) })
  },
  add() {
    this.setData({ showForm: true, editingId: '', form: { ...emptyForm } })
  },
  edit(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.list.find((addr) => `${addr.id}` === `${id}`)
    if (item) this.setData({ showForm: true, editingId: id, form: { ...emptyForm, ...item } })
  },
  closeForm() {
    this.setData({ showForm: false })
  },
  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ form: { ...this.data.form, [key]: e.detail.value } })
  },
  onDefault() {
    this.setData({ form: { ...this.data.form, isDefault: !this.data.form.isDefault } })
  },
  async submit() {
    const form = this.data.form
    if (!form.receiver || !form.phone || !form.detail) {
      wx.showToast({ title: '请补全收件信息', icon: 'none' })
      return
    }
    try {
      if (this.data.editingId) await api.address.update(this.data.editingId, form)
      else await api.address.create(form)
      wx.showToast({ title: '已保存', icon: 'none' })
      this.setData({ showForm: false })
      this.loadList()
    } catch (err) {}
  },
  async setDefault(e) {
    try {
      await api.address.setDefault(e.currentTarget.dataset.id)
      this.loadList()
    } catch (err) {}
  },
  remove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除地址',
      content: '确定删除此收件地址？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.address.remove(id)
            this.loadList()
          } catch (err) {}
        }
      },
    })
  },
  noop() {},
  choose(e) {
    const id = e.currentTarget.dataset.id
    const pages = getCurrentPages()
    const prev = pages[pages.length - 2]
    const item = this.data.list.find((addr) => `${addr.id}` === `${id}`)
    if (!prev || !item) return
    // 结算页：直接写入并返回
    if (prev.route === 'pages/checkout/checkout') {
      prev.setData({ address: item })
      wx.navigateBack()
      return
    }
    // 购物袋：缓存并返回
    if (prev.route === 'pages/cart/cart') {
      wx.setStorageSync('cart_address', item)
      prev.setData({ address: item })
      wx.navigateBack()
    }
  },
})
