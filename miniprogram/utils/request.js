const BASE_URL = 'http://192.168.1.5:3001/api'

function goLogin() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const route = current ? `/${current.route}` : '/pages/index/index'
  if (route !== '/pages/login/login') {
    wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(route)}` })
  }
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success(res) {
        const body = res.data || {}
        if (res.statusCode === 401 || res.statusCode === 403) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          const app = getApp()
          if (app && app.globalData) {
            app.globalData.token = ''
            app.globalData.userInfo = null
          }
          goLogin()
          reject(new Error(body.message || '登录已过期'))
          return
        }
        if (body.code === 0) {
          resolve(body.data)
          return
        }
        const message = body.message || (res.statusCode >= 500 ? '服务器开小差' : '请求失败')
        wx.showToast({ title: message, icon: 'none' })
        reject(new Error(message))
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}

module.exports = {
  BASE_URL,
  request,
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  patch: (url, data) => request({ url, method: 'PATCH', data }),
  delete: (url, data) => request({ url, method: 'DELETE', data }),
}
