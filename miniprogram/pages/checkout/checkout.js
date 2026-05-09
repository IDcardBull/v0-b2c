// pages/checkout/checkout.js
const app = getApp()
const api = require('../../utils/api.js')

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
    freightLoading: false,  // 正在向后端按地址拉真实运费
    freightProvince: '',    // 后端按哪个省算的（用于显示提示）
    freightTip: '',         // 运费来源提示（如"未配运费模板"），为空时显示默认提示
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
    this.recalcLocal()
    this.loadAddress()
  },
  /**
   * 本地预估值（地址加载前 / 后端拉取失败时使用）。
   * 真正的运费由 reloadFreight() 调用后端 /client/orders/preview 算，
   * 后端会按收件省匹配运费模板的"特殊地区/满额包邮"规则，与下单时金额一致。
   */
  recalcLocal() {
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
    this.setData({
      subtotal: Math.round(subtotal * 100) / 100,
      freight: Math.round(freight * 100) / 100,
      total: Math.round(total * 100) / 100,
      allFreeShipping,
    })
  },
  /**
   * 调用后端 preview 接口，按收件省算真实运费 + 应付。
   * 静默失败 → 仍用本地估算，避免阻塞用户结算。
   */
  reloadFreight() {
    const items = (this.data.items || [])
      .map((it) => ({ skuId: it.skuId, qty: Number(it.qty) || 1 }))
      .filter((it) => it.skuId)
    if (!items.length) return Promise.resolve()
    if (!wx.getStorageSync('token')) return Promise.resolve() // 未登录就先跳过
    this.setData({ freightLoading: true })
    return api.order.preview(items, this.data.address && this.data.address.id)
      .then((res) => {
        if (!res) return
        const subtotal = Number(res.totalAmount || 0)
        const freight = Number(res.freight || 0)
        const total = Number(res.payAmount != null ? res.payAmount : subtotal + freight)
        const allFreeShipping = freight === 0 && subtotal > 0
        // 由 breakdown 推断"为什么是 0 元"，把诊断信息直接写到结算页
        // 让用户/运营一眼能看出"模板没配 / 命中了满额包邮 / 商品没挂模板"
        let freightTip = ''
        const breakdown = Array.isArray(res.breakdown) ? res.breakdown : []
        if (freight === 0 && subtotal > 0 && breakdown.length) {
          // 优先级：legacy_all_free（商家手工设置全免邮，正常情况）→ free_shipping → no_first_rule → legacy
          const reasons = breakdown.map((b) => b && b.reason).filter(Boolean)
          if (reasons.indexOf('no_first_rule') >= 0) {
            freightTip = '该商品的运费模板未配置首件规则，已暂按免邮处理'
          } else if (reasons.indexOf('legacy') >= 0) {
            freightTip = '部分商品未挂运费模板，按商品默认运费计算'
          } else if (reasons.indexOf('free_shipping') >= 0) {
            freightTip = '已满足运费模板的满额包邮条件'
          } else if (reasons.every((r) => r === 'legacy_all_free')) {
            freightTip = '该商品已设置为包邮'
          }
        } else if (freight > 0 && breakdown.length > 1) {
          // 多模板分组累加，强调一下计算方式
          freightTip = '订单含多个运费模板，运费已按模板分别计算并相加'
        }
        this.setData({
          subtotal,
          freight,
          total,
          allFreeShipping,
          freightLoading: false,
          freightProvince: res.province || '',
          freightTip,
        })
      })
      .catch(() => {
        this.setData({ freightLoading: false })
        // 不弹错，沉默回退到本地估算（已经在 recalcLocal 写过了）
      })
  },
  onShow() {
    // 从 address 页选完新地址回来时刷新
    const picked = wx.getStorageSync('selectedAddress')
    if (picked && (!this.data.address || picked.id !== this.data.address.id)) {
      this.setData({ address: picked })
      wx.removeStorageSync('selectedAddress')
      this.reloadFreight()
    }
  },
  async loadAddress() {
    try {
      const list = await api.address.list()
      const address = (list || []).find((item) => item.isDefault) || (list || [])[0] || null
      this.setData({ address })
    } catch (err) {}
    // 不论拿到/没拿到地址都让后端算一次（拿到→按收件省；没拿到→后端用全国默认规则）
    this.reloadFreight()
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
      // 企微通知由服务端 WorkWxService 在订单创建/支付时主动推送（见 server/.env WORK_WX_BOT_WEBHOOK）。
      // 拉起微信支付
      await this.pay(orderId)
    } catch (err) {
      this.setData({ submitting: false })
    }
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
          // 主动同步一次，避免微信异步回调延迟/失败导致订单状态没更新
          api.pay.sync(orderId).catch(() => {})
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
