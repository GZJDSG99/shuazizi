/**
 * 箱子模式彩蛋（仅物理箱出现，不进列表）
 */
const EGGS = [
  {
    id: 'egg-watermelon',
    name: '西瓜',
    desc: '夏日限定彩蛋，脆一口。',
    icon: '/images/eggs/egg-watermelon.png',
    toast: '咔嚓——西瓜彩蛋！'
  },
  {
    id: 'egg-kiwi',
    name: '猕猴桃',
    desc: '酸酸甜甜的小彩蛋。',
    icon: '/images/eggs/egg-kiwi.png',
    toast: '猕猴桃说：维 C 已就位'
  },
  {
    id: 'egg-grapes',
    name: '葡萄',
    desc: '一串好运掉进箱子里。',
    icon: '/images/eggs/egg-grapes.png',
    toast: '葡萄：一颗接一颗～'
  },
  {
    id: 'egg-dragonfruit',
    name: '火龙果',
    desc: '粉绿撞色，超显眼。',
    icon: '/images/eggs/egg-dragonfruit.png',
    toast: '火龙果闪现成功'
  },
  {
    id: 'egg-orange',
    name: '橙子',
    desc: '维生素小炸弹。',
    icon: '/images/eggs/egg-orange.png',
    toast: '橙子：今天也要元气满满'
  },
  {
    id: 'egg-pineapple',
    name: '菠萝',
    desc: '凤梨也行，别较真。',
    icon: '/images/eggs/egg-pineapple.png',
    toast: '波罗波罗……菠萝彩蛋！'
  },
  {
    id: 'egg-banana',
    name: '香蕉',
    desc: '滑不溜秋的小彩蛋。',
    icon: '/images/eggs/egg-banana.png',
    toast: '香蕉：钾到你了'
  },
  {
    id: 'egg-cola',
    name: '可乐',
    desc: '冰爽一下。',
    icon: '/images/eggs/egg-cola.png',
    toast: '咕咚——可乐彩蛋！'
  },
  {
    id: 'egg-pepper',
    name: '青椒',
    desc: '蔬菜也要有姓名。',
    icon: '/images/eggs/egg-pepper.png',
    toast: '青椒：我不是配角'
  },
  {
    id: 'egg-apple',
    name: '苹果',
    desc: '一天一苹果。',
    icon: '/images/eggs/egg-apple.png',
    toast: '苹果：咔嘣脆'
  },
  {
    id: 'egg-durian',
    name: '榴莲',
    desc: '刺刺的，味道很特别。',
    icon: '/images/eggs/egg-durian.png',
    toast: '榴莲：爱恨分明',
    meme: '/images/eggs/egg-durian-meme.png'
  },
  {
    id: 'egg-bomb',
    name: '炸弹',
    desc: '点一下，四周飞起。',
    icon: '/images/eggs/egg-bomb.png',
    toast: '轰！',
    bomb: true
  }
]

function getEggs() {
  return EGGS.slice()
}

module.exports = {
  EGGS,
  getEggs
}
