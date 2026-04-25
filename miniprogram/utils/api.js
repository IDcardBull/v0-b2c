// utils/api.js —— 业务 API 入口
// 服务器：http://124.221.2.61:3001 ，前缀 /api ，业务在 /client/...
const request = require('./request.js')
const RESOURCE_BASE = 'http://124.221.2.61:3001'

// 把后端返回的相对图片路径补全成绝对 URL
function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  if (/^(https?:|data:|wxfile:|cloud:|http:\/\/tmp\/)/i.test(url)) return url
  if (url.charAt(0) === '/') {
    // 本地静态资源：以 /images 开头
    if (url.indexOf('/images/') === 0) return url
    return RESOURCE_BASE + url
  }
  return RESOURCE_BASE + '/uploads/' + url
}

// 商品对象规范化
function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null
  const mainImage =
    raw.mainImage || raw.main_image || raw.image || raw.coverImage || raw.cover || ''
  let images = raw.images || raw.gallery || raw.pictures || []
  if (typeof images === 'string') {
    try { images = JSON.parse(images) } catch (_) { images = images ? [images] : [] }
  }
  if (!Array.isArray(images)) images = []
  if (images.length === 0 && mainImage) images = [mainImage]

  const resolvedMain = resolveImageUrl(mainImage)
  const resolvedGallery = images.map(resolveImageUrl).filter(Boolean)

  let specs = raw.specs
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs) } catch (_) { specs = specs.split(/\n+/).filter(Boolean) }
  }
  if (!Array.isArray(specs)) specs = []

  return {
    id: raw.id != null ? String(raw.id) : raw.code || '',
    code: raw.code || '',
    name: raw.name || '',
    sub: raw.sub || raw.brand || raw.brandName || raw.material || '',
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || 0,
    mainImage: resolvedMain,
    images: resolvedGallery,
    cover: resolvedMain, // 兼容旧字段名
    gallery: resolvedGallery,
    category: raw.category || raw.categoryCode || '',
    categoryId: raw.categoryId != null ? raw.categoryId : null,
    tag: raw.tag || raw.label || (raw.isLimited ? '限量' : ''),
    intro: raw.intro || raw.description || raw.detail || '',
    specs: specs,
    craft: raw.craft || '',
    material: raw.material || '',
  }
}

function normalizeBanner(raw) {
  if (!raw) return null
  const image =
    raw.image || raw.imageUrl || raw.cover || raw.mainImage || raw.url || ''
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
  normalizeBanner,
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
