// utils/request.js —— 与后端通信的统一入口
// 服务器全局前缀为 /api，零售小程序业务路径以 /client/... 开头，移动端管理员功能以 /admin/... 开头。
const BASE_URL = 'http://127.0.0.1:3001/api'

function isAdminPath(url) {
  return typeof url === 'string' && url.indexOf('/admin/') === 0
}

function goLogin(opts) {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const route = current ? `/${current.route}` : '/pages/index/index'
  const target = opts && opts.admin ? '/pages/admin/login/login' : '/pages/login/login'
  if (route !== target) {
    wx.navigateTo({ url: `${target}?redirect=${encodeURIComponent(route)}` })
  }
}

function pickToken(options) {
  if (options.noAuth) return ''
  // 显式声明走管理员通道
  if (options.auth === 'admin' || isAdminPath(options.url)) {
    return wx.getStorageSync('adminToken') || ''
  }
  if (options.auth === 'client' || options.auth === 'user') {
    return wx.getStorageSync('token') || ''
  }
  return wx.getStorageSync('token') || ''
}

function clearTokenForOptions(options) {
  const app = getApp() || {}
  const isAdmin = options.auth === 'admin' || isAdminPath(options.url)
  if (isAdmin) {
    wx.removeStorageSync('adminToken')
    wx.removeStorageSync('adminInfo')
    if (app.globalData) {
      app.globalData.adminToken = ''
      app.globalData.adminInfo = null
    }
  } else {
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    if (app.globalData) {
      app.globalData.token = ''
      app.globalData.userInfo = null
    }
  }
  return isAdmin
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = pickToken(options)
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      timeout: options.timeout || 15000,
      success(res) {
        const body = res.data
        // 401 / 403 触发跳登录
        if (res.statusCode === 401 || res.statusCode === 403) {
          const isAdmin = clearTokenForOptions(options)
          if (!options.silent) goLogin({ admin: isAdmin })
          reject(new Error((body && body.message) || '登录已过期'))
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = (body && body.message) || `HTTP ${res.statusCode}`
          if (!options.silent) wx.showToast({ title: message, icon: 'none' })
          reject(new Error(message))
          return
        }
        // 常见包裹：{ code, data, message }
        if (body && typeof body === 'object' && !Array.isArray(body) && 'code' in body) {
          if (body.code === 0 || body.code === 200) {
            resolve(body.data)
            return
          }
          const message = body.message || '请求失败'
          if (!options.silent) wx.showToast({ title: message, icon: 'none' })
          reject(new Error(message))
          return
        }
        // 其它情况：直接返回（数组 / 对象 / 字符串）
        resolve(body)
      },
      fail(err) {
        if (!options.silent) wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}

module.exports = {
  BASE_URL,
  request,
  get: (url, data, opts) => request({ url, method: 'GET', data, ...(opts || {}) }),
  post: (url, data, opts) => request({ url, method: 'POST', data, ...(opts || {}) }),
  put: (url, data, opts) => request({ url, method: 'PUT', data, ...(opts || {}) }),
  patch: (url, data, opts) => request({ url, method: 'PATCH', data, ...(opts || {}) }),
  delete: (url, data, opts) => request({ url, method: 'DELETE', data, ...(opts || {}) }),
}
