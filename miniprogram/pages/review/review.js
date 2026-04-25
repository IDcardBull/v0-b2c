// pages/review/review.js
const app = getApp()
const { products } = require('../../utils/data.js')
const { chooseAndUpload } = require('../../utils/upload.js')

const RATING_TEXT = ['', '尚可', '良', '佳', '甚好', '极品']

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    item: {},
    orderCode: 'YM-20260418-0007',
    rating: 5,
    ratingText: RATING_TEXT[5],
    content: '',
    images: [], // 上传后的线上 URL
    anonymous: false,
    uploading: false,
    submitting: false,
    canSubmit: false,
  },
  onLoad(options) {
    const id = options.id
    const item = (id && products.find((p) => p.id === id)) || products[0]
    if (options.order) {
      this.setData({ orderCode: options.order })
    }
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      item,
    })
    this.recomputeCanSubmit()
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
  // 选择并上传
  addImage() {
    if (this.data.uploading) return
    const that = this
    const remain = 9 - this.data.images.length
    if (remain <= 0) return
    this.setData({ uploading: true })
    chooseAndUpload({ count: remain, sourceType: ['album', 'camera'] })
      .then(function (urls) {
        that.setData({
          images: that.data.images.concat(urls),
          uploading: false,
        })
      })
      .catch(function (err) {
        that.setData({ uploading: false })
        if (err && err.message === 'CANCELLED') return
        if (err && err.message === 'OVER_SIZE') return
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
    const payload = {
      productId: this.data.item.id,
      orderCode: this.data.orderCode,
      rating: this.data.rating,
      content: this.data.content.trim(),
      images: this.data.images,
      anonymous: this.data.anonymous,
    }
    this.setData({ submitting: true })
    // 此处接入后端评价提交接口（如有），目前以提示模拟
    setTimeout(() => {
      this.setData({ submitting: false })
      wx.showToast({ title: '已留鉴', icon: 'none' })
      setTimeout(() => this.back(), 600)
      console.log('[review] submit payload =', payload)
    }, 400)
  },
})
