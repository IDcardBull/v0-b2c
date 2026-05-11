// pages/feedback/feedback.js
const app = getApp()
const api = require('../../utils/api.js')
const { chooseAndUpload } = require('../../utils/upload.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    types: [
      { key: 'aftersale', cn: '售后', sub: '破损 / 错发 / 漏发' },
      { key: 'consult', cn: '咨询', sub: '订做 / 物流 / 养护' },
      { key: 'feedback', cn: '建议', sub: '使用反馈 / 心得' },
    ],
    type: 'aftersale',
    orderCode: '',
    content: '',
    contact: '',
    images: [],
    uploading: false,
    submitting: false,
    canSubmit: false,
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
    if (options && options.type) {
      this.setData({ type: options.type })
    }
    if (options && options.order) {
      this.setData({ orderCode: options.order })
    }
    this.recomputeCanSubmit()
  },
  back() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/profile/profile' })
  },
  onType(e) {
    this.setData({ type: e.currentTarget.dataset.key })
  },
  onOrder(e) {
    this.setData({ orderCode: e.detail.value })
  },
  onContent(e) {
    this.setData({ content: e.detail.value })
    this.recomputeCanSubmit()
  },
  onContact(e) {
    this.setData({ contact: e.detail.value })
    this.recomputeCanSubmit()
  },
  recomputeCanSubmit() {
    const ok =
      this.data.content.trim().length > 0 &&
      this.data.contact.trim().length > 0
    this.setData({ canSubmit: ok })
  },
  addImage() {
    if (this.data.uploading) return
    const that = this
    const remain = 6 - this.data.images.length
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
        wx.showToast({ title: '请填写详述与联络方式', icon: 'none' })
      }
      return
    }
    const payload = {
      type: this.data.type,
      orderCode: this.data.orderCode.trim(),
      content: this.data.content.trim(),
      contact: this.data.contact.trim(),
      images: this.data.images,
    }
    this.setData({ submitting: true })
    api.feedback
      .create(payload)
      .then(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '已请复', icon: 'none' })
        setTimeout(() => this.back(), 600)
      })
      .catch((err) => {
        this.setData({ submitting: false })
        wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' })
      })
  },
})
