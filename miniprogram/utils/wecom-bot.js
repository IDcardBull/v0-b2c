// utils/wecom-bot.js
// =====================================================
// 企业微信群机器人 Webhook 消息发送
// 用于 B2C 零售端：用户下单时通过 Webhook 发送订单到企微群
// =====================================================

const STORAGE_KEY = 'wecom_bot_key'
const WEBHOOK_BASE = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key='

function getWebhookUrl() {
  const key = wx.getStorageSync(STORAGE_KEY)
  if (!key) return ''
  return WEBHOOK_BASE + key
}

/**
 * 发送 markdown 消息到企微群
 * @param {string} content - markdown 内容
 * @returns {Promise}
 */
function sendMarkdown(content) {
  const url = getWebhookUrl()
  if (!url) {
    return Promise.reject(new Error('企业微信机器人未配置'))
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        msgtype: 'markdown',
        markdown: { content },
      },
      success(res) {
        if (res.data && res.data.errcode === 0) {
          resolve(res.data)
        } else {
          reject(new Error((res.data && res.data.errmsg) || '发送失败'))
        }
      },
      fail(err) {
        reject(err)
      },
    })
  })
}

/**
 * 构建零售订单 markdown 消息
 * @param {object} orderInfo
 * @param {string} orderInfo.orderNo      - 订单号
 * @param {string} orderInfo.customerName - 收件人
 * @param {string} orderInfo.customerPhone- 联系电话
 * @param {string} orderInfo.address      - 收货地址
 * @param {array}  orderInfo.items        - [{name, skuSpec, qty, price}]
 * @param {number} orderInfo.subtotal     - 商品小计
 * @param {number} orderInfo.freight      - 运费
 * @param {number} orderInfo.total        - 实付金额
 * @param {string} orderInfo.remark       - 备注
 * @param {string} orderInfo.time         - 下单时间
 * @returns {string}
 */
function buildOrderMarkdown(orderInfo) {
  const {
    orderNo, customerName, customerPhone, address,
    items, subtotal, freight, total, remark, time,
  } = orderInfo

  let md = `## 🛍️ 新零售订单\n`
  md += `> 订单编号：<font color="comment">${orderNo}</font>\n`
  md += `> 下单时间：<font color="comment">${time}</font>\n\n`

  md += `**收件信息**\n`
  md += `> 收件人：${customerName || '未填写'}\n`
  md += `> 电话：${customerPhone || '未填写'}\n`
  if (address) {
    md += `> 地址：${address}\n`
  }
  md += `\n`

  md += `**商品清单**（共 ${items.length} 种）\n`
  items.forEach((item, idx) => {
    const spec = item.skuSpec ? ` [${item.skuSpec}]` : ''
    md += `> ${idx + 1}. ${item.name}${spec}  × ${item.qty}件  ¥${Number(item.price || 0).toFixed(2)}\n`
  })
  md += `\n`

  md += `> 商品小计：¥${Number(subtotal || 0).toFixed(2)}\n`
  md += `> 运费：¥${Number(freight || 0).toFixed(2)}\n`
  md += `**实付金额：<font color="warning">¥${Number(total || 0).toFixed(2)}</font>**\n`

  if (remark) {
    md += `\n> 买家备注：${remark}\n`
  }

  md += `\n---\n请及时处理此订单 🔔`
  return md
}

/**
 * 提交零售订单并发送到企微群
 * @param {object} orderInfo
 * @returns {Promise}
 */
function submitOrder(orderInfo) {
  const content = buildOrderMarkdown(orderInfo)
  return sendMarkdown(content)
}

/** 设置机器人 key */
function setBotKey(key) {
  if (key) wx.setStorageSync(STORAGE_KEY, key)
}

/** 获取当前配置的 key */
function getBotKey() {
  return wx.getStorageSync(STORAGE_KEY) || ''
}

/** 检查是否已配置 */
function isConfigured() {
  return !!getWebhookUrl()
}

module.exports = {
  sendMarkdown,
  buildOrderMarkdown,
  submitOrder,
  setBotKey,
  getBotKey,
  isConfigured,
}
