const fallbackImages = [
  '/images/product-teapot.jpg',
  '/images/product-vase.jpg',
  '/images/product-incense.jpg',
  '/images/product-bowl.jpg',
  '/images/product-art.jpg',
  '/images/product-cup.jpg',
  '/images/product-vase2.jpg',
]

function pickImage(value, index = 0) {
  if (!value) return fallbackImages[index % fallbackImages.length]
  if (Array.isArray(value)) return pickImage(value[0], index)
  if (typeof value === 'object') return pickImage(value.url || value.path || value.src, index)
  return value
}

function pickList(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.list)) return payload.list
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

function firstSku(product) {
  const skus = product.skus || product.skuList || product.sku || []
  if (!Array.isArray(skus)) return skus || null
  return skus.find((s) => s.status !== 0 && s.enabled !== false) || skus[0] || null
}

function skuText(sku) {
  if (!sku) return ''
  if (sku.specName) return sku.specName
  if (sku.name) return sku.name
  if (sku.spec) return typeof sku.spec === 'string' ? sku.spec : Object.values(sku.spec).join(' · ')
  const attrs = sku.attrs || sku.attributes || sku.properties
  if (attrs && typeof attrs === 'object') return Object.values(attrs).join(' · ')
  return sku.code || ''
}

function priceOf(product, sku) {
  const value = sku && (sku.retailPrice || sku.price || sku.salePrice || sku.memberPrice)
  return Number(value || product.retailPrice || product.price || product.salePrice || 0)
}

function categoryName(product) {
  const category = product.category || product.categoryInfo
  if (category && category.name) return category.name
  if (product.categoryName) return product.categoryName
  const brand = product.brand || product.brandInfo
  if (brand && brand.name) return brand.name
  return product.origin || product.subTitle || '央茗 · 手作'
}

function normalizeCategory(item, index = 0) {
  const children = item.children || []
  return {
    ...item,
    id: item.id,
    name: item.name || item.title || `品类${index + 1}`,
    sub: item.sub || item.enName || item.code || 'CATEGORY',
    desc: item.desc || item.description || '一器一境，器以载道',
    children: children.map((child, childIndex) => normalizeCategory(child, childIndex)),
  }
}

function normalizeCategories(payload) {
  return pickList(payload).map((item, index) => normalizeCategory(item, index))
}

function normalizeProduct(product, index = 0) {
  const sku = firstSku(product) || {}
  const images = product.images || product.imageList || product.gallery || product.pictures || []
  const cover = pickImage(product.cover || product.coverUrl || product.image || product.mainImage || images, index)
  const gallery = (Array.isArray(images) ? images : [images]).map((img, i) => pickImage(img, i)).filter(Boolean)
  const specs = []
  const skuLabel = skuText(sku)
  if (skuLabel) specs.push(`规格 ${skuLabel}`)
  if (product.material) specs.push(`材质 ${product.material}`)
  if (product.size) specs.push(`尺寸 ${product.size}`)
  if (product.weight) specs.push(`重量 ${product.weight}`)
  if (product.code) specs.push(`款号 ${product.code}`)
  return {
    ...product,
    id: product.id,
    productId: product.id,
    skuId: sku.id || product.skuId || product.id,
    skuSpec: skuLabel,
    name: product.name || product.title || '未命名器物',
    sub: product.sub || product.subTitle || categoryName(product),
    price: priceOf(product, sku),
    cover,
    gallery: gallery.length ? gallery : [cover, '/images/hero-celadon.jpg', cover],
    category: product.categoryId || (product.category && product.category.id) || product.category,
    tag: product.tag || product.badge || (product.isLimited ? '限量' : ''),
    intro: product.intro || product.description || product.detail || '此器暂未题款，待主理人补录。',
    specs: product.specs || specs,
    rawSkus: product.skus || product.skuList || [],
  }
}

function normalizeProducts(payload) {
  return pickList(payload).map((item, index) => normalizeProduct(item, index))
}

function normalizeUser(user) {
  const nickname = user && (user.nickname || user.name || user.phone)
  const level = user && (user.levelName || (user.level && user.level.name))
  return {
    initial: nickname ? nickname.slice(0, 1) : '茗',
    name: nickname || '无名氏',
    level: level || '入席·甲',
    motto: '一盏清茗，静听风声。',
    collect: 0,
    follow: 0,
    points: (user && user.points) || 0,
    raw: user || null,
  }
}

function normalizeOrderStatus(status) {
  const map = {
    pending_pay: '待付款',
    pending_ship: '待发货',
    shipped: '待收货',
    completed: '已完成',
    after_sale: '售后中',
    closed: '已关闭',
  }
  return map[status] || status || '未知'
}

function normalizeOrder(order) {
  return {
    ...order,
    id: order.id,
    statusText: normalizeOrderStatus(order.status),
    amount: Number(order.totalAmount || order.amount || order.payAmount || 0),
    items: order.items || order.orderItems || [],
  }
}

module.exports = {
  pickList,
  normalizeCategories,
  normalizeCategory,
  normalizeProducts,
  normalizeProduct,
  normalizeUser,
  normalizeOrder,
  normalizeOrderStatus,
}
