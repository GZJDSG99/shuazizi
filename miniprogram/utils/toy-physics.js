/**
 * 轻量 2D 方块物理：固定子步 + 软碰撞 + 加速度平滑。
 * 坐标单位：px；渲染建议用 translate3d。
 */

const FIXED_DT = 1 / 60
const MAX_SUBSTEPS = 4
const MAX_SPEED = 1400
const SLEEP_SPEED = 12

function createWorld(width, height, size) {
  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
    size: size || 56,
    bodies: [],
    gravityX: 0,
    gravityY: 620,
    targetGX: 0,
    targetGY: 620,
    damping: 0.994,
    bounce: 0.28,
    friction: 0.88,
    accelSmooth: 0.18
  }
}

/**
 * 抽屉式疏密堆叠：上方留白，物品落在中下部；工具先就位。
 * items 仅放工具时最舒适；彩蛋用 dropEggs 延后落入。
 */
function seedBodies(world, items) {
  const defaultSize = world.size
  const list = (items || []).slice()
  const n = list.length
  const bodies = []
  if (!n) {
    world.bodies = bodies
    return world
  }

  const maxSize = list.reduce((m, it) => Math.max(m, it.size || defaultSize), defaultSize)
  const marginX = Math.max(12, maxSize * 0.2)
  const marginBottom = Math.max(10, maxSize * 0.12)
  // 顶部约 32% 留白，堆在中下部
  const pileTop = world.height * 0.32
  const innerW = Math.max(maxSize, world.width - marginX * 2)
  const innerH = Math.max(maxSize, world.height - pileTop - marginBottom)

  let cols = Math.ceil(Math.sqrt(n * (innerW / Math.max(innerH, 1)) * 1.15))
  cols = Math.max(2, Math.min(n, cols))
  let rows = Math.ceil(n / cols)
  while (cols * rows < n) rows += 1

  const cellW = innerW / cols
  const cellH = innerH / rows
  const slots = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (slots.length >= n) break
      // 行偏下：越靠后的行越沉
      const biasY = (r / Math.max(rows - 1, 1)) * cellH * 0.15
      slots.push({
        x: marginX + c * cellW + cellW / 2,
        y: pileTop + r * cellH + cellH / 2 + biasY
      })
    }
  }
  shuffleInPlace(slots)

  list.forEach((item, i) => {
    const size = item.size || defaultSize
    const slot = slots[i] || slots[slots.length - 1]
    const jitterX = (Math.random() - 0.5) * Math.min(18, cellW * 0.28)
    const jitterY = (Math.random() - 0.5) * Math.min(14, cellH * 0.22)
    bodies.push({
      id: item.id,
      kind: item.kind || 'tool',
      x: slot.x - size / 2 + jitterX,
      y: slot.y - size / 2 + jitterY,
      w: size,
      h: size,
      vx: (Math.random() - 0.5) * 12,
      vy: 20 + Math.random() * 30,
      rot: (Math.random() - 0.5) * 10,
      vr: (Math.random() - 0.5) * 12,
      sleeping: false
    })
  })

  bodies.forEach((b) => {
    b.x = clamp(b.x, 0, world.width - b.w)
    b.y = clamp(b.y, 0, world.height - b.h)
  })
  world.bodies = bodies
  return world
}

/** 彩蛋从上方依次落入，制造一点惊喜 */
function dropEgg(world, item) {
  if (!world || !item) return null
  // 避免重复掉入同一 id
  if (world.bodies.some((b) => b.id === item.id)) return null
  const size = item.size || world.size * 0.72
  const body = {
    id: item.id,
    kind: 'egg',
    x: clamp(
      marginRandom(world.width, size),
      0,
      world.width - size
    ),
    y: -size * (0.2 + Math.random() * 0.5),
    w: size,
    h: size,
    vx: (Math.random() - 0.5) * 80,
    vy: 220 + Math.random() * 120,
    rot: (Math.random() - 0.5) * 24,
    vr: (Math.random() - 0.5) * 50,
    sleeping: false
  }
  world.bodies.push(body)
  return body
}

/**
 * 炸弹爆炸：把周围物体炸飞，并移除炸弹自身。
 * @returns {{ x:number, y:number }|null} 爆炸中心（屏幕坐标用 body 左上需自行换算）
 */
