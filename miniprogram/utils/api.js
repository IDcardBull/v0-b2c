// utils/api.js
// 与后端通信层。后端基址：http://124.221.2.61:3001
// 商品对象按 Prisma 模型对齐：
//   mainImage: 主图（String）
//   images:    多图（JSON 数组）
//   detail:    富文本详情（LongText）
// 兼容旧字段：cover / image / coverImage / gallery / pictures

const BASE_URL = 'http://124.221.2.61:3001'

/**
 * 解析图片地址：把后端返回的相对路径补全为绝对地址。
 * - 已是 http(s)/data:/wxfile:// 直接返回
 * - 以 / 开头的路径补全为 BASE_URL + path
 * - 仅文件名的回退到 /uploads/<file>
 */
function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  if (/^(https?:|data:|wxfile:|cloud:|http:\/\/tmp\/)/i.test(url)) return url
  if (url.charAt(0) === '/') return BASE_URL + url
  // 本地资源：/images/xxx.jpg 这类已经 / 开头会被上一行命中，
  // 这里只剩单纯文件名的极端情况。
  return BASE_URL + '/uploads/' + url
}

/**
 * 把后端商品对象规范化为前端使用的形态。
 * 优先 mainImage / images，再依次回退老字段。
 */
function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null
  const mainImage =
    raw.mainImage ||
    raw.main_image ||
    raw.image ||
    raw.coverImage ||
    raw.cover ||
    ''
  let images = raw.images || raw.gallery || raw.pictures || []
  // 后端 JSON 字段可能是字符串
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images)
    } catch (_) {
      images = images ? [images] : []
    }
  }
  if (!Array.isArray(images)) images = []
  // 详情页画册：若没有 images，则用 mainImage 顶上
  if (images.length === 0 && mainImage) images = [mainImage]

  const resolvedMain = resolveImageUrl(mainImage)
  const resolvedGallery = images.map(resolveImageUrl).filter(Boolean)

  // 分类映射：后端 categoryId 是数字；前端按业务需要落到 'tea'/'vase'/...
  // 这里给一个软映射，未匹配则透传字符串。
  const CAT_MAP = { 1: 'tea', 2: 'vase', 3: 'incense', 4: 'art' }
  const category =
    raw.category ||
    (raw.categoryId != null ? CAT_MAP[raw.categoryId] || String(raw.categoryId) : '')

  // 规格：后端可能是字符串/数组/对象，统一为 string[]
  let specs = raw.specs
  if (typeof specs === 'string') {
    try {
      specs = JSON.parse(specs)
    } catch (_) {
      specs = specs.split(/\n+/).filter(Boolean)
    }
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
    category: category,
    categoryId: raw.categoryId != null ? raw.categoryId : null,
    tag: raw.tag || raw.label || '',
    intro: raw.intro || raw.description || raw.detail || '',
    specs: specs,
    craft: raw.craft || '',
    material: raw.material || '',
  }
}

/**
 * 把后端 banner 规范化为 { id, image, link }
 */
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

/**
 * 通用请求
 * @param {string} path  以 / 开头的接口路径
 * @param {object} opts  { method, data, header }
 */
function request(path, opts) {
  const options = opts || {}
  return new Promise(function (resolve, reject) {
    wx.request({
      url: BASE_URL + path,
      method: options.method || 'GET',
      data: options.data || {},
      header: Object.assign(
        { 'content-type': 'application/json' },
        options.header || {}
      ),
      timeout: options.timeout || 15000,
      success: function (res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error('HTTP ' + res.statusCode))
          return
        }
        // 兼容 { code, data } / 直接 data 两种返回
        const body = res.data
        if (body && typeof body === 'object' && 'data' in body && !Array.isArray(body)) {
          resolve(body.data)
        } else {
          resolve(body)
        }
      },
      fail: reject,
    })
  })
}

/**
 * 商品列表。可选 params: { categoryId, keyword, page, pageSize }
 * 接口路径默认 /api/products，未约定时也兼容 /api/product/list。
 */
function getProducts(params) {
  const query = params || {}
  return request('/api/products', { data: query })
    .catch(function () {
      return request('/api/product/list', { data: query })
    })
    .then(function (data) {
      // 列表可能藏在 data.list / data.items / data.records 里
      const list = Array.isArray(data)
        ? data
        : (data && (data.list || data.items || data.records || data.rows)) || []
      return list.map(normalizeProduct).filter(Boolean)
    })
}

/**
 * 商品详情。先按 RESTful /api/products/:id，再回退查询参数。
 */
function getProduct(id) {
  if (id == null) return Promise.reject(new Error('缺少商品 id'))
  return request('/api/products/' + id)
    .catch(function () {
      return request('/api/product/detail', { data: { id: id } })
    })
    .then(function (data) {
      return normalizeProduct(data)
    })
}

/**
 * 轮播图。后端若没有此接口则返回空数组，前端会自动回退到本地 hero 图。
 */
function getBanners() {
  return request('/api/banners')
    .catch(function () {
      return request('/api/home/banners').catch(function () {
        return []
      })
    })
    .then(function (data) {
      const list = Array.isArray(data) ? data : (data && data.list) || []
      return list.map(normalizeBanner).filter(function (b) {
        return b && b.image
      })
    })
}

/**
 * 分类列表。可选；若后端未提供则返回空数组（页面用本地静态分类）。
 */
function getCategories() {
  return request('/api/categories')
    .catch(function () {
      return []
    })
    .then(function (data) {
      const list = Array.isArray(data) ? data : (data && data.list) || []
      return list
    })
}

module.exports = {
  BASE_URL: BASE_URL,
  resolveImageUrl: resolveImageUrl,
  normalizeProduct: normalizeProduct,
  normalizeBanner: normalizeBanner,
  request: request,
  getProducts: getProducts,
  getProduct: getProduct,
  getBanners: getBanners,
  getCategories: getCategories,
}
