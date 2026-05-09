const app = getApp()
const api = require('../../utils/api.js')

const emptyForm = {
  receiver: '',
  phone: '',
  province: '北京市',
  city: '北京市',
  district: '东城区',
  detail: '',
  tag: '家',
  isDefault: false,
}

function isValidPhone(phone) {
  return /^1\d{10}$/.test(String(phone || '').trim())
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    list: [],
    showForm: false,
    editingId: '',
    saving: false,
    orderId: '',
    form: { ...emptyForm },
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      orderId: options.orderId || '',
    })
  },
  onShow() {
    this.loadList()
  },
  async loadList() {
    try {
      const list = await api.address.list()
      this.setData({ list: Array.isArray(list) ? list : [] })
    } catch (err) {
      wx.showToast({ title: err.message || '地址获取失败', icon: 'none' })
    }
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
    if (!item) return
    this.setData({ showForm: true, editingId: id, form: { ...emptyForm, ...item } })
  },
  closeForm() {
    if (this.data.saving) return
    this.setData({ showForm: false })
  },
  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ form: { ...this.data.form, [key]: e.detail.value } })
  },
  onRegionChange(e) {
    const region = e.detail.value || []
    this.setData({
      form: {
        ...this.data.form,
        province: region[0] || '',
        city: region[1] || '',
        district: region[2] || '',
      },
    })
  },
  onDefault() {
    this.setData({ form: { ...this.data.form, isDefault: !this.data.form.isDefault } })
  },
  async submit() {
    const form = {
      ...this.data.form,
      receiver: String(this.data.form.receiver || '').trim(),
      phone: String(this.data.form.phone || '').trim(),
      detail: String(this.data.form.detail || '').trim(),
      tag: String(this.data.form.tag || '').trim() || '家',
    }
    if (!form.receiver) {
      wx.showToast({ title: '请输入收件人', icon: 'none' })
      return
    }
    if (!isValidPhone(form.phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }
    if (!form.province || !form.city || !form.district) {
      wx.showToast({ title: '请选择省市区', icon: 'none' })
      return
    }
    if (!form.detail) {
      wx.showToast({ title: '请输入详细地址', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      if (this.data.editingId) await api.address.update(this.data.editingId, form)
      else await api.address.create(form)
      const list = await api.address.list()
      const nextList = Array.isArray(list) ? list : []
      const matched = this.data.editingId
        ? nextList.find((item) => `${item.id}` === `${this.data.editingId}`)
        : nextList.find((item) => item.receiver === form.receiver && item.phone === form.phone && item.detail === form.detail)
      if (!matched) throw new Error('地址保存后未查询到记录')
      this.setData({ list: nextList, showForm: false })
      wx.showToast({ title: '地址已保存', icon: 'none' })
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },
  async setDefault(e) {
    try {
      await api.address.setDefault(e.currentTarget.dataset.id)
      await this.loadList()
      wx.showToast({ title: '已设为默认', icon: 'none' })
    } catch (err) {
      wx.showToast({ title: err.message || '设置失败', icon: 'none' })
    }
  },
  remove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除地址',
      content: '确定删除此收件地址？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.address.remove(id)
          await this.loadList()
          wx.showToast({ title: '已删除', icon: 'none' })
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      },
    })
  },
  noop() {},
  async choose(e) {
    const id = e.currentTarget.dataset.id
    const pages = getCurrentPages()
    const prev = pages[pages.length - 2]
    const item = this.data.list.find((addr) => `${addr.id}` === `${id}`)
    if (!prev || !item) return

    if (this.data.orderId) {
      try {
        await api.order.updateAddress(this.data.orderId, item.id)
        wx.showToast({ title: '地址已更新', icon: 'none' })
        if (prev.route === 'pages/order-detail/order-detail') {
          prev.load && prev.load()
        }
        wx.navigateBack()
      } catch (err) {
        wx.showToast({ title: err.message || '更新失败', icon: 'none' })
      }
      return
    }

    if (prev.route === 'pages/checkout/checkout') {
      prev.setData({ address: item })
      // 让 checkout 立即按新省份重新拉运费（不存在该方法时安全跳过）
      if (typeof prev.reloadFreight === 'function') {
        try { prev.reloadFreight() } catch (e) {}
      }
      wx.navigateBack()
      return
    }
    if (prev.route === 'pages/cart/cart') {
      wx.setStorageSync('cart_address', item)
      prev.setData({ address: item })
      wx.navigateBack()
    }
  },
})
