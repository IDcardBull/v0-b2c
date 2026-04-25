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
  if (payload && Array.isArray(payload.items)) return payload.items
  if (payload && Array.isArray(payload.records)) return payload.records
  if (payload && Array.isArray(payload.rows)) return payload.rows
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
  return product.origin || product.subTitle || '釉见 · 手作'
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
  const cover = pickImage(
    product.cover || product.coverUrl || product.image || product.mainImage || images,
    index,
  )
  const gallery = (Array.isArray(images) ? images : [images])
    .map((img, i) => pickImage(img, i))
    .filter(Boolean)
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
    mainImage: cover,
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
  const motto = user && (user.motto || user.signature || user.bio || user.intro)
  const collect = user && (user.collectCount || user.favoriteCount || user.collect)
  const follow = user && (user.followCount || user.footprintCount || user.follow)
  return {
    initial: nickname ? nickname.slice(0, 1) : '釉',
    name: nickname || '无名氏',
    level: level || '入席·甲',
    motto: motto || '一盏清茗，静听风声。',
    collect: Number(collect || 0),
    follow: Number(follow || 0),
    points: Number((user && user.points) || 0),
    raw: user || null,
  }
}

const STATUS_LABEL = {
  pending_pay: '待 · 付',
  pending_ship: '待 · 发',
  shipped: '在 · 途',
  completed: '已 · 成',
  after_sale: '售 · 后',
  closed: '已 · 撤',
  cancelled: '已 · 撤',
  refunded: '已 · 退',
}

const STATUS_NOTE = {
  pending_pay: '尚待付款，请在30分钟内完成支付',
  pending_ship: '主理人正在为您包装备发',
  shipped: '已交付驿使，敬候收件',
  completed: '此器已入您之雅斋',
  after_sale: '售后处理中',
  closed: '订单已关闭',
  cancelled: '订单已撤销',
  refunded: '订单已退款',
}

function normalizeOrderStatus(status) {
  return STATUS_LABEL[status] || '处 · 理'
}

function normalizeOrderItem(item, index = 0) {
  const product = item.product || {}
  const skuObj = item.sku || {}
  const image = pickImage(
    item.image ||
      item.productImage ||
      item.cover ||
      product.cover ||
      product.mainImage ||
      product.image ||
      skuObj.image,
    index,
  )
  return {
    id: item.id,
    productId: item.productId || product.id,
    skuId: item.skuId || skuObj.id,
    name: item.productName || item.name || product.name || '雅器',
    image,
    spec: item.skuSpec || item.specText || skuText(skuObj) || '',
    price: Number(item.price || item.unitPrice || skuObj.retailPrice || 0),
    quantity: Number(item.quantity || item.qty || 1),
  }
}

function normalizeAddress(addr) {
  if (!addr) return null
  const province = addr.province || ''
  const city = addr.city || ''
  const district = addr.district || addr.area || ''
  const detail = addr.detail || addr.address || ''
  return {
    id: addr.id,
    receiver: addr.receiver || addr.name || addr.contact || '',
    phone: addr.phone || addr.mobile || '',
    province,
    city,
    district,
    detail,
    full: `${province}${city}${district} ${detail}`.trim(),
    isDefault: !!addr.isDefault,
    tag: addr.tag || '',
  }
}

function normalizeOrder(order) {
  if (!order) return null
  const status = order.status || 'pending_pay'
  const items = (order.items || order.orderItems || []).map((it, i) => normalizeOrderItem(it, i))
  const totalQty = items.reduce((s, x) => s + (x.quantity || 0), 0)
  const subtotal = Number(
    order.subtotal ||
      order.itemsTotal ||
      items.reduce((s, x) => s + x.price * x.quantity, 0),
  )
  const freight = Number(order.freight || order.shippingFee || 0)
  const discount = Number(order.discount || order.discountAmount || 0)
  const total = Number(order.totalAmount || order.total || order.payAmount || 0)
  return {
    ...order,
    id: order.id,
    orderNo: order.orderNo || order.orderNumber || `#${order.id}`,
    status,
    statusLabel: normalizeOrderStatus(status),
    statusHero: normalizeOrderStatus(status),
    statusNote: STATUS_NOTE[status] || '',
    statusKey: status,
    address: normalizeAddress(order.address || order.shippingAddress),
    items,
    itemsCount: items.length,
    totalQty,
    subtotal,
    freight,
    discount,
    total,
    amount: total,
    remark: order.remark || order.note || '',
    createdAt: order.createdAt || '',
    paidAt: order.paidAt || '',
    shippedAt: order.shippedAt || '',
    completedAt: order.completedAt || '',
  }
}

module.exports = {
  pickList,
  pickImage,
  normalizeCategories,
  normalizeCategory,
  normalizeProducts,
  normalizeProduct,
  normalizeUser,
  normalizeOrder,
  normalizeOrderStatus,
  normalizeAddress,
}
