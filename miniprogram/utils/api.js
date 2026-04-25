const request = require('./request.js')

module.exports = {
  auth: {
    miniLogin: (code) => request.post('/client/auth/mini-login', { code }),
    phoneLogin: (phone, code) => request.post('/client/auth/phone-login', { phone, code }),
    bindPhone: (phone) => request.post('/client/auth/bind-phone', { phone }),
  },
  user: {
    profile: () => request.get('/client/user/profile'),
    updateProfile: (data) => request.patch('/client/user/profile', data),
  },
  category: {
    tree: () => request.get('/client/categories/tree'),
    list: () => request.get('/client/categories'),
  },
  brand: {
    list: () => request.get('/client/brands'),
  },
  product: {
    list: (params) => request.get('/client/products', params),
    recommend: (limit = 8) => request.get('/client/products/recommend', { limit }),
    detail: (id) => request.get(`/client/products/${id}`),
  },
  address: {
    list: () => request.get('/client/addresses'),
    detail: (id) => request.get(`/client/addresses/${id}`),
    create: (data) => request.post('/client/addresses', data),
    update: (id, data) => request.put(`/client/addresses/${id}`, data),
    setDefault: (id) => request.patch(`/client/addresses/${id}/default`),
    remove: (id) => request.delete(`/client/addresses/${id}`),
  },
  order: {
    create: (data) => request.post('/client/orders', data),
    list: (params) => request.get('/client/orders', params),
    counts: () => request.get('/client/orders/status-counts'),
    detail: (id) => request.get(`/client/orders/${id}`),
    cancel: (id) => request.patch(`/client/orders/${id}/cancel`),
    confirm: (id) => request.patch(`/client/orders/${id}/confirm`),
  },
  pay: {
    order: (id) => request.post(`/client/pay/orders/${id}`),
  },
}