function explodeBomb(world, bombId, options) {
  if (!world || !bombId) return null
  const opts = options || {}
  const radius = opts.radius || Math.min(world.width, world.height) * 0.55
  const force = opts.force || 980
  const idx = world.bodies.findIndex((b) => b.id === bombId)
  if (idx < 0) return null
  const bomb = world.bodies[idx]
  const cx = bomb.x + bomb.w / 2
  const cy = bomb.y + bomb.h / 2

  for (let i = 0; i < world.bodies.length; i++) {
    const b = world.bodies[i]
    if (b.id === bombId) continue
    const bx = b.x + b.w / 2
    const by = b.y + b.h / 2
    let dx = bx - cx
    let dy = by - cy
    let dist = Math.hypot(dx, dy)
    if (dist >= radius) continue
    if (dist < 0.001) {
      dx = (Math.random() - 0.5) || 0.01
      dy = -1
      dist = Math.hypot(dx, dy)
    }
    const falloff = 1 - dist / radius
    const power = force * (0.35 + falloff * 0.9)
    const nx = dx / dist
    const ny = dy / dist
    b.sleeping = false
    b.vx += nx * power
    b.vy += ny * power - power * 0.25
    b.vr += (Math.random() - 0.5) * 160 * falloff
  }

  world.bodies.splice(idx, 1)
  return { x: cx, y: cy }
}

function marginRandom(width, size) {
  const pad = Math.max(8, size * 0.15)
  return pad + Math.random() * Math.max(1, width - size - pad * 2)
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function syncBodies(world, items) {
  const map = {}
  world.bodies.forEach((b) => {
    map[b.id] = b
  })
  const next = []
  const size = world.size
  items.forEach((item, i) => {
    if (map[item.id]) {
      next.push(map[item.id])
      return
    }
    next.push({
      id: item.id,
      x: 8 + (i % 3) * (size + 10),
      y: 8 + Math.floor(i / 3) * (size + 10),
      w: size,
      h: size,
      vx: 0,
      vy: 0,
      rot: 0,
      vr: 0,
      sleeping: false
    })
  })
  world.bodies = next
  return world
}

function setAccel(world, ax, ay) {
  const strength = 1480
  const targetGX = clamp((ax || 0) * strength, -2000, 2000)
  const targetGY = clamp((-ay || 0) * strength + 480, -2000, 2200)
  world.targetGX = targetGX
  world.targetGY = targetGY
}

function step(world, dt) {
  const frame = Math.min(0.05, Math.max(0, dt || FIXED_DT))
  let steps = Math.ceil(frame / FIXED_DT)
  if (steps > MAX_SUBSTEPS) steps = MAX_SUBSTEPS
  const t = frame / steps

  // 平滑重力，避免传感器噪声导致抖动
  const k = world.accelSmooth
  world.gravityX += (world.targetGX - world.gravityX) * k
  world.gravityY += (world.targetGY - world.gravityY) * k

  for (let s = 0; s < steps; s++) {
    integrate(world, t)
    // 多轮轻量求解，减少穿透弹跳
    for (let pass = 0; pass < 2; pass++) {
      collideWalls(world)
      collideBodies(world)
    }
    sleepCheck(world)
  }
}

function integrate(world, t) {
  const bodies = world.bodies
  const damp = Math.pow(world.damping, t * 60)

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    if (b.sleeping) {
      // 重力变化时唤醒
      if (Math.abs(world.gravityX) > 180 || Math.abs(world.gravityY - 480) > 180) {
        b.sleeping = false
      } else {
        continue
      }
    }

    b.vx += world.gravityX * t
    b.vy += world.gravityY * t
    b.vx *= damp
    b.vy *= damp
    b.vr *= Math.pow(0.985, t * 60)

    const speed = Math.hypot(b.vx, b.vy)
    if (speed > MAX_SPEED) {
      const s = MAX_SPEED / speed
      b.vx *= s
      b.vy *= s
    }

    b.x += b.vx * t
    b.y += b.vy * t
    b.rot += b.vr * t
    if (b.rot > 180) b.rot -= 360
    if (b.rot < -180) b.rot += 360
  }
}

function collideWalls(world) {
  const { width, height, bounce, friction } = world
  const bodies = world.bodies

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    if (b.sleeping) continue

    if (b.x < 0) {
      b.x = 0
      if (b.vx < 0) b.vx = -b.vx * bounce
      b.vr *= 0.85
    } else if (b.x + b.w > width) {
      b.x = width - b.w
      if (b.vx > 0) b.vx = -b.vx * bounce
      b.vr *= 0.85
    }

    if (b.y < 0) {
      b.y = 0
      if (b.vy < 0) b.vy = -b.vy * bounce
    } else if (b.y + b.h > height) {
      b.y = height - b.h
      if (b.vy > 0) b.vy = -b.vy * bounce
      b.vx *= friction
      b.vr *= 0.72
    }
  }
}

function collideBodies(world) {
  const bodies = world.bodies
  const bounce = world.bounce
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      resolvePair(bodies[i], bodies[j], bounce)
    }
  }
}

