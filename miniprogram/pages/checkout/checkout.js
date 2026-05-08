// pages/checkout/checkout.js
const app = getApp()
const api = require('../../utils/api.js')
const wecomBot = require('../../utils/wecom-bot.js')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    items: [],
    address: null,
    remark: '',
    subtotal: 0,
    freight: 0,
    total: 0,
    allFreeShipping: false, // 所有商品都包邮 → 显示"全场包邮"
    submitting: false,
  },
  onLoad() {
    const items = wx.getStorageSync('checkoutItems') || []
    const remark = wx.getStorageSync('checkoutNote') || ''
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      items,
      remark,
    })
    this.recalc()
    this.loadAddress()
  },
  // 运费规则（与后端保持一致）：
  //   - 每个商品自带 freeShipping(布尔) / shippingFee(数字)，由管理端配置
  //   - 全部商品包邮 -> 0
  //   - 否则取所有"非包邮"商品中 shippingFee 的最大值（同单不累加运费，避免多商品多倍邮费）
  //   - 此处仅作客户端预估值；提交订单后后端会按真实数据复算 Order.freight，最终金额以后端为准
  recalc() {
    const items = this.data.items || []
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0,
    )
    let freight = 0
    let allFreeShipping = items.length > 0
    items.forEach((item) => {
      if (item.freeShipping) return
      allFreeShipping = false
      const fee = Number(item.shippingFee || 0)
      if (fee > freight) freight = fee
    })
    if (subtotal === 0) freight = 0
    const total = subtotal + freight
    this.setData({ subtotal, freight, total, allFreeShipping })
  },
  async loadAddress() {
    try {
      const list = await api.address.list()
      const address = (list || []).find((item) => item.isDefault) || (list || [])[0] || null
      this.setData({ address })
    } catch (err) {}
  },
  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/cart/cart' }) })
  },
  chooseAddress() {
    wx.navigateTo({ url: '/pages/address/address' })
  },
  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },
  async submit() {
    if (this.data.submitting) return
    if (!wx.getStorageSync('token')) {
      wx.navigateTo({ url: '/pages/login/login?redirect=%2Fpages%2Fcheckout%2Fcheckout' })
      return
    }
    if (!this.data.address) {
      wx.showToast({ title: '请选择收件地址', icon: 'none' })
      return
    }
    const items = this.data.items.map((item) => ({
      skuId: item.skuId,
      qty: item.qty,
    }))
    if (!items.length || items.some((item) => !item.skuId)) {
      wx.showToast({ title: '请选择规格后再下单', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    try {
      const order = await api.order.create({
        channel: 'retail',
        source: 'miniprogram_a',
        items,
        addressId: this.data.address.id,
        remark: this.data.remark,
      })
      const orderId = order.id || order.orderId
      // 下单成功后，异步发送企微机器人通知（不阻塞支付流程）
      this.sendWecomNotify(order.orderNo || orderId)
      // 拉起微信支付
      await this.pay(orderId)
    } catch (err) {
      this.setData({ submitting: false })
    }
  },
  // 发送企业微信机器人订单通知
  sendWecomNotify(orderId) {
    if (!wecomBot.isConfigured()) return
    const { items, address, subtotal, freight, total, remark } = this.data
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const orderInfo = {
      orderNo: String(orderId || ''),
      customerName: address ? (address.name || address.receiverName || '') : '',
      customerPhone: address ? (address.phone || address.mobile || '') : '',
      address: address ? [
        address.province || '',
        address.city || '',
        address.district || '',
        address.detail || address.address || '',
      ].filter(Boolean).join(' ') : '',
      items: items.map((item) => ({
        name: item.name || item.productName || '',
        skuSpec: item.skuSpec || item.spec || '',
        qty: item.qty || 1,
        price: item.price || 0,
      })),
      subtotal,
      freight,
      total,
      remark: remark || '',
      time,
    }
    wecomBot.submitOrder(orderInfo).catch(() => {
      // 通知发送失败不影响主流程，静默处理
    })
  },

  /**
   * 调起微信支付。
   * 1. 后端 /client/pay/orders/:id 返回 wx.requestPayment 所需参数
   * 2. wx.requestPayment 唤起收银台
   * 3. 不论成功/失败/取消，统一把购物车里对应商品移除（订单已生成）
   * 4. 不再做"假支付"兜底，订单状态完全由后端微信回调决定
   */
  async pay(orderId) {
    try {
      const params = await api.pay.order(orderId)
      if (!params || !params.timeStamp || !params.paySign) {
        // 后端没返回合法支付参数，跳到结果页提示稍后重试
        this.removePaidItems()
        wx.showModal({
          title: '支付暂不可用',
          content: '请在订单列表中稍后重试支付，或联系管理员检查支付配置。',
          showCancel: false,
        })
        wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${orderId}&pending=1` })
        return
      }
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'RSA',
        paySign: params.paySign,
        success: () => {
          this.removePaidItems()
          wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${orderId}` })
        },
        fail: (err) => {
          // 用户取消或支付失败：订单仍在 pending_pay 状态，可在订单列表里继续支付
          const cancelled = err && err.errMsg && err.errMsg.indexOf('cancel') >= 0
          this.removePaidItems()
          wx.redirectTo({
            url: `/pages/pay-result/pay-result?orderId=${orderId}&pending=1${cancelled ? '&cancel=1' : ''}`,
          })
        },
      })
    } catch (err) {
      // 后端拒绝下单（如 503 / 缺配置 / 其他错误）：跳到结果页让用户稍后重试
      this.removePaidItems()
      wx.showModal({
        title: '支付暂不可用',
        content: (err && err.message) || '请稍后再试或联系管理员',
        showCancel: false,
      })
      wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${orderId}&pending=1` })
    }
  },
  removePaidItems() {
    const ids = this.data.items.map((item) => `${item.skuId}`)
    const cart = (app.loadCart ? app.loadCart() : []).filter((item) => !ids.includes(`${item.skuId}`))
    if (app.saveCart) app.saveCart(cart)
    this.setData({ submitting: false })
  },
})
