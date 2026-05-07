const app = getApp()
const api = require('../../utils/api.js')
const adapter = require('../../utils/adapter.js')

function pickTracks(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.traces)) return payload.traces
  if (payload && Array.isArray(payload.tracks)) return payload.tracks
  if (payload && Array.isArray(payload.data)) return payload.data
  if (payload && payload.data && Array.isArray(payload.data.traces)) return payload.data.traces
  return []
}

function normalizeTrack(item, index) {
  return {
    id: item.id || `${index}`,
    time: item.time || item.acceptTime || item.datetime || item.ftime || '',
    status: item.status || item.remark || item.context || item.desc || '物流更新中',
    location: item.location || item.area || item.city || '',
  }
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    id: '',
    order: null,
    loading: true,
    empty: false,
    company: '',
    trackingNo: '',
    tracks: [],
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      id: options.id || '',
    })
    this.bootstrap()
  },

  back() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${this.data.id}` }) })
  },

  async bootstrap() {
    if (!this.data.id) {
      this.setData({ loading: false, empty: true })
      return
    }
    try {
      const detail = await api.order.detail(this.data.id)
      const order = adapter.normalizeOrder(detail)
      this.setData({
        order,
        company: order.logisticsCompany || '',
        trackingNo: order.trackingNo || '',
      })
      await this.loadTracks()
    } catch (err) {
      this.setData({ loading: false, empty: true })
      wx.showToast({ title: err.message || '物流加载失败', icon: 'none' })
    }
  },

  async loadTracks() {
    try {
      const payload = await api.order.logistics(this.data.id)
      const tracks = pickTracks(payload).map(normalizeTrack)
      const company = payload && (payload.company || payload.logisticsCompany || payload.shipperName || this.data.company)
      const trackingNo = payload && (payload.trackingNo || payload.expressNo || payload.logisticCode || this.data.trackingNo)
      this.setData({
        loading: false,
        empty: tracks.length === 0,
        tracks,
        company: company || this.data.company,
        trackingNo: trackingNo || this.data.trackingNo,
      })
    } catch (err) {
      this.setData({ loading: false, empty: true })
      wx.showToast({ title: err.message || '暂无物流轨迹', icon: 'none' })
    }
  },

  copyNo() {
    if (!this.data.trackingNo) return
    wx.setClipboardData({
      data: this.data.trackingNo,
      success: () => wx.showToast({ title: '单号已复制', icon: 'none' }),
    })
  },
})
