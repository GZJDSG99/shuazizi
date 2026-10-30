const { getNavBarLayout } = require('../../../utils/navbar')
const {
  listRecords,
  addRecord,
  updateRecord,
  removeRecord,
  persistTempFile,
  formatDuration,
  formatTime
} = require('../../../utils/records')

const MAX_MS = 10 * 60 * 1000

function decorate(list) {
  return (list || []).map((item) => ({
    ...item,
    durationLabel: formatDuration(item.durationMs),
    timeLabel: formatTime(item.createdAt)
  }))
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    recording: false,
    playing: false,
    spinning: false,
    discActive: false,
    statusText: 'READY',
    cardTitle: '随手录音',
    cardSub: '最长 10 分钟 · 本地保存',
    currentLabel: '0:00',
    totalLabel: '0:00',
    progressPct: 0,
    records: [],
    currentId: '',
    playingId: '',
    canPrev: false,
    canNext: false
  },

  _recorder: null,
  _audio: null,
  _tick: null,
  _startedAt: 0,
  _stopping: false,

  onLoad() {
    const app = getApp()
    const nav = (app && app.globalData && app.globalData.nav) || getNavBarLayout()
    if (app && app.globalData) app.globalData.nav = nav
    const records = decorate(listRecords())
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      navTotalHeight: nav.totalHeight,
      records
    })
    this.setupRecorder()
    this.refreshCard()
  },

  onShow() {
    this.setData({ records: decorate(listRecords()) })
    this.refreshCard()
  },

  onHide() {
    this.pausePlayback()
  },

  onUnload() {
    this.clearTick()
    this.pausePlayback()
    if (this.data.recording) {
      try {
        this._recorder && this._recorder.stop()
      } catch (e) {
        /* ignore */
      }
    }
    if (this._audio) {
      try {
        this._audio.destroy()
      } catch (e) {
        /* ignore */
      }
      this._audio = null
    }
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: '/pages/home/home' })
    })
  },

  getCurrentIndex() {
    const id = this.data.currentId
    if (!id) return -1
    return (this.data.records || []).findIndex((r) => r.id === id)
  },

  refreshCard(overrides) {
    const recording = overrides && 'recording' in overrides ? overrides.recording : this.data.recording
    const playing = overrides && 'playing' in overrides ? overrides.playing : this.data.playing
    const currentId = overrides && 'currentId' in overrides ? overrides.currentId : this.data.currentId
    const records = overrides && 'records' in overrides ? overrides.records : this.data.records
    const recordLabel = overrides && 'recordLabel' in overrides ? overrides.recordLabel : this.data.currentLabel

    const current = (records || []).find((r) => r.id === currentId)
    const idx = current ? records.findIndex((r) => r.id === currentId) : -1

    let patch = {
      canPrev: idx > 0,
      canNext: idx >= 0 && idx < records.length - 1
    }

    if (recording) {
      patch = {
        ...patch,
        statusText: 'RECORDING',
        cardTitle: '正在录音',
        cardSub: '再次点击结束并保存',
        discActive: true,
        spinning: true,
        totalLabel: '10:00',
        currentLabel: recordLabel || '0:00'
      }
    } else if (current) {
      patch = {
        ...patch,
        statusText: playing ? 'NOW SPINNING' : 'PAUSED',
        cardTitle: current.name,
        cardSub: `${current.durationLabel} · ${current.timeLabel}`,
        discActive: true,
        spinning: !!playing,
        totalLabel: current.durationLabel
      }
    } else {
      patch = {
        ...patch,
        statusText: 'READY',
        cardTitle: '随手录音',
        cardSub: '最长 10 分钟 · 本地保存',
        discActive: false,
        spinning: false,
        currentLabel: '0:00',
        totalLabel: '0:00',
        progressPct: 0,
        playing: false,
        playingId: ''
      }
    }

    if (overrides) Object.assign(patch, overrides)
    this.setData(patch)
  },

  setupRecorder() {
    const recorder = wx.getRecorderManager()
    this._recorder = recorder

    recorder.onStart(() => {
      this._startedAt = Date.now()
      this._stopping = false
      this.clearTick()
      this.setData({
        recording: true,
        playing: false,
        playingId: '',
        progressPct: 0,
        currentLabel: '0:00'
      })
      this.refreshCard({ recording: true, recordLabel: '0:00' })
      this._tick = setInterval(() => {
        const elapsed = Date.now() - this._startedAt
        const label = formatDuration(elapsed)
        const pct = Math.min(100, (elapsed / MAX_MS) * 100)
        this.setData({ currentLabel: label, progressPct: pct })
        if (elapsed >= MAX_MS && !this._stopping) {
          this._stopping = true
          recorder.stop()
        }
      }, 200)
    })

    recorder.onStop((res) => {
      this.clearTick()
      this.setData({ recording: false })
      const tempFilePath = res && res.tempFilePath
      if (!tempFilePath) {
        this.refreshCard({ recording: false })
        wx.showToast({ title: '未保存到录音', icon: 'none' })
        return
      }
      const durationMs = Math.max(
        Number(res.duration) || 0,
        this._startedAt ? Date.now() - this._startedAt : 0
      )
      if (durationMs < 500) {
        this.refreshCard({ recording: false })
        wx.showToast({ title: '录音太短', icon: 'none' })
        return
      }
      try {
        const id = `r_${Date.now()}`
        const path = persistTempFile(tempFilePath, id)
        const createdAt = Date.now()
        const name = `录音 ${formatTime(createdAt)}`
        const records = decorate(
          addRecord({
            id,
            name,
            path,
            durationMs,
            createdAt
          })
        )
        this.setData({
          records,
          currentId: id,
          progressPct: 0,
          currentLabel: '0:00',
          playing: false,
          playingId: ''
        })
        this.refreshCard({ records, currentId: id, recording: false, playing: false })
        wx.showToast({ title: '已保存', icon: 'success' })
      } catch (e) {
        this.refreshCard({ recording: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })

    recorder.onError(() => {
      this.clearTick()
      this.setData({ recording: false })
      this.refreshCard({ recording: false })
      wx.showToast({ title: '录音失败', icon: 'none' })
    })
  },

  clearTick() {
    if (this._tick) {
      clearInterval(this._tick)
      this._tick = null
    }
  },

  ensureMicAuth() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (setting) => {
          if (setting.authSetting && setting.authSetting['scope.record']) {
            resolve(true)
            return
          }
          wx.authorize({
            scope: 'scope.record',
            success: () => resolve(true),
            fail: () => {
              wx.showModal({
                title: '需要麦克风权限',
                content: '请在设置中允许使用麦克风，才能录音',
                confirmText: '去设置',
                success: (res) => {
                  if (res.confirm) wx.openSetting({})
                }
              })
              resolve(false)
            }
          })
        },
        fail: () => resolve(false)
      })
    })
  },

  async startRecord() {
    const ok = await this.ensureMicAuth()
    if (!ok) return
    this.pausePlayback()
    try {
      this._recorder.start({
        duration: MAX_MS,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'mp3'
      })
    } catch (e) {
      wx.showToast({ title: '无法开始录音', icon: 'none' })
    }
  },

  stopRecord() {
    this._stopping = true
    try {
      this._recorder.stop()
    } catch (e) {
      this.setData({ recording: false })
      this.refreshCard({ recording: false })
    }
  },

  ensureAudio() {
    if (this._audio) return this._audio
    const audio = wx.createInnerAudioContext()
    audio.obeyMuteSwitch = false
    audio.onPlay(() => {
      const id = this.data.currentId
      this.setData({ playing: true, playingId: id })
      this.refreshCard({ playing: true, currentId: id, keepProgress: true })
    })
    audio.onPause(() => {
      this.setData({ playing: false, spinning: false, statusText: 'PAUSED' })
    })
    audio.onStop(() => {
      this.setData({
        playing: false,
        playingId: '',
        spinning: false,
        progressPct: 0,
        currentLabel: '0:00'
      })
      this.refreshCard({ playing: false, keepProgress: false })
    })
    audio.onEnded(() => {
      this.setData({
        playing: false,
        playingId: '',
        spinning: false,
        progressPct: 100
      })
      this.refreshCard({ playing: false, keepProgress: true })
    })
    audio.onTimeUpdate(() => {
      if (this.data.recording) return
      const current = audio.currentTime || 0
      let duration = audio.duration || 0
      if (!duration) {
        const item = (this.data.records || []).find((r) => r.id === this.data.currentId)
        duration = item ? (item.durationMs || 0) / 1000 : 0
      }
      const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0
      this.setData({
        currentLabel: formatDuration(current * 1000),
        totalLabel: formatDuration(duration * 1000),
        progressPct: pct
      })
    })
    audio.onError(() => {
      this.setData({ playing: false, playingId: '', spinning: false })
      this.refreshCard({ playing: false })
      wx.showToast({ title: '播放失败', icon: 'none' })
    })
    this._audio = audio
    return audio
  },

  pausePlayback() {
    if (!this._audio) {
      if (this.data.playing) this.setData({ playing: false, playingId: '', spinning: false })
      return
    }
    try {
      this._audio.pause()
    } catch (e) {
      /* ignore */
    }
    this.setData({ playing: false, playingId: '', spinning: false })
  },

  playCurrent() {
    const item = (this.data.records || []).find((r) => r.id === this.data.currentId)
    if (!item || !item.path) return
    const audio = this.ensureAudio()
    if (audio.src !== item.path) {
      audio.src = item.path
      audio.seek(0)
      this.setData({ progressPct: 0, currentLabel: '0:00', totalLabel: item.durationLabel })
    }
    audio.play()
  },

  onMainAction() {
    if (this.data.recording) {
      this.stopRecord()
      return
    }
    if (!this.data.currentId) {
      this.startRecord()
      return
    }
    if (this.data.playing) {
      this.pausePlayback()
      this.refreshCard({ playing: false, keepProgress: true })
      return
    }
    this.playCurrent()
  },

  onSelectTrack(e) {
    if (this.data.recording) {
      wx.showToast({ title: '请先结束录音', icon: 'none' })
      return
    }
    const id = e.currentTarget.dataset.id
    if (!id) return
    if (this.data.currentId === id) {
      this.onMainAction()
      return
    }
    this.pausePlayback()
    this.setData({
      currentId: id,
      progressPct: 0,
      currentLabel: '0:00',
      playing: false,
      playingId: ''
    })
    this.refreshCard({ currentId: id, playing: false })
    this.playCurrent()
  },

  onPrev() {
    if (this.data.recording || !this.data.canPrev) return
    const idx = this.getCurrentIndex()
    if (idx <= 0) return
    const prev = this.data.records[idx - 1]
    this.pausePlayback()
    this.setData({
      currentId: prev.id,
      progressPct: 0,
      currentLabel: '0:00',
      playing: false,
      playingId: ''
    })
    this.refreshCard({ currentId: prev.id, playing: false })
    this.playCurrent()
  },

  onNext() {
    if (this.data.recording || !this.data.canNext) return
    const idx = this.getCurrentIndex()
    if (idx < 0 || idx >= this.data.records.length - 1) return
    const next = this.data.records[idx + 1]
    this.pausePlayback()
    this.setData({
      currentId: next.id,
      progressPct: 0,
      currentLabel: '0:00',
      playing: false,
      playingId: ''
    })
    this.refreshCard({ currentId: next.id, playing: false })
    this.playCurrent()
  },

  onRename(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.records || []).find((r) => r.id === id)
    if (!item) return
    wx.showModal({
      title: '修改备注',
      editable: true,
      placeholderText: '输入备注名',
      content: item.name || '',
      success: (res) => {
        if (!res.confirm) return
        const name = String(res.content || '').trim()
        if (!name) {
          wx.showToast({ title: '名称不能为空', icon: 'none' })
          return
        }
        const records = decorate(updateRecord(id, { name }))
        this.setData({ records })
        this.refreshCard({ records, keepProgress: true })
      }
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除录音',
      content: '确定删除这条录音吗？',
      confirmText: '删除',
      confirmColor: '#EF4444',
      success: (res) => {
        if (!res.confirm) return
        if (this.data.currentId === id || this.data.playingId === id) {
          this.pausePlayback()
          if (this._audio) {
            try {
              this._audio.stop()
            } catch (err) {
              /* ignore */
            }
          }
        }
        const records = decorate(removeRecord(id))
        const patch = { records }
        if (this.data.currentId === id) {
          patch.currentId = ''
          patch.playing = false
          patch.playingId = ''
          patch.progressPct = 0
          patch.currentLabel = '0:00'
        }
        this.setData(patch)
        this.refreshCard(patch)
      }
    })
  }
})
