// pages/admin/banners/banners.js —— 移动端首页轮播图管理（B2C 零售）
const app = getApp()
const api = require('../../../utils/api.js')

function genLocalId() {
  return 'local-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
}

/** 把后端字段（imageUrl / linkUrl）规范成页面统一形态 */
function normalize(item, idx) {
  const raw = item || {}
  return {
    id: raw.id != null ? raw.id : genLocalId(),
    title: raw.title || '',
    imageUrl: raw.imageUrl || raw.image || '',
    linkUrl: raw.linkUrl || raw.link || '',
    sort: Number(raw.sort != null ? raw.sort : idx + 1),
    enabled: raw.enabled !== false,
  }
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    list: [],
    loading: true,
    saving: false,
    uploadingId: '',
    // 编辑弹层
    editorVisible: false,
    editorIndex: -1,
    editor: { id: '', title: '', linkUrl: '', enabled: true },
    enabledCount: 0,
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    })
  },
  onShow() {
    if (!app.globalData.adminToken && !wx.getStorageSync('adminToken')) {
      wx.redirectTo({ url: '/pages/admin/login/login?redirect=%2Fpages%2Fadmin%2Fbanners%2Fbanners' })
      return
    }
    this.fetch()
  },
  onPullDownRefresh() {
    this.fetch().finally(() => wx.stopPullDownRefresh())
  },

  fetch() {
    this.setData({ loading: true })
    return api.admin.banner
      .list()
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res && res.list) || []
        const list = arr.map(normalize)
        this.applyList(list)
      })
      .catch(() => {
        this.applyList([])
      })
      .then(() => this.setData({ loading: false }))
  },

  applyList(list) {
    const enabledCount = list.filter((b) => b.enabled).length
    this.setData({ list, enabledCount })
  },

  // ====== 增删改查 ======
  addBanner() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        const newItem = {
          id: genLocalId(),
          title: '',
          imageUrl: '', // 上传完拿到
          linkUrl: '',
          sort: this.data.list.length + 1,
          enabled: true,
        }
        const list = this.data.list.concat([newItem])
        this.applyList(list)
        this.uploadAt(list.length - 1, file.tempFilePath)
      },
    })
  },

  onReplaceImage(e) {
    const idx = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(idx)) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        this.uploadAt(idx, file.tempFilePath)
      },
    })
  },

  uploadAt(index, filePath) {
    const list = this.data.list.slice()
    if (!list[index]) return
    const id = list[index].id
    this.setData({ uploadingId: id })
    wx.showLoading({ title: '上传中', mask: true })
    api.admin
      .upload(filePath)
      .then((res) => {
        const next = this.data.list.slice()
        if (next[index]) {
          next[index] = Object.assign({}, next[index], { imageUrl: res.url })
          this.applyList(next)
        }
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '上传失败', icon: 'none' })
      })
      .then(() => {
        wx.hideLoading()
        this.setData({ uploadingId: '' })
      })
  },

  onToggleEnabled(e) {
    const idx = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(idx)) return
    const list = this.data.list.slice()
    if (!list[idx]) return
    list[idx] = Object.assign({}, list[idx], { enabled: !list[idx].enabled })
    this.applyList(list)
  },

  onMoveUp(e) {
    const idx = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(idx) || idx <= 0) return
    const list = this.data.list.slice()
    const t = list[idx]
    list[idx] = list[idx - 1]
    list[idx - 1] = t
    this.applyList(list.map((it, i) => Object.assign({}, it, { sort: i + 1 })))
  },

  onMoveDown(e) {
    const idx = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(idx) || idx >= this.data.list.length - 1) return
    const list = this.data.list.slice()
    const t = list[idx]
    list[idx] = list[idx + 1]
    list[idx + 1] = t
    this.applyList(list.map((it, i) => Object.assign({}, it, { sort: i + 1 })))
  },

  onRemove(e) {
    const idx = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(idx)) return
    const item = this.data.list[idx]
    if (!item) return
    const ask = () => {
      const list = this.data.list.slice()
      list.splice(idx, 1)
      this.applyList(list.map((it, i) => Object.assign({}, it, { sort: i + 1 })))
    }
    if (!item.imageUrl) {
      ask()
      return
    }
    wx.showModal({
      title: '删除轮播图',
      content: item.title ? '确认删除「' + item.title + '」？' : '确认删除这张轮播图？',
      confirmText: '删除',
      confirmColor: '#C56A55',
      success: (res) => {
        if (res.confirm) ask()
      },
    })
  },

  // ====== 编辑弹层（标题 / 跳转链接 / 启用） ======
  openEditor(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const item = this.data.list[idx]
    if (!item) return
    this.setData({
      editorVisible: true,
      editorIndex: idx,
      editor: {
        id: item.id,
        title: item.title || '',
        linkUrl: item.linkUrl || '',
        enabled: item.enabled,
      },
    })
  },

  closeEditor() {
    this.setData({ editorVisible: false, editorIndex: -1 })
  },

  noop() {},

  onEditorTitle(e) {
    this.setData({ 'editor.title': e.detail.value })
  },

  onEditorLink(e) {
    this.setData({ 'editor.linkUrl': e.detail.value })
  },

  onEditorEnabled(e) {
    this.setData({ 'editor.enabled': !!e.detail.value })
  },

  saveEditor() {
    const idx = this.data.editorIndex
    if (idx < 0) return
    const list = this.data.list.slice()
    if (!list[idx]) return
    list[idx] = Object.assign({}, list[idx], {
      title: (this.data.editor.title || '').slice(0, 30),
      linkUrl: (this.data.editor.linkUrl || '').trim().slice(0, 500),
      enabled: !!this.data.editor.enabled,
    })
    this.applyList(list)
    this.closeEditor()
  },

  // ====== 提交 ======
  saveAll() {
    const list = this.data.list
    const missing = list.findIndex((it) => !it.imageUrl)
    if (missing >= 0) {
      wx.showToast({ title: '第 ' + (missing + 1) + ' 项还没有图', icon: 'none' })
      return
    }
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中', mask: true })
    const payload = list.map((it, i) => {
      const out = {
        title: it.title || '',
        imageUrl: it.imageUrl,
        linkUrl: it.linkUrl || '',
        sort: i + 1,
        enabled: !!it.enabled,
      }
      if (typeof it.id === 'number') out.id = it.id
      return out
    })
    api.admin.banner
      .save(payload)
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res && res.list) || []
        const next = arr.length ? arr.map(normalize) : list
        this.applyList(next)
        wx.showToast({ title: '已保存', icon: 'success' })
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
      })
      .then(() => {
        wx.hideLoading()
        this.setData({ saving: false })
      })
  },

  back() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.redirectTo({ url: '/pages/admin/index/index' })
  },
})
