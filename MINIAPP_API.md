# 零售端小程序 × 管理端后台 · 数据对接文档

本文档面向**零售端微信小程序**开发者，说明如何与本仓库的 NestJS 后端（下文简称「后端」）完成数据对接。管理端（Vue Element Plus 项目）与小程序共用**同一套后端、同一份数据库**，管理端发布/下架商品、修改库存、处理订单的结果，小程序会立即看到。

> 后端版本：参见 `server/` 目录。所有 `/client/*` 路径均已在代码中落地，可直接联调。

---

## 目录

1. [对接架构](#1-对接架构)
2. [本地调试环境准备](#2-本地调试环境准备)
3. [通用约定](#3-通用约定)
4. [鉴权流程](#4-鉴权流程)
5. [小程序端 request 封装](#5-小程序端-request-封装)
6. [完整接口清单](#6-完整接口清单)
7. [小程序页面清单 + 调用顺序](#7-小程序页面清单--调用顺序)
8. [典型业务流程](#8-典型业务流程)
9. [管理端 ↔ 小程序 数据一致性说明](#9-管理端--小程序-数据一致性说明)
10. [错误码对照](#10-错误码对照)
11. [附录：环境变量](#11-附录环境变量)

---

## 1. 对接架构

```
        ┌───────────────────────────┐          ┌──────────────────────┐
        │  管理端 Web (Vite+Vue3)    │          │  零售端 微信小程序    │
        │  /admin/*                 │          │  /client/*           │
        └────────────┬──────────────┘          └──────────┬───────────┘
                     │ Bearer Token (userType=admin)      │ Bearer Token (userType=client)
                     ▼                                    ▼
                ┌────────────────────────────────────────────────────┐
                │           NestJS 后端  http://<host>:3001/api       │
                │   JwtAuthGuard + @Public() · 统一响应信封           │
                └───────────────────────┬────────────────────────────┘
                                        ▼
                                ┌───────────────┐
                                │   MySQL 8     │
                                │ Prisma ORM    │
                                └───────────────┘
```

- **一套后端两个入口**：`/admin/*` 给管理端、`/client/*` 给小程序，但读写的是同一份 MySQL 数据。
- **JWT 二值分流**：Token payload 里的 `userType` 为 `admin` 或 `client`，小程序接口会拒绝 `userType=admin` 的 Token（反之亦然）。
- **全局前缀 `api`**：所有路径前都要加 `/api`，如 `http://127.0.0.1:3001/api/client/products`。

---

## 2. 本地调试环境准备

### 2.1 启动后端

```bash
cd server
cp .env.example .env                 # 首次
pnpm install
pnpm prisma migrate deploy           # 首次或 schema 变更时
pnpm prisma generate
pnpm dev                             # 默认监听 0.0.0.0:3001
```

后端启动成功后访问 `http://<内网 IP>:3001/api/client/categories/tree`，能看到分类树 JSON 即代表 OK。

### 2.2 微信开发者工具设置

1. 在小程序项目里把 `request` 的 baseURL 指向**电脑内网 IP**（不要用 `localhost`，真机调试扫码后无法访问 localhost）：
   - macOS：`ifconfig | grep 'inet 192'`
   - Windows：`ipconfig` 看 IPv4
   - 示例：`http://192.168.1.5:3001/api`
2. 微信开发者工具右上角 → **详情 → 本地设置**：
   - **勾选**：「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
3. 后端已启用 `app.enableCors({ origin: true, credentials: true })`，开发者工具 H5 预览也能用。

### 2.3 真机调试

- 手机和开发电脑连同一个 Wi-Fi。
- 真机调试打开「开启调试」开关。
- 手机浏览器访问 `http://<内网 IP>:3001/api/client/categories/tree`，若能拿到 JSON 就证明网络通了。

### 2.4 上线前需要做的

- 使用 HTTPS 域名（微信小程序不允许 http）。
- 把域名配置到**微信公众平台 → 开发管理 → 服务器域名** 的 `request合法域名` 白名单。
- 把 `notify_url` 换成公网 HTTPS 的 `https://your-domain/api/client/pay/notify`。

---

## 3. 通用约定

### 3.1 Base URL

| 环境 | URL |
|---|---|
| 本地开发 | `http://<你的内网 IP>:3001/api` |
| 测试环境 | `https://api-test.yourdomain.com/api` |
| 生产环境 | `https://api.yourdomain.com/api` |

### 3.2 请求头

| Header | 说明 |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <token>`（登录后接口必须） |

### 3.3 响应信封

**所有接口**（除 `/client/pay/notify` 微信回调外）返回统一格式：

```json
{
  "code": 0,              // 0 成功；非 0 为错误（常见：400/401/403/404/500）
  "data": { /* 业务载荷 */ },
  "message": "ok"
}
```

小程序 request 封装应统一读 `res.data.data` 作为业务数据。

### 3.4 分页格式

列表接口统一返回：

```json
{
  "list": [ /* ... */ ],
  "total": 123,
  "page": 1,
  "pageSize": 10
}
```

请求参数统一用 `page`（从 1 开始）、`pageSize`。

### 3.5 Decimal / BigInt 序列化

后端已做转换：

- Prisma `Decimal` 字段（金额、重量）→ JSON **number**。例 `retailPrice: 99.9`。
- Prisma `BigInt` 字段（订单 `id`、`orderItem.id`）→ JSON **string**。前端参与运算前用 `Number()` 或保持字符串做展示即可。

### 3.6 时间字段

所有时间字段返回 ISO 8601 字符串，如 `"2026-04-24T08:12:33.000Z"`。小程序用 `dayjs(str).format('YYYY-MM-DD HH:mm')` 格式化。

---

## 4. 鉴权流程

### 4.1 微信登录（推荐生产使用）

```
  ┌──────────┐  wx.login  ┌──────────┐  POST /client/auth/mini-login
  │ 小程序端 │ ──────────▶│          │ ─────────────────────────▶
  │          │            │          │                            NestJS
  │          │ ◀──────────│          │ ◀─────────────────────────
  └──────────┘  token      └──────────┘  { token, user }
```

**请求**：`POST /api/client/auth/mini-login`（公开，无需 Token）

```json
{ "code": "023abc..." }
```

**响应**：

```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 1024,
      "nickname": null,
      "avatar": null,
      "phone": null,
      "role": "retail",
      "levelId": null,
      "points": 0
    }
  },
  "message": "ok"
}
```

> 别名：`POST /client/auth/wechat-login` 与上面等价，方便不同命名习惯的客户端。

**前置条件**：后端 `.env` 里配好 `WX_APPID` 与 `WX_SECRET`。未配置时后端返回 401 `微信小程序未配置`。

### 4.2 手机号 + 验证码登录（开发/兜底）

**请求**：`POST /api/client/auth/phone-login`

```json
{ "phone": "13800138000", "code": "123456" }
```

本地开发期固定验证码 `123456`（见 `client-auth.service.ts`）。生产需接入真实短信 SDK。

### 4.3 绑定手机号（已登录用户）

微信登录后，用户授权手机号再调用：

```
POST /api/client/auth/bind-phone
Authorization: Bearer <token>
{ "phone": "13800138000" }
```

### 4.4 Token 存储与使用

小程序 storage key 推荐：`token`、`userInfo`。所有 **非公开** 接口都要在 Header 带 `Authorization: Bearer ${token}`。

Token 默认有效期 7 天（`JWT_EXPIRES_IN=7d`）。

---

## 5. 小程序端 request 封装

复制到 `utils/request.js`：

```js
// utils/request.js
const BASE_URL = 'http://192.168.1.5:3001/api' // ← 改成你本机 IP

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.header || {}),
      },
      success(res) {
        // 401 → 清 token 跳登录
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          wx.reLaunch({ url: '/pages/login/index' })
          return reject(new Error('未登录或登录已过期'))
        }
        const body = res.data || {}
        if (body.code === 0) {
          resolve(body.data)
        } else {
          wx.showToast({ title: body.message || '请求失败', icon: 'none' })
          reject(new Error(body.message || '请求失败'))
        }
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  patch: (url, data) => request({ url, method: 'PATCH', data }),
  delete: (url, data) => request({ url, method: 'DELETE', data }),
}
```

---

## 6. 完整接口清单

以下全部为**已落地**接口（2026-04 commit）。Base Path = `/api`。

### 6.1 鉴权（/client/auth）

| Method | Path | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/client/auth/mini-login` | 公开 | `{ code }` → `{ token, user }` |
| POST | `/client/auth/wechat-login` | 公开 | 同上，别名 |
| POST | `/client/auth/phone-login` | 公开 | `{ phone, code }` → `{ token, user }` |
| POST | `/client/auth/bind-phone` | 需登录 | `{ phone }` → `{ ok: true }` |

### 6.2 用户资料（/client/user）

| Method | Path | 说明 |
|---|---|---|
| GET | `/client/user/profile` | 返回自己的资料含 level、points、balance |
| PATCH | `/client/user/profile` | 修改 `nickname/avatar/gender` |

PATCH Body 示例：

```json
{ "nickname": "小明", "avatar": "https://...", "gender": 1 }
```

### 6.3 商品浏览（/client/categories, /client/brands, /client/products · 公开）

| Method | Path | 说明 |
|---|---|---|
| GET | `/client/categories/tree` | 带层级的分类树 |
| GET | `/client/categories` | 平铺分类列表 |
| GET | `/client/brands` | 所有已启用品牌 |
| GET | `/client/products` | 商品列表（见下方参数） |
| GET | `/client/products/recommend?limit=8` | 首页推荐，按销量 Top N |
| GET | `/client/products/:id` | 商品详情（含 SKU、阶梯价、品牌、分类） |

**GET /client/products 查询参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| `categoryId` | number | 分类 ID |
| `brandId` | number | 品牌 ID |
| `keyword` | string | 关键字（匹配 name 或 code） |
| `sort` | enum | `sales` / `new` / `price_asc` / `price_desc`，默认 `new` |
| `page` | number | 默认 1 |
| `pageSize` | number | 默认 10 |

仅返回 **已上架 + 允许零售** 的商品（`status=1 AND retail_enabled=true`）。

### 6.4 收货地址（/client/addresses · 需登录）

| Method | Path | 说明 |
|---|---|---|
| GET | `/client/addresses` | 当前用户所有地址，默认地址置顶 |
| GET | `/client/addresses/:id` | 单条地址详情 |
| POST | `/client/addresses` | 新增（第一条会强制 `isDefault=true`） |
| PUT | `/client/addresses/:id` | 全量更新 |
| PATCH | `/client/addresses/:id/default` | 设为默认 |
| DELETE | `/client/addresses/:id` | 删除（若删的是默认，会自动挑最新一条升为默认） |

POST/PUT Body：

```json
{
  "receiver": "张三",
  "phone": "13800138000",
  "province": "广东省",
  "city": "深圳市",
  "district": "南山区",
  "detail": "科技园 xx 大厦 3 楼",
  "isDefault": false,
  "tag": "公司"
}
```

### 6.5 订单（/client/orders · 需登录）

| Method | Path | 说明 |
|---|---|---|
| POST | `/client/orders` | 下单，返回整条订单 |
| GET | `/client/orders?status=pending_pay&page=1&pageSize=10` | 我的订单 |
| GET | `/client/orders/status-counts` | 各状态订单数，用于 Tab 徽标 |
| GET | `/client/orders/:id` | 订单详情 |
| PATCH | `/client/orders/:id/cancel` | 取消（仅 `pending_pay` 有效） |
| PATCH | `/client/orders/:id/confirm` | 确认收货（仅 `shipped` 有效） |

**状态枚举**（与后端完全一致）：

| 值 | 说明 |
|---|---|
| `pending_pay` | 待付款 |
| `pending_ship` | 待发货（已付款） |
| `shipped` | 已发货 |
| `completed` | 已完成（用户或定时任务确认收货） |
| `after_sale` | 售后中（退款/换货） |
| `closed` | 已关闭/已取消 |

**POST /client/orders Body**：

```json
{
  "items": [
    { "skuId": 101, "qty": 2 },
    { "skuId": 205, "qty": 1 }
  ],
  "addressId": 33,
  "remark": "尽量顺丰"
}
```

后端会自动：
- 查 SKU → 匹配零售价 / 会员价（如果 `user.levelId` 且 SKU 有 `memberPrice`）
- 校验并占用库存（`stock.reserved += qty`）
- 生成订单号 `RT<timestamp><rand>`
- 返回 `{ id, orderNo, totalAmount, status: "pending_pay", items: [...] }`

### 6.6 微信支付（/client/pay · 需登录）

| Method | Path | 说明 |
|---|---|---|
| POST | `/client/pay/orders/:id` | 对订单发起微信 JSAPI 支付，返回 `wx.requestPayment` 参数 |
| POST | `/client/pay/notify` | 微信回调（服务器对服务器，无鉴权，**无需前端调用**） |

**POST /client/pay/orders/:id 响应示例**：

```json
{
  "code": 0,
  "data": {
    "timeStamp": "1713956123",
    "nonceStr": "a2f3...",
    "package": "prepay_id=wx24...",
    "signType": "RSA",
    "paySign": "iUjS..."
  },
  "message": "ok"
}
```

小程序直接：

```js
const pay = await request.post(`/client/pay/orders/${orderId}`)
await new Promise((resolve, reject) => {
  wx.requestPayment({
    ...pay,
    success: resolve,
    fail: reject,
  })
})
// 支付成功后短暂等 1-2 秒，再刷新订单详情（回调会把订单置为 pending_ship）
```

**前置条件**：后端 `.env` 完整配置 `WX_PAY_MCHID`、`WX_PAY_SERIAL_NO`、`WX_PAY_PRIVATE_KEY_PATH`、`WX_PAY_API_V3_KEY`、`WX_PAY_NOTIFY_URL`。任一缺失 → 接口返回 503 `微信支付未配置`。

---

## 7. 小程序页面清单 + 调用顺序

下面是一个最小可用的零售小程序页面结构，每个页面对应的接口和调用时机都列清楚。您的小程序开发同事照这张表开发，不用反复对接。

### 页面路由建议

```
pages/
├── login/          # 登录页（首次进入或 401 重定向）
├── home/           # 首页（商品推荐 + 分类入口）
├── category/       # 分类页
├── product/        # 商品详情（含加入购物车 / 立即购买）
├── cart/           # 购物车（localStorage 管理，不走后端）
├── address/        # 地址列表 / 新增 / 编辑
├── checkout/       # 下单确认页
├── pay-result/     # 支付结果页
├── orders/         # 我的订单（Tab 切换状态）
├── order-detail/   # 订单详情
└── profile/        # 个人中心
```

### 7.1 登录页（pages/login）

| 时机 | 接口 | 说明 |
|---|---|---|
| 点击「微信一键登录」 | `wx.login` → `POST /client/auth/mini-login` | 拿到 token 存 storage |
| 首次登录后要授权手机号 | `POST /client/auth/bind-phone` | 可选，用于下单默认收货人 |

### 7.2 首页（pages/home）

| 时机 | 接口 |
|---|---|
| onLoad | `GET /client/categories/tree`（左侧或顶部分类） |
| onLoad | `GET /client/products/recommend?limit=8` |
| onLoad（可选） | `GET /client/brands` |

### 7.3 分类页（pages/category）

| 时机 | 接口 |
|---|---|
| 切换分类 | `GET /client/products?categoryId=<id>&page=1&pageSize=10` |
| 切换排序 | 同上附 `&sort=sales\|new\|price_asc\|price_desc` |
| 下拉加载更多 | 同上 `page` 累加 |

### 7.4 商品详情（pages/product）

| 时机 | 接口 |
|---|---|
| onLoad | `GET /client/products/:id` |
| 点击「加入购物车」 | **无接口**，写入 `wx.setStorageSync('cart', [...])` |
| 点击「立即购买」 | 跳转 `pages/checkout?skuId=x&qty=y`，不经过购物车 |

> **购物车按本地 storage 管理**，不占用后端。结构建议：
>
> ```js
> [{ skuId, qty, productName, skuSpec, skuImage, unitPrice, selected: true }]
> ```

### 7.5 购物车（pages/cart）

| 时机 | 接口 |
|---|---|
| onShow | 无，读 storage |
| 增减数量、勾选 | 无，写 storage |
| 点击「结算」 | 跳转 `pages/checkout`，传递选中项 |

### 7.6 地址页（pages/address）

| 时机 | 接口 |
|---|---|
| 列表 onShow | `GET /client/addresses` |
| 点击新增 | `POST /client/addresses` |
| 点击编辑 | `GET /client/addresses/:id` → `PUT /client/addresses/:id` |
| 点击「设为默认」 | `PATCH /client/addresses/:id/default` |
| 左滑删除 | `DELETE /client/addresses/:id` |

### 7.7 下单确认页（pages/checkout）

| 时机 | 接口 |
|---|---|
| onLoad | `GET /client/addresses`（取默认地址） |
| onLoad | 商品项直接从上一页传入（已有 unitPrice），无需重新查询 |
| 点击「提交订单」 | `POST /client/orders` → 拿 `order.id` |
| 拿到订单后 | `POST /client/pay/orders/:id` → `wx.requestPayment` |
| 支付 success 回调 | 跳 `pages/pay-result?orderId=xxx` |

### 7.8 支付结果页（pages/pay-result）

| 时机 | 接口 |
|---|---|
| onLoad，延时 1-2 s | `GET /client/orders/:id`，显示订单最新状态 |
| 若 `status=pending_pay`（回调还没到） | 提示「支付结果确认中」，5 s 后重试一次 |
| 「继续购物」 | 回首页；「查看订单」 | 跳订单详情 |

### 7.9 我的订单（pages/orders）

| 时机 | 接口 |
|---|---|
| onShow | `GET /client/orders/status-counts`（给 Tab 加红点） |
| 切换 Tab | `GET /client/orders?status=<tab>&page=1&pageSize=10` |
| 下拉加载 | 同上 `page` 累加 |

### 7.10 订单详情（pages/order-detail）

| 时机 | 接口 |
|---|---|
| onLoad | `GET /client/orders/:id` |
| 点击「去支付」（状态=pending_pay） | `POST /client/pay/orders/:id` → 微信支付 |
| 点击「取消订单」 | `PATCH /client/orders/:id/cancel` |
| 点击「确认收货」 | `PATCH /client/orders/:id/confirm` |

### 7.11 个人中心（pages/profile）

| 时机 | 接口 |
|---|---|
| onShow | `GET /client/user/profile` |
| 点击修改资料 | `PATCH /client/user/profile` |
| 点击「我的地址」 | 跳 `pages/address` |
| 点击「我的订单」 | 跳 `pages/orders` |

---

## 8. 典型业务流程

### 8.1 浏览 → 下单 → 支付 → 收货 全链路

```
小程序                          后端                       微信支付平台
   │                             │                             │
   │ POST /client/auth/mini-login│                             │
   │────────────────────────────▶│                             │
   │◀────── token ───────────────│                             │
   │                             │                             │
   │ GET /client/products        │                             │
   │────────────────────────────▶│                             │
   │◀──── 商品列表 ───────────────│                             │
   │                             │                             │
   │ POST /client/orders         │                             │
   │────────────────────────────▶│ 1. 校验并占库存             │
   │                             │ 2. 生成订单号               │
   │◀──── order{id, orderNo} ────│                             │
   │                             │                             │
   │ POST /client/pay/orders/:id │                             │
   │────────────────────────────▶│── transactions_jsapi ──────▶│
   │                             │◀── prepay_id ───────────────│
   │◀── {paySign,package,...} ───│                             │
   │                             │                             │
   │ wx.requestPayment()         │                             │
   │────────────────────────────────────────────────────────────▶│
   │◀── 用户在微信里完成支付 ───────────────────────────────────────│
   │                             │                             │
   │                             │◀── POST /client/pay/notify ─│（微信回调）
   │                             │ 3. 验签解密                 │
   │                             │ 4. markPaid → pending_ship  │
   │                             │────── 200 SUCCESS ─────────▶│
   │                             │                             │
   │ GET /client/orders/:id      │                             │
   │────────────────────────────▶│                             │
   │◀── status=pending_ship ─────│                             │
```

### 8.2 各状态下用户可见的操作按钮

| 订单状态 | 用户可做 |
|---|---|
| `pending_pay` | 去支付 / 取消订单 |
| `pending_ship` | 催发货（无后端接口，仅本地提示） |
| `shipped` | 查看物流 / 确认收货 |
| `completed` | 申请售后 / 评价（当前版本未实现售后接口） |
| `after_sale` | 联系客服（无后端接口） |
| `closed` | 删除（前端隐藏即可） |

---

## 9. 管理端 ↔ 小程序 数据一致性说明

| 管理员操作 | 小程序即时效果 |
|---|---|
| 上架新商品 | 小程序刷新 `GET /client/products` 后立即出现 |
| 下架商品（`status=0`） | 小程序列表 / 详情立即不可见（返回 404） |
| 修改商品价格 | 小程序下次进入商品详情看到新价，已下单但未支付的订单**不受影响**（订单单价是下单时快照） |
| 修改库存 / 盘点 | 小程序下单时会看到「库存不足」提示 |
| 标记订单为已发货 | 小程序订单状态变为 `shipped`，显示物流单号 |
| 退款/关闭订单 | 小程序对应订单变为 `after_sale` / `closed` |

**金额计算规则**（与后端 `order.service.createOrder` 完全一致）：

1. 普通用户（`role=retail` 且 `levelId` 为空）：使用 `sku.retailPrice`。
2. 会员用户（`levelId` 不为空且 SKU 有 `memberPrice`）：使用 `sku.memberPrice`。
3. 分销商（批发）：走批发渠道 `/admin/order`，小程序不直接调用。
4. `subtotal = unitPrice × qty`，`totalAmount = Σ subtotal + freight`。下单后金额**冻结**在订单上。

---

## 10. 错误码对照

后端通过 HTTP 状态码 + 响应 `message` 表达错误：

| HTTP | 常见场景 | 小程序处理建议 |
|---|---|---|
| 400 | 参数非法、库存不足、订单状态不允许当前操作 | Toast 显示 `message` |
| 401 | Token 缺失或过期 | 清 storage → 跳登录页 |
| 403 | `userType` 不匹配（admin Token 调客户端接口） | 清 storage → 跳登录页 |
| 404 | 商品/订单/地址不存在 | Toast「资源不存在」 |
| 409 | 冲突（如用户已存在） | Toast 提示 |
| 500 | 服务器异常 | Toast「服务器开小差」并打点上报 |
| 503 | 服务未配置（如微信支付未配置） | 弹窗引导联系管理员 |

响应 body 统一：

```json
{ "code": 400, "data": null, "message": "库存不足" }
```

小程序 request 封装里**只要 `code !== 0` 就按错误处理**。

---

## 11. 附录：环境变量

后端 `server/.env` 完整清单（加粗为小程序对接相关）：

```ini
# 数据库
DATABASE_URL="mysql://root:xxx@127.0.0.1:3306/yangming?charset=utf8mb4"

# 服务端口
PORT=3001

# JWT
JWT_SECRET="32 位以上随机字符串"
JWT_EXPIRES_IN="7d"

# 微信小程序（必需）
WX_APPID="wx1234567890"
WX_SECRET="abc..."

# 微信支付 V3（必需，任一项缺失则 /client/pay 返回 503）
WX_PAY_MCHID="1234567890"                          # 商户号
WX_PAY_SERIAL_NO="xxxxxxxxxxxxxxxxxx"              # 商户 API 证书序列号
WX_PAY_PRIVATE_KEY_PATH="./certs/apiclient_key.pem" # 商户私钥 pem
WX_PAY_API_V3_KEY="32 位 APIv3 密钥"
WX_PAY_NOTIFY_URL="https://your-domain.com/api/client/pay/notify"
```

获取路径：

- AppID/Secret：微信公众平台 → 小程序 → 开发 → 开发管理
- 商户号、APIv3 密钥、API 证书：[微信商户平台](https://pay.weixin.qq.com/)
- apiclient_key.pem：商户平台下载 API 证书包后解压得到

---

## 变更记录

- **2026-04-24** 初版，覆盖登录 / 用户 / 商品 / 地址 / 订单 / 微信支付 全部核心路径，所有 `/client/*` 接口均已在后端落地。
