# 耶巴蒂，莱维贝贝~ — 实现计划

**Goal:** 极简组数 + 组间倒计时工具，分包上线并挂到首页。

**规格：** `docs/superpowers/specs/2026-10-28-yebadi-sets-timer-design.md`

---

### Task 1: 存储与注册

- [x] `packageYebadi/utils/storage.js` — key `tool_yebadi_v1`
- [x] `config/tools.js` 增加工具项
- [x] `app.json` subpackages + 可选 preload

### Task 2: 训练页

- [x] `packageYebadi/pages/train/*` — 沉浸导航、动作名、组数、休息 UI、倒计时逻辑、震动

### Task 3: 验收

- [ ] 完成本组 / 跳过 / 记忆 / 重置 / 回首页再进组数仍在（需真机/开发者工具）
