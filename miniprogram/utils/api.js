// utils/api.js —— 业务 API 入口
const request = require('./request.js')
const RESOURCE_BASE = 'https://api-proxy-256554-6-1424676913.sh.run.tcloudbase.com'

function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  if (/^(https?:|data:|wxfile:|cloud:|http:\/\/tmp\/)/i.test(url)) return url
  if (url.charAt(0) === '/') {
    if (url.indexOf('/images/') === 0) return url
    return RESOURCE_BASE + url
  }
  return RESOURCE_BASE + '/uploads/' + url
}

function safeJson(value, fallback) {
  if (value == null) return fallback
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch (err) { return err ? fallback : fallback }
}

function normalizeSku(raw) {
  if (!raw || typeof raw !== 'object') return null
  let specs = safeJson(raw.specs, raw.specs)
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) specs = {}
  const specText = Object.keys(specs).map((k) => specs[k]).filter(Boolean).join(' · ')
  const retailPrice = Number(raw.retailPrice != null ? raw.retailPrice : (raw.price != null ? raw.price : 0))
  const memberPrice = raw.memberPrice != null ? Number(raw.memberPrice) : null
  const price = memberPrice != null && memberPrice > 0 ? memberPrice : retailPrice
  return {
    id: raw.id,
    code: raw.code || '',
    productId: raw.productId,
    specs,
    specText,
    image: resolveImageUrl(raw.image || ''),
    retailPrice,
    memberPrice,
    price,
    stock: Number(raw.stock || 0),
    weight: raw.weight != null ? Number(raw.weight) : null,
    status: raw.status != null ? raw.status : 1,
  }
}

function buildSpecOptions(skus) {
  if (!skus || skus.length === 0) return []
  const order = []
  const map = {}
  skus.forEach((sku) => {
    Object.keys(sku.specs || {}).forEach((key) => {
      if (!map[key]) {
        map[key] = []
        order.push(key)
      }
      const val = sku.specs[key]
      if (val != null && map[key].indexOf(val) === -1) map[key].push(val)
    })
  })
  return order.map((name) => ({ name, values: map[name] }))
}

function findSkuBySelection(skus, selection) {
  if (!skus || skus.length === 0) return null
  const keys = Object.keys(selection || {})
  if (keys.length === 0) return null
  return skus.find((sku) => {
    const sp = sku.specs || {}
    return keys.every((k) => sp[k] === selection[k])
  }) || null
}

function defaultSelection(skus) {
  if (!skus || skus.length === 0) return {}
  const target = skus.find((s) => (s.stock || 0) > 0) || skus[0]
  return Object.assign({}, target.specs || {})
}

