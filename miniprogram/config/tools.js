const anniversary = require('../utils/anniversary')
const { applyOrder } = require('../utils/tools-order')

/**
 * 工具注册表：首页只读本配置渲染。
 * 新工具：建分包 → app.json subpackages → 在此追加一项。
 */
const TOOLS = [
  {
    id: 'qizhi',
    name: '掐指一算',
    desc: '多份清单 · 预估与实际',
    mark: '算',
    icon: '/images/tool-qizhi.png',
    path: '/packageQizhi/pages/lists/lists',
    enabled: true
  },
  {
    id: 'yebadi',
    name: '耶巴蒂，莱维贝贝~',
    desc: '组数记录 · 组间倒计时',
    mark: '耶',
    icon: '/images/tool-yebadi.png',
    path: '/packageYebadi/pages/train/train',
    enabled: true
  },
  {
    id: 'dice',
    name: '掷骰子',
    desc: '1～3 颗骰子随机决策',
    mark: '骰',
    icon: '/images/tool-dice.png',
    path: '/packageDice/pages/roll/roll',
    enabled: true
  },
  {
    id: 'anniversary',
    name: '纪念日',
    desc: '',
    mark: '心',
    icon: '/images/tool-anniversary.png',
    path: '/packageAnniversary/pages/index/index',
    enabled: true,
    dynamicDesc: 'anniversary'
  },
  {
    id: 'light',
    name: '补光灯',
    desc: '屏幕光源 · 冷白/正白/暖黄',
    mark: '光',
    icon: '/images/tool-light.png',
    path: '/packageLight/pages/light/light',
    enabled: true
  },
  {
    id: 'doodle',
    name: '涂鸦画板',
    desc: '随手涂鸦 · 导出图片分享',
    mark: '画',
    icon: '/images/tool-doodle.png',
    path: '/packageDoodle/pages/board/board',
    enabled: true
  },
  {
    id: 'record',
    name: '随手录音',
    desc: '随时录 · 本地播放管理',
    mark: '录',
    icon: '/images/tool-record.png',
    path: '/packageRecord/pages/index/index',
    enabled: true
  },
  {
    id: 'caicai',
    name: '来财',
    desc: '今日招财签 · 可分享',
    mark: '财',
    icon: '/images/tool-caicai.png',
    path: '/packageCaicai/pages/index/index',
    enabled: true
  }
]

function getTools() {
  const tools = TOOLS.filter((t) => t.enabled && t.path).map((t) => {
    if (t.dynamicDesc === 'anniversary') {
      return { ...t, desc: anniversary.homeDesc() }
    }
    return { ...t }
  })
  return applyOrder(tools)
}

module.exports = {
  TOOLS,
  getTools
}
