// pages/review/review.js
const app = getApp()
const api = require('../../utils/api.js')
const { chooseAndUpload } = require('../../utils/upload.js')

const RATING_TEXT = ['', '尚可', '良', '佳', '甚好', '极品']

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    item: null,
    orderCode: '',
    orderId: '',
    rating: 5,
    ratingText: RATING_TEXT[5],
    content: '',
    images: [],
    anonymous: false,
    uploading: false,
    submitting: false,
    canSubmit: false,
    loading: true,
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      orderCode: options.order || options.orderNo || '',
      orderId: options.orderId || '',
    })
    if (options.id) {
      this.loadProduct(options.id)
    } else if (options.orderId) {
      this.loadFromOrder(options.orderId)
    } else {
      this.setData({ loading: false })
    }
  },
  loadProduct(id) {
    api.product
      .detail(id)
      .then((raw) => {
        const item = api.normalizeProduct(raw)
        this.setData({ item, loading: false })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '器物未找到', icon: 'none' })
      })
  },
  loadFromOrder(orderId) {
    api.order
      .detail(orderId)
      .then((order) => {
        const items = (order && order.items) || []
        const first = items[0]
        if (first) {
          const item = {
            id: first.productId || first.id,
            name: first.productName || first.name || '雅器',
            mainImage: first.image || first.productImage || '',
            sub: first.skuSpec || first.specText || '',
          }
          this.setData({
            item,
            orderCode: order.orderNo || order.orderNumber || this.data.orderCode,
            loading: false,
          })
        } else {
          this.setData({ loading: false })
        }
      })
      .catch(() => this.setData({ loading: false }))
  },
  back() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/profile/profile' })
  },
  onRate(e) {
    const i = Number(e.currentTarget.dataset.i)
    this.setData({ rating: i, ratingText: RATING_TEXT[i] || '' })
    this.recomputeCanSubmit()
  },
  onContent(e) {
    this.setData({ content: e.detail.value })
    this.recomputeCanSubmit()
  },
  onAnon(e) {
    this.setData({ anonymous: e.detail.value })
  },
  recomputeCanSubmit() {
    const ok = this.data.rating > 0 && this.data.content.trim().length > 0
    this.setData({ canSubmit: ok })
  },
  addImage() {
    if (this.data.uploading) return
    const that = this
    const remain = 9 - this.data.images.length
    if (remain <= 0) return
    this.setData({ uploading: true })
    chooseAndUpload({ count: remain, sourceType: ['album', 'camera'] })
      .then((urls) => {
        that.setData({
          images: that.data.images.concat(urls),
          uploading: false,
        })
      })
      .catch((err) => {
        that.setData({ uploading: false })
        if (err && (err.message === 'CANCELLED' || err.message === 'OVER_SIZE')) return
        wx.showToast({ title: '上传失败', icon: 'none' })
      })
  },
  removeImage(e) {
    const i = Number(e.currentTarget.dataset.i)
    const list = this.data.images.slice()
    list.splice(i, 1)
    this.setData({ images: list })
  },
  previewImage(e) {
    const i = Number(e.currentTarget.dataset.i)
    wx.previewImage({
      urls: this.data.images,
      current: this.data.images[i],
    })
  },
  submit() {
    if (!this.data.canSubmit || this.data.submitting) {
      if (!this.data.canSubmit) {
        wx.showToast({ title: '请评分并写下感受', icon: 'none' })
      }
      return
    }
    if (!this.data.item || !this.data.item.id) {
      wx.showToast({ title: '尚未选择器物', icon: 'none' })
      return
    }
    const payload = {
      productId: this.data.item.id,
      orderId: this.data.orderId || undefined,
      orderNo: this.data.orderCode || undefined,
      rating: this.data.rating,
      content: this.data.content.trim(),
      images: this.data.images,
      anonymous: this.data.anonymous,
    }
    this.setData({ submitting: true })
    api.review
      .create(payload)
      .then(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '已留鉴', icon: 'none' })
        setTimeout(() => this.back(), 600)
      })
      .catch((err) => {
        this.setData({ submitting: false })
        wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' })
      })
  },
})