function pickList(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.list)) return payload.list
  if (payload && Array.isArray(payload.items)) return payload.items
  if (payload && Array.isArray(payload.records)) return payload.records
  if (payload && Array.isArray(payload.rows)) return payload.rows
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null
  const mainImage = raw.mainImage || raw.main_image || raw.image || raw.coverImage || raw.cover || ''
  let images = safeJson(raw.images, raw.images) || raw.gallery || raw.pictures || []
  if (!Array.isArray(images)) images = images ? [images] : []
  if (images.length === 0 && mainImage) images = [mainImage]
  const resolvedMain = resolveImageUrl(mainImage)
  const resolvedGallery = images.map(resolveImageUrl).filter(Boolean)
  let tags = safeJson(raw.tags, raw.tags) || []
  if (!Array.isArray(tags)) tags = tags ? [tags] : []
  const rawSkus = Array.isArray(raw.skus) ? raw.skus : (Array.isArray(raw.skuList) ? raw.skuList : [])
  const skus = rawSkus.map(normalizeSku).filter(Boolean)
  const specOptions = buildSpecOptions(skus)
  const category = raw.category && typeof raw.category === 'object' ? raw.category : null
  const status = raw.status == null ? 1 : Number(raw.status)
  const retailPrice = Number(raw.retailPrice != null ? raw.retailPrice : (raw.price != null ? raw.price : 0))
  const memberPrice = raw.memberPrice != null ? Number(raw.memberPrice) : null
  let displayPrice = retailPrice
  if (skus.length > 0 && skus[0].price > 0) displayPrice = skus[0].price
  else if (memberPrice != null && memberPrice > 0) displayPrice = memberPrice
  const skuPrices = skus.map((s) => s.price).filter((p) => p > 0)
  const minPrice = skuPrices.length > 0 ? Math.min.apply(null, skuPrices) : displayPrice
  const maxPrice = skuPrices.length > 0 ? Math.max.apply(null, skuPrices) : displayPrice
  // v2 简化：移除 brand/material/craft 兜底
  const sub = (category && category.name) || raw.categoryName || ''
  return {
    id: raw.id != null ? raw.id : (raw.code || ''),
    code: raw.code || '',
    name: raw.name || '',
    sub,
    price: displayPrice,
    minPrice,
    maxPrice,
    retailPrice,
    memberPrice,
    mainImage: resolvedMain,
    images: resolvedGallery,
    cover: resolvedMain,
    gallery: resolvedGallery,
    category,
    categoryId: raw.categoryId != null ? raw.categoryId : null,
    tag: tags[0] || raw.tag || raw.label || (raw.isLimited ? '限量' : ''),
    tags,
    intro: raw.intro || raw.description || raw.detail || '',
    detail: raw.detail || '',
    salesCount: Number(raw.salesCount || 0),
    rating: Number(raw.rating || 0),
    skus,
    specOptions,
    hasMultipleSkus: skus.length > 1,
    stock: skus.reduce((sum, s) => sum + (s.stock || 0), 0),
    status,
    retailEnabled: raw.retailEnabled === true,
    wholesaleEnabled: raw.wholesaleEnabled === true,
    // 包邮配置（管理端「商品基础信息」可配）
    freeShipping: raw.freeShipping === true || raw.free_shipping === true,
    shippingFee: Number(
      raw.shippingFee != null
        ? raw.shippingFee
        : raw.shipping_fee != null
          ? raw.shipping_fee
          : 0,
    ) || 0,
  }
}

function filterRetailProducts(list) {
  return (list || []).filter((item) => item && item.retailEnabled === true && (item.status == null || Number(item.status) === 1))
}

function normalizeRetailProducts(data) {
  return filterRetailProducts(pickList(data)).map(normalizeProduct).filter(Boolean)
}

function normalizeBanner(raw) {
  if (!raw) return null
  const image = raw.image || raw.imageUrl || raw.cover || raw.mainImage || raw.url || ''
  return {
    id: raw.id != null ? String(raw.id) : '',
    image: resolveImageUrl(image),
    link: raw.link || raw.target || '',
    title: raw.title || '',
  }
}

function retailParams(params) {
  return Object.assign({ channel: 'retail' }, params || {})
}

function getProducts(params) {
  const query = retailParams(params)
  return request.get('/client/product/list', query, { silent: true })
    .catch(() => request.get('/client/products', query, { silent: true }))
    .then((data) => normalizeRetailProducts(data))
    .catch(() => [])
}

function getProduct(id) {
  if (id == null) return Promise.reject(new Error('缺少商品 id'))
  return request.get('/client/product/' + id, { channel: 'retail' }, { silent: true })
    .catch(() => request.get('/client/products/' + id, { channel: 'retail' }, { silent: true }))
    .then((data) => {
      if (!data || data.retailEnabled !== true || (data.status != null && Number(data.status) !== 1)) return null
      return normalizeProduct(data)
    })
}

function getBanners() {
  return request.get('/client/banners', {}, { silent: true })
    .then((data) => pickList(data).map(normalizeBanner).filter((b) => b && b.image))
    .catch(() => [])
}

function getCategories() {
  return request.get('/client/categories', {}, { silent: true }).catch(() => [])
}

