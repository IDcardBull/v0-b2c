// utils/api.js —— 业务 API 入口
// 服务器：http://124.221.2.61:3001 ，前缀 /api ，业务在 /client/...
const request = require('./request.js')
const RESOURCE_BASE = 'http://124.221.2.61:3001'

// ============ 工具：图片地址补全 ============
function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  if (/^(https?:|data:|wxfile:|cloud:|http:\/\/tmp\/)/i.test(url)) return url
  if (url.charAt(0) === '/') {
    if (url.indexOf('/images/') === 0) return url // 本地静态
    return RESOURCE_BASE + url
  }
  return RESOURCE_BASE + '/uploads/' + url
}

// ============ JSON 字段安全解析 ============
function safeJson(value, fallback) {
  if (value == null) return fallback
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch (_) { return fallback }
}

// ============ SKU 归一化（对应 Prisma Sku 表）============
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
    specs: specs,
    specText: specText,
    image: resolveImageUrl(raw.image || ''),
    retailPrice: retailPrice,
    memberPrice: memberPrice,
    price: price,
    stock: Number(raw.stock || 0),
    weight: raw.weight != null ? Number(raw.weight) : null,
    status: raw.status != null ? raw.status : 1,
  }
}

// 由 SKU 列表反推规格选项 [{name:'颜色', values:['青','白']}, ...]
function buildSpecOptions(skus) {
  if (!skus || skus.length === 0) return []
  const order = []
  const map = {}
  skus.forEach((sku) => {
    const keys = Object.keys(sku.specs || {})
    keys.forEach((key) => {
      if (!map[key]) {
        map[key] = []
        order.push(key)
      }
      const val = sku.specs[key]
      if (val != null && map[key].indexOf(val) === -1) map[key].push(val)
    })
  })
  return order.map((name) => ({ name: name, values: map[name] }))
}

// 选中的规格组合 → SKU
function findSkuBySelection(skus, selection) {
  if (!skus || skus.length === 0) return null
  const keys = Object.keys(selection || {})
  if (keys.length === 0) return null
  return skus.find((sku) => {
    const sp = sku.specs || {}
    return keys.every((k) => sp[k] === selection[k])
  }) || null
}

// 默认选中的规格（首个有库存，否则首个）
function defaultSelection(skus) {
  if (!skus || skus.length === 0) return {}
  const target = skus.find((s) => (s.stock || 0) > 0) || skus[0]
  return Object.assign({}, target.specs || {})
}

// ============ 商品归一化（对应 Prisma Product 表）============
function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null
  const mainImage =
    raw.mainImage || raw.main_image || raw.image || raw.coverImage || raw.cover || ''
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

  const brand = raw.brand && typeof raw.brand === 'object' ? raw.brand : null
  const category = raw.category && typeof raw.category === 'object' ? raw.category : null

  const retailPrice = Number(raw.retailPrice != null ? raw.retailPrice : (raw.price != null ? raw.price : 0))
  const memberPrice = raw.memberPrice != null ? Number(raw.memberPrice) : null
  // 显示价：首 SKU 的 price ，否则 memberPrice，再否则 retailPrice
  let displayPrice = retailPrice
  if (skus.length > 0 && skus[0].price > 0) displayPrice = skus[0].price
  else if (memberPrice != null && memberPrice > 0) displayPrice = memberPrice

  // 价格范围（多 SKU 时）
  const skuPrices = skus.map((s) => s.price).filter((p) => p > 0)
  const minPrice = skuPrices.length > 0 ? Math.min.apply(null, skuPrices) : displayPrice
  const maxPrice = skuPrices.length > 0 ? Math.max.apply(null, skuPrices) : displayPrice

  const sub =
    (brand && brand.name) ||
    (category && category.name) ||
    raw.brandName ||
    raw.categoryName ||
    raw.material ||
    raw.craft ||
    ''

  return {
    id: raw.id != null ? raw.id : (raw.code || ''),
    code: raw.code || '',
    name: raw.name || '',
    sub: sub,
    price: displayPrice,
    minPrice: minPrice,
    maxPrice: maxPrice,
    retailPrice: retailPrice,
    memberPrice: memberPrice,
    mainImage: resolvedMain,
    images: resolvedGallery,
    cover: resolvedMain,
    gallery: resolvedGallery,
    category: category,
    categoryId: raw.categoryId != null ? raw.categoryId : null,
    brand: brand,
    brandId: raw.brandId != null ? raw.brandId : null,
    tag: tags[0] || raw.tag || raw.label || (raw.isLimited ? '限量' : ''),
    tags: tags,
    intro: raw.intro || raw.description || raw.detail || '',
    detail: raw.detail || '',
    craft: raw.craft || '',
    material: raw.material || '',
    salesCount: Number(raw.salesCount || 0),
    rating: Number(raw.rating || 0),
    skus: skus,
    specOptions: specOptions,
    hasMultipleSkus: skus.length > 1,
    stock: skus.reduce((sum, s) => sum + (s.stock || 0), 0),
  }
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

function pickList(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.list)) return payload.list
  if (payload && Array.isArray(payload.items)) return payload.items
  if (payload && Array.isArray(payload.records)) return payload.records
  if (payload && Array.isArray(payload.rows)) return payload.rows
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

// ===== 兼容旧式 helper =====
function getProducts(params) {
  return request.get('/client/products', params || {}, { silent: true })
    .then((data) => pickList(data).map(normalizeProduct).filter(Boolean))
    .catch(() => [])
}

function getProduct(id) {
  if (id == null) return Promise.reject(new Error('缺少商品 id'))
  return request.get('/client/products/' + id, {}, { silent: true })
    .then(normalizeProduct)
}

function getBanners() {
  return request.get('/client/banners', {}, { silent: true })
    .then((data) => pickList(data).map(normalizeBanner).filter((b) => b && b.image))
    .catch(() => [])
}

function getCategories() {
  return request.get('/client/categories', {}, { silent: true }).catch(() => [])
}

// ===== 新式对象式 API =====
const api = {
  BASE_URL: RESOURCE_BASE,
  resolveImageUrl,
  normalizeProduct,
  normalizeSku,
  normalizeBanner,
  buildSpecOptions,
  findSkuBySelection,
  defaultSelection,
  pickList,
  getProducts,
  getProduct,
  getBanners,
  getCategories,
  auth: {
    miniLogin: (code) => request.post('/client/auth/mini-login', { code }, { silent: true }),
    phoneLogin: (phone, code) => request.post('/client/auth/phone-login', { phone, code }),
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
  brand: {
    list: () => request.get('/client/brands', {}, { silent: true }),
  },
  product: {
    list: (params) => request.get('/client/products', params, { silent: true }),
    recommend: (limit = 8) => request.get('/client/products/recommend', { limit }, { silent: true }),
    detail: (id) => request.get('/client/products/' + id, {}, { silent: true }),
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
    create: (data) => request.post('/client/orders', data),
    list: (params) => request.get('/client/orders', params),
    counts: () => request.get('/client/orders/status-counts', {}, { silent: true }),
    detail: (id) => request.get('/client/orders/' + id),
    cancel: (id) => request.patch('/client/orders/' + id + '/cancel'),
    confirm: (id) => request.patch('/client/orders/' + id + '/confirm'),
  },
  pay: {
    order: (id) => request.post('/client/pay/orders/' + id),
  },
}

module.exports = api
