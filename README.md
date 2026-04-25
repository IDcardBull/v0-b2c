# 釉见陶瓷 · 微信小程序

东方极简陶瓷美学 B2C 零售小程序源码。淡青、米色、炭灰三色体系，宋体衬线 + 苹方副标，强调留白与器质感。

## 目录结构

\`\`\`
miniprogram/
├── app.js / app.json / app.wxss     # 全局入口与设计体系
├── project.config.json              # 微信开发者工具配置
├── sitemap.json                     # 搜索可见性
├── custom-tab-bar/                  # 自定义底部 Tab（极简文字 + 圆点）
├── images/                          # 静态资源
├── pages/
│   ├── index/        # 首页（画报 + 分类圆环 + 双列宫格）
│   ├── category/     # 分类页（左竖排 + 右商品卡）
│   ├── cart/         # 购物袋
│   ├── profile/      # 我（含头像上传）
│   ├── detail/       # 商品详情
│   ├── review/       # 评价晒图（多图上传，最多 9 张）
│   └── feedback/     # 售后 / 客户服务（最多 6 张凭证图）
└── utils/
    ├── api.js        # 接口层（商品 / 详情 / 轮播 / 分类）
    ├── upload.js     # 统一图片上传（POST /api/upload）
    └── data.js       # 离线兜底数据
\`\`\`

## 接入与运行

1. 打开「微信开发者工具」→ **导入项目** → 选择本仓库的 `miniprogram/` 目录
2. AppID 可填写您自己的小程序 AppID，或选择「测试号」
3. 在微信公众平台 → 开发管理 → 服务器域名，将后端域名同时加入：
   - `request 合法域名`
   - `uploadFile 合法域名`
   - `downloadFile 合法域名`（用于商品图等）
4. 后端接口地址在 `miniprogram/utils/api.js` 与 `miniprogram/utils/upload.js` 顶部 `BASE` 常量中维护

## 接口规范

详见 [`MINIAPP_API.md`](./MINIAPP_API.md)。
