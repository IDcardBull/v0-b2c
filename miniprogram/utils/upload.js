// utils/upload.js
// 统一图片上传工具：对接后端 http://124.221.2.61:3001/api/upload
// 字段名固定为 file，返回 { url } 或 { data: { url } }

const UPLOAD_URL = 'http://127.0.0.1:3001/api/upload'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * 上传单张图片
 * @param {string} filePath  本地临时路径 tempFilePath
 * @param {object} [opts]    可选：{ showLoading: boolean, header: object }
 * @returns {Promise<string>} resolve 后端返回的线上图片 URL
 */
function uploadImage(filePath, opts) {
  const options = opts || {}
  return new Promise(function (resolve, reject) {
    if (!filePath) {
      reject(new Error('未选择图片'))
      return
    }
    if (options.showLoading !== false) {
      wx.showLoading({ title: '上传中…', mask: true })
    }
    wx.uploadFile({
      url: UPLOAD_URL,
      filePath: filePath,
      name: 'file',
      header: options.header || {},
      success: function (res) {
        try {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error('服务异常 ' + res.statusCode))
            return
          }
          var data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          var url = (data && data.url) || (data && data.data && data.data.url)
          if (!url) {
            reject(new Error('上传接口未返回图片地址'))
            return
          }
          resolve(url)
        } catch (e) {
          reject(e)
        }
      },
      fail: function (err) {
        reject(err)
      },
      complete: function () {
        if (options.showLoading !== false) {
          wx.hideLoading()
        }
      },
    })
  })
}

/**
 * 选择并上传图片
 * @param {object} [opts]
 *   count        最多张数，默认 1
 *   sourceType   ['album','camera']
 *   sizeKBLimit  单张大小上限，默认 5MB
 * @returns {Promise<string[]>} 已上传图片的线上 URL 数组
 */
function chooseAndUpload(opts) {
  const options = opts || {}
  const count = options.count || 1
  const sourceType = options.sourceType || ['album', 'camera']
  const sizeLimit = options.sizeKBLimit ? options.sizeKBLimit * 1024 : MAX_SIZE

  return new Promise(function (resolve, reject) {
    // 优先 wx.chooseMedia，旧基础库回退到 wx.chooseImage
    function handleFiles(files) {
      // files: [{ tempFilePath, size }]
      var oversize = files.find(function (f) {
        return f.size && f.size > sizeLimit
      })
      if (oversize) {
        wx.showToast({
          title: '图片不能超过' + Math.round(sizeLimit / 1024 / 1024) + 'MB',
          icon: 'none',
        })
        reject(new Error('OVER_SIZE'))
        return
      }
      // 顺序上传，避免并发把弱网拖死
      var urls = []
      var idx = 0
      wx.showLoading({ title: '上传中…', mask: true })
      function next() {
        if (idx >= files.length) {
          wx.hideLoading()
          resolve(urls)
          return
        }
        uploadImage(files[idx].tempFilePath, { showLoading: false })
          .then(function (url) {
            urls.push(url)
            idx++
            next()
          })
          .catch(function (err) {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
            reject(err)
          })
      }
      next()
    }

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: count,
        mediaType: ['image'],
        sourceType: sourceType,
        sizeType: ['compressed'],
        success: function (res) {
          var files = (res.tempFiles || []).map(function (f) {
            return { tempFilePath: f.tempFilePath, size: f.size }
          })
          handleFiles(files)
        },
        fail: function (err) {
          // 用户取消不算错
          if (err && /cancel/i.test(err.errMsg || '')) {
            reject(new Error('CANCELLED'))
          } else {
            reject(err)
          }
        },
      })
    } else {
      wx.chooseImage({
        count: count,
        sizeType: ['compressed'],
        sourceType: sourceType,
        success: function (res) {
          // chooseImage 不返回 size，无法精确校验
          var files = (res.tempFilePaths || []).map(function (p) {
            return { tempFilePath: p, size: 0 }
          })
          handleFiles(files)
        },
        fail: function (err) {
          if (err && /cancel/i.test(err.errMsg || '')) {
            reject(new Error('CANCELLED'))
          } else {
            reject(err)
          }
        },
      })
    }
  })
}

module.exports = {
  UPLOAD_URL: UPLOAD_URL,
  MAX_SIZE: MAX_SIZE,
  uploadImage: uploadImage,
  chooseAndUpload: chooseAndUpload,
}