function resolvePair(a, b, bounce) {
  // 彩蛋按圆形碰撞，避免矩形感
  if (a.kind === 'egg' || b.kind === 'egg') {
    resolveCirclePair(a, b, bounce)
    return
  }

  const dx = a.x + a.w / 2 - (b.x + b.w / 2)
  const dy = a.y + a.h / 2 - (b.y + b.h / 2)
  const overlapX = (a.w + b.w) / 2 - Math.abs(dx)
  const overlapY = (a.h + b.h) / 2 - Math.abs(dy)
  if (overlapX <= 0 || overlapY <= 0) return

  a.sleeping = false
  b.sleeping = false

  if (overlapX < overlapY) {
    const dir = dx < 0 ? -1 : 1
    const push = overlapX * 0.5 * dir
    a.x += push
    b.x -= push
    const avx = a.vx
    const bvx = b.vx
    a.vx = avx * (1 - bounce) * 0.35 + bvx * bounce
    b.vx = bvx * (1 - bounce) * 0.35 + avx * bounce
    if (dir > 0) {
      if (a.vx < 0) a.vx *= -0.2
      if (b.vx > 0) b.vx *= -0.2
    } else {
      if (a.vx > 0) a.vx *= -0.2
      if (b.vx < 0) b.vx *= -0.2
    }
    a.vr += (a.vy - b.vy) * 0.006
    b.vr -= (a.vy - b.vy) * 0.006
  } else {
    const dir = dy < 0 ? -1 : 1
    const push = overlapY * 0.5 * dir
    a.y += push
    b.y -= push
    const avy = a.vy
    const bvy = b.vy
    a.vy = avy * (1 - bounce) * 0.35 + bvy * bounce
    b.vy = bvy * (1 - bounce) * 0.35 + avy * bounce
    if (dir > 0) {
      if (a.vy < 0) a.vy *= -0.2
      if (b.vy > 0) b.vy *= -0.2
    } else {
      if (a.vy > 0) a.vy *= -0.2
      if (b.vy < 0) b.vy *= -0.2
    }
    a.vr += (b.vx - a.vx) * 0.006
    b.vr -= (b.vx - a.vx) * 0.006
  }
}

function bodyRadius(b) {
  return Math.min(b.w, b.h) * 0.5
}

function resolveCirclePair(a, b, bounce) {
  const ax = a.x + a.w / 2
  const ay = a.y + a.h / 2
  const bx = b.x + b.w / 2
  const by = b.y + b.h / 2
  const ra = bodyRadius(a)
  const rb = bodyRadius(b)
  let dx = ax - bx
  let dy = ay - by
  let dist = Math.hypot(dx, dy)
  const minDist = ra + rb
  if (dist >= minDist) return

  a.sleeping = false
  b.sleeping = false

  if (dist < 0.0001) {
    dx = 1
    dy = 0
    dist = 1
  }
  const nx = dx / dist
  const ny = dy / dist
  const overlap = minDist - dist
  a.x += nx * overlap * 0.5
  a.y += ny * overlap * 0.5
  b.x -= nx * overlap * 0.5
  b.y -= ny * overlap * 0.5

  const rvx = a.vx - b.vx
  const rvy = a.vy - b.vy
  const vn = rvx * nx + rvy * ny
  if (vn > 0) return
  const j = -(1 + bounce) * vn * 0.5
  a.vx += j * nx
  a.vy += j * ny
  b.vx -= j * nx
  b.vy -= j * ny
  a.vr += (nx * rvy - ny * rvx) * 0.01
  b.vr -= (nx * rvy - ny * rvx) * 0.01
}

function sleepCheck(world) {
  const bodies = world.bodies
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    const speed = Math.hypot(b.vx, b.vy)
    if (speed < SLEEP_SPEED && Math.abs(b.vr) < 8) {
      // 贴地或贴边时更容易睡眠
      const onFloor = b.y + b.h >= world.height - 1.5
      if (onFloor || speed < SLEEP_SPEED * 0.45) {
        b.vx *= 0.6
        b.vy *= 0.6
        b.vr *= 0.6
        if (speed < SLEEP_SPEED * 0.35 && Math.abs(b.vr) < 3) {
          b.vx = 0
          b.vy = 0
          b.vr = 0
          b.sleeping = true
        }
      }
    }
  }
}

function snapshot(world) {
  return world.bodies.map((b) => {
    const x = Math.round(b.x * 100) / 100
    const y = Math.round(b.y * 100) / 100
    const rot = Math.round(b.rot * 100) / 100
    const isEgg = b.kind === 'egg'
    const radius = isEgg ? 'border-radius:50%;overflow:hidden;' : ''
    return {
      id: b.id,
      kind: b.kind || 'tool',
      x,
      y,
      rot,
      style: `width:${b.w}px;height:${b.h}px;${radius}transform:translate3d(${x}px,${y}px,0) rotate(${rot}deg);`
    }
  })
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

module.exports = {
  createWorld,
  seedBodies,
  dropEgg,
  explodeBomb,
  syncBodies,
  setAccel,
  step,
  snapshot
}