const api = {
  BASE_URL: RESOURCE_BASE,
  resolveImageUrl,
  normalizeProduct,
  normalizeSku,
  normalizeBanner,
  normalizeRetailProducts,
  filterRetailProducts,
  buildSpecOptions,
  findSkuBySelection,
  defaultSelection,
  pickList,
  getProducts,
  getProduct,
  getBanners,
  getCategories,
  auth: {
    // channel:'retail' 让后端用零售小程序的 AppID/Secret 调 jscode2session
    miniLogin: (code) =>
      request.post('/client/auth/mini-login', { code, channel: 'retail' }, { silent: true, noAuth: true }),
    phoneLogin: (phone, code) =>
      request.post('/client/auth/phone-login', { phone, code, channel: 'retail' }),
    bindPhone: (phone) => request.post('/client/auth/bind-phone', { phone }),
  },
  user: {
    profile: () => request.get('/client/user/profile', {}, { silent: true }),
    updateProfile: (data) => request.patch('/client/user/profile', data),
  },
  category: {
    tree: () => request.get('/client/categories/tree', {}, { silent: true }),
    list: () => request.get('/client/categories', {}, { silent: true }),
  },
  product: {
    list: (params) => {
      const query = retailParams(params)
      return request.get('/client/product/list', query, { silent: true })
        .catch(() => request.get('/client/products', query, { silent: true }))
    },
    recommend: (limit = 8) => request.get('/client/products/recommend', { limit, channel: 'retail' }, { silent: true }),
    detail: (id) => getProduct(id),
  },
  address: {
    list: () => request.get('/client/addresses'),
    detail: (id) => request.get('/client/addresses/' + id),
    create: (data) => request.post('/client/addresses', data),
    update: (id, data) => request.put('/client/addresses/' + id, data),
    setDefault: (id) => request.patch('/client/addresses/' + id + '/default'),
    remove: (id) => request.delete('/client/addresses/' + id),
  },
  order: {
    create: (data) => request.post('/client/orders', Object.assign({ channel: 'retail', source: 'miniprogram_a' }, data || {})),
    /**
     * 结算页运费试算 —— 不落库
     * items + addressId → 后端按收件省匹配运费模板规则（含特殊地区/满额包邮），
     * 返回 { totalAmount, freight, payAmount, province, breakdown[] }
     */
    preview: (items, addressId) =>
      request.post(
        '/client/orders/preview',
        { items: items || [], addressId: addressId || undefined, channel: 'retail' },
        { silent: true },
      ),
    list: (params) => request.get('/client/orders', params),
    counts: () => request.get('/client/orders/status-counts', {}, { silent: true }),
    detail: (id) => request.get('/client/orders/' + id),
    cancel: (id) => request.patch('/client/orders/' + id + '/cancel'),
    confirm: (id) => request.patch('/client/orders/' + id + '/confirm'),
    updateAddress: (id, addressId) => request.patch('/client/orders/' + id + '/address', { addressId })
      .catch(() => request.put('/client/orders/' + id + '/address', { addressId }))
      .catch(() => request.patch('/client/order/' + id + '/address', { addressId }))
      .catch(() => request.post('/client/orders/' + id + '/update-address', { addressId })),
    logistics: (id) => request.get('/client/orders/' + id + '/logistics', {}, { silent: true })
      .catch(() => request.get('/client/order/' + id + '/logistics', {}, { silent: true }))
      .catch(() => request.get('/client/logistics/' + id, {}, { silent: true })),
  },
  pay: {
    order: (id) => request.post('/client/pay/orders/' + id),
    /**
     * 主动同步支付状态（解决"明明付钱了但订单仍待支付"的问题）
     * 应在 wx.requestPayment success 回调里立刻调用一次；进入 pay-result 页时也兜底调用。
     * 后端去微信查 trade_state，命中 SUCCESS 即 markPaid。
     */
    sync: (id) =>
      request.post('/client/pay/orders/' + id + '/sync', {}, { silent: true }),
  },
  review: {
    create: (data) => request.post('/client/reviews', data),
    listByProduct: (productId, params) => request.get('/client/reviews', Object.assign({ productId }, params || {}), { silent: true }),
  },
  admin: {
    login: (username, password) =>
      request.post('/admin/auth/login', { username, password }, { auth: 'admin', noAuth: true }),
    profile: () => request.get('/admin/auth/profile', {}, { auth: 'admin', silent: true }),
    logout: () => request.post('/admin/auth/logout', {}, { auth: 'admin', silent: true }),
    dashboard: {
      overview: () => request.get('/admin/dashboard/overview', {}, { auth: 'admin', silent: true }),
      salesTrend: (days) => request.get('/admin/dashboard/sales-trend', { days }, { auth: 'admin', silent: true }),
      topProducts: (limit) => request.get('/admin/dashboard/top-products', { limit }, { auth: 'admin', silent: true }),
    },
    order: {
      list: (params) => request.get('/admin/orders', params || {}, { auth: 'admin' }),
      counts: (channel) => request.get('/admin/orders/status-counts', channel ? { channel } : {}, { auth: 'admin', silent: true }),
      detail: (id) => request.get('/admin/orders/' + id, {}, { auth: 'admin' }),
      logistics: (id) => request.get('/admin/orders/' + id + '/logistics', {}, { auth: 'admin', silent: true }),
      ship: (id, payload) => request.patch('/admin/orders/' + id + '/ship', payload, { auth: 'admin' }),
      markPaid: (id) => request.patch('/admin/orders/' + id + '/mark-paid', {}, { auth: 'admin' }),
      complete: (id) => request.patch('/admin/orders/' + id + '/complete', {}, { auth: 'admin' }),
      close: (id, reason) => request.patch('/admin/orders/' + id + '/close', { reason: reason || '' }, { auth: 'admin' }),
      refund: (id, amount, reason) => request.post('/admin/orders/' + id + '/refund', { amount, reason }, { auth: 'admin' }),
    },
    product: {
      list: (params) => request.get('/admin/products', params || {}, { auth: 'admin' }),
      detail: (id) => request.get('/admin/products/' + id, {}, { auth: 'admin' }),
      toggleListing: (id) => request.patch('/admin/products/' + id + '/toggle-listing', {}, { auth: 'admin' }),
      toggleRetail: (id) => request.patch('/admin/products/' + id + '/toggle-retail', {}, { auth: 'admin' }),
      setStatus: (id, status) => request.patch('/admin/products/' + id + '/status', { status }, { auth: 'admin' }),
      setChannel: (id, channel, enabled) => request.patch('/admin/products/' + id + '/channel', { channel, enabled }, { auth: 'admin' }),
    },
    sku: {
      listByProduct: (productId) => request.get('/admin/sku/by-product/' + productId, {}, { auth: 'admin' }),
      detail: (id) => request.get('/admin/sku/' + id, {}, { auth: 'admin' }),
      updateStock: (id, stock) => request.patch('/admin/sku/' + id + '/stock', { stock: Number(stock) }, { auth: 'admin' }),
    },
    banner: {
      // 后端 BannerAdminController 路径是 /api/home/banners（不是 /admin/）—
      // 必须显式声明 auth:'admin'，否则 request.js 会按客户端 token 走。
      list: () => request.get('/home/banners', {}, { auth: 'admin', silent: true }),
      save: (list) => request.post('/home/banners', list, { auth: 'admin' }),
    },
    /**
     * 上传图片到后端 /api/upload，返回 { url }。
     * 必须用 wx.uploadFile（不能 wx.request multipart），手工拼上 admin token。
     */
    upload(filePath) {
      return new Promise((resolve, reject) => {
        const adminToken = wx.getStorageSync('adminToken') || ''
        wx.uploadFile({
          url: request.BASE_URL + '/upload',
          filePath,
          name: 'file',
          header: adminToken ? { Authorization: 'Bearer ' + adminToken } : {},
          success: (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error('上传失败 (' + res.statusCode + ')'))
              return
            }
            try {
              const body = JSON.parse(res.data || '{}')
              if (body && body.url) resolve(body)
              else reject(new Error(body.message || '上传响应格式不正确'))
            } catch (err) {
              reject(err instanceof Error ? err : new Error('上传响应解析失败'))
            }
          },
          fail: (err) => reject(err),
        })
      })
    },
  },
}

module.exports = api
