# 装修预算清单小程序 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans (or implement step-by-step below). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可在微信开发者工具打开的原生小程序：本地一份装修清单、自定义分类、横向标签首页、自动汇总、分类汇总长图分享。

**Architecture:** 纯前端小程序；`utils/storage.js` 管本地持久化，`utils/calc.js` 管汇总，三页（首页 / 编辑条目 / 分类管理）；分享用 Canvas 2D 离屏绘制后导出临时文件。

**Tech Stack:** 微信小程序原生（WXML/WXSS/JS）、`wx.setStorageSync`、Canvas 2D。

**规格依据：** `docs/superpowers/specs/2026-10-26-decoration-budget-miniprogram-design.md`

---

## 文件结构（计划创建）

```
project.config.json
sitemap.json
miniprogram/
  app.js
  app.json
  app.wxss
  pages/
    index/index.js|json|wxml|wxss
    item-edit/item-edit.js|json|wxml|wxss
    category/category.js|json|wxml|wxss
  utils/
    storage.js
    calc.js
    id.js
    canvas-share.js
```

---

### Task 1: 脚手架与全局样式

**Files:**
- Create: `project.config.json`, `sitemap.json`
- Create: `miniprogram/app.js`, `app.json`, `app.wxss`

- [x] **Step 1:** 创建 `project.config.json`（`miniprogramRoot: "miniprogram/"`, `appid` 用 `touristappid` 或占位，注明用户可换成自己的）
- [x] **Step 2:** 创建 `app.json`，注册三页，窗口标题「装修预算清单」，导航栏背景 `#1e4a8c`、标题白色
- [x] **Step 3:** `app.js` 仅 `App({})`；`app.wxss` 定义 CSS 变量（主色、浅黄待填、红/绿差额）与通用间距
- [x] **Step 4:** 用微信开发者工具打开项目根目录，确认无编译错误

---

### Task 2: 数据层 — id / storage / calc

**Files:**
- Create: `miniprogram/utils/id.js`
- Create: `miniprogram/utils/storage.js`
- Create: `miniprogram/utils/calc.js`

- [ ] **Step 1:** `id.js` — `createId()` 返回 `Date.now().toString(36) + 随机串`
- [ ] **Step 2:** `storage.js`
  - Key: `decoration_budget_v1`
  - `loadBudget()`：无数据则返回并写入空结构 `{ version:1, updatedAt, categories:[], items:[] }`
  - `saveBudget(data)`：更新 `updatedAt` 后 `setStorageSync`；失败抛错供页面 toast
  - `replaceAll` 级 API 即可（页面改完整体 save），另提供便捷：`upsertCategory` / `deleteCategory` / `upsertItem` / `deleteItem` / `reorderCategories`（内部 load-modify-save）
- [ ] **Step 3:** `calc.js`
  - `itemDiff(item)` → `number | null`
  - `sumCategory(items, categoryId)` → `{ estimated, actual, diff }`（diff 在两边小计都可算时为 actual-estimated；若两边皆无任何已填金额则 `diff: null`）
  - `sumAll(items)` → 同上结构
  - 金额累加时跳过 `null`/`undefined`；注意浮点可用「分」整数运算或 `Math.round(x*100)/100` 展示
- [ ] **Step 4:** 在开发者工具 Console 手动 `require` 测几组边界（单侧金额、空列表）

---

### Task 3: 分类管理页

**Files:**
- Create: `miniprogram/pages/category/*`

- [ ] **Step 1:** 列表展示分类名、条目数；空列表提示新建
- [ ] **Step 2:** 新建 / 改名：`wx.showModal` 或简单表单输入；校验非空、去首尾空格
- [ ] **Step 3:** 上移/下移调整 `order` 并 save（第一版用按钮，不做拖拽）
- [ ] **Step 4:** 删除：若 `items` 中仍有该 `categoryId` → `wx.showToast` 拒绝；否则确认后删除
- [ ] **Step 5:** 手动测：建 2 个分类、改名、调序、有条目时无法删

---

### Task 4: 条目编辑页

**Files:**
- Create: `miniprogram/pages/item-edit/*`

- [ ] **Step 1:** 支持 `options.id`（编辑）与 `options.categoryId`（新建默认分类）
- [ ] **Step 2:** 表单：分类 picker、名称、预估、实际（`type="digit"`）、品牌规格、备注；金额输入框浅黄底
- [ ] **Step 3:** 实时只读差额区；解析空串为 `null`；非法数字 toast
- [ ] **Step 4:** 保存校验：名称必填、必须有分类；写回 storage 后 `navigateBack`
- [ ] **Step 5:** 编辑模式显示删除，确认后删并返回
- [ ] **Step 6:** 手动测：新建、改金额、删条目

---

### Task 5: 首页（横向标签布局 B）

**Files:**
- Create: `miniprogram/pages/index/*`

- [ ] **Step 1:** `onShow` 从 storage 加载；算 `sumAll`；按 `order` 排序分类
- [ ] **Step 2:** 顶栏总览三数字；差额着色
- [ ] **Step 3:** `scroll-view` 横向标签；选中态；每标签可显示分类小计；末尾「管理」`navigateTo` category
- [ ] **Step 4:** 当前分类过滤 `items` 竖向卡片；待填金额浅黄；点进 `item-edit?id=`
- [ ] **Step 5:** 「＋」→ `item-edit?categoryId=`（无分类时引导先去分类页）
- [ ] **Step 6:** 空状态文案按规格
- [ ] **Step 7:** 手动测：切换标签、汇总正确、返回首页数据刷新

---

### Task 6: 长图分享（总览 + 分类小计）

**Files:**
- Create: `miniprogram/utils/canvas-share.js`
- Modify: `miniprogram/pages/index/*`（分享按钮与隐藏 canvas）

- [ ] **Step 1:** 首页放隐藏 `canvas type="2d"`；点击「分享」调用绘制
- [ ] **Step 2:** `canvas-share.js` 按规格绘制：标题、单位、三列汇总、日期与数量、各分类一行小计、页脚
- [ ] **Step 3:** `wx.canvasToTempFilePath` → 预览：`wx.showShareImageMenu`（若基础库支持）或 `wx.previewImage` + 引导长按；并提供「保存相册」（`wx.saveImageToPhotosAlbum` + 授权失败处理）
- [ ] **Step 4:** 真机或模拟器测保存/预览；无分类时仍可出仅总览图（合计为 0）

---

### Task 7: 收尾与 README

**Files:**
- Create: `README.md`
- Modify: 按需微调样式与 `project.config.json` 说明

- [ ] **Step 1:** README：如何用开发者工具打开、替换 AppID、功能简介、数据仅存本机的说明
- [ ] **Step 2:** 对照规格「测试要点」过一遍清单
- [ ] **Step 3:** 确认 `.gitignore` 已忽略 `.superpowers/` 等

---

## 实现顺序说明

先数据层 → 分类页 → 编辑页 → 首页 → 分享。首页依赖前三者；分享依赖首页数据与 Canvas。

## 风险与注意

- Canvas 2D 与 `showShareImageMenu` 对基础库版本有要求：在 `app.json` / 文档中注明建议基础库 ≥ 2.25（按实际 API 调整）
- 浮点金额展示统一格式化为最多 2 位小数，避免 `1.0000001`
- 不要在第一版引入云开发或 npm 重型依赖
