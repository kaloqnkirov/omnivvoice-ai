'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bot,
  Camera,
  ChevronDown,
  ImageIcon,
  Lock,
  Plus,
  Search,
  Swords,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'
import { bumpFeatureUse } from '@/lib/feature-suggest'
import {
  CPU_DIFFICULTY_OPTIONS,
  type CpuDifficulty,
} from '@/lib/cpu-difficulty'
import { rulesFor } from '@/lib/game-rules'
import {
  ONLINE_GAME_CATALOG,
  ONLINE_GAMES_ENABLED,
  activeSkinsForGame,
  ensureWeeklyTournamentJoined,
  feltSkins,
  gameLabel,
  gamePlayInfo,
  leaderboardForGame,
  loadPresenceMode,
  msUntilNextRotation,
  primarySkinsForGame,
  isRankedRoom,
  recordWin,
  rotatingSkinShowcase,
  savePresenceMode,
  seedDemoWinsIfEmpty,
  weeklyTournament,
  type GameRoom,
  type PresenceMode,
} from '@/lib/online-games'
import GameRoomSession from '@/components/GameRoomSession'

export type { GameRoom }

export type LobbyPlayer = {
  id: string
  name: string
  avatarUrl?: string
}

type Props = {
  open: boolean
  userName: string
  avatarUrl?: string
  avatarGallery?: string[]
  players?: LobbyPlayer[]
  onClose: () => void
  initialGame?: string
}

type Tab = 'lobby' | 'ranks' | 'tournament' | 'search'

export default function GamesLobby({
  open,
  userName,
  avatarUrl,
  avatarGallery = [],
  players = [],
  onClose,
  initialGame,
}: Props) {
  const [rooms, setRooms] = useState<GameRoom[]>([])
  const [game, setGame] = useState('santase')
  const [rankGame, setRankGame] = useState('santase')
  const [title, setTitle] = useState('')
  const [password, setPassword] = useState('')
  const [skinMode, setSkinMode] = useState<'auto' | 'fixed'>('auto')
  const [primarySkinId, setPrimarySkinId] = useState('deck_classic')
  const [feltSkinId, setFeltSkinId] = useState('felt_green')
  const [joinMsg, setJoinMsg] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('lobby')
  const [query, setQuery] = useState('')
  const [presence, setPresence] = useState<PresenceMode>('avatar')
  const [galleryIdx, setGalleryIdx] = useState(0)
  const [skinTick, setSkinTick] = useState(0)
  const [ranksTick, setRanksTick] = useState(0)
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null)
  const [rulesDrop, setRulesDrop] = useState(false)
  const [cpuDiff, setCpuDiff] = useState<CpuDifficulty>('medium')
  const [mounted, setMounted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setActiveRoom(null)
      setRulesDrop(false)
      return
    }
    seedDemoWinsIfEmpty()
    setPresence(loadPresenceMode())
    if (initialGame && ONLINE_GAME_CATALOG.some((c) => c.id === initialGame)) {
      setGame(initialGame)
      setRankGame(initialGame)
    }
  }, [open, initialGame])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (activeRoom) {
        setActiveRoom(null)
        return
      }
      if (rulesDrop) {
        setRulesDrop(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, activeRoom, rulesDrop, onClose])

  useEffect(() => {
    const primaries = primarySkinsForGame(game)
    if (!primaries.some((s) => s.id === primarySkinId) && primaries[0]) {
      setPrimarySkinId(primaries[0].id)
    }
  }, [game, primarySkinId])

  const createPrimaryOptions = useMemo(
    () => primarySkinsForGame(game),
    [game]
  )
  const createFeltOptions = useMemo(() => feltSkins(), [])

  useEffect(() => {
    if (!open) return
    let intervalId = 0
    const refresh = () => setSkinTick((t) => t + 1)
    refresh()
    const t0 = window.setTimeout(() => {
      refresh()
      intervalId = window.setInterval(refresh, 5 * 60 * 1000)
    }, msUntilNextRotation())
    return () => {
      window.clearTimeout(t0)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [open])

  useEffect(() => {
    if (!open || presence !== 'camera') {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      } catch {
        setPresence('avatar')
        savePresenceMode('avatar')
        setJoinMsg('Камерата не е достъпна — ползваме профилната снимка.')
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open, presence, activeRoom])

  useEffect(() => {
    if (presence !== 'camera' || !streamRef.current || !videoRef.current) return
    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play().catch(() => undefined)
  }, [presence, activeRoom])

  const label = useMemo(() => gameLabel(game), [game])
  const skins = useMemo(
    () => activeSkinsForGame(game, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, skinTick]
  )
  const showcase = useMemo(
    () => rotatingSkinShowcase(Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skinTick]
  )
  const tournament = useMemo(() => weeklyTournament(), [open, ranksTick])
  const ranks = useMemo(
    () => leaderboardForGame(rankGame, 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankGame, ranksTick, open]
  )

  const gallery = useMemo(() => {
    const list = [...avatarGallery]
    if (avatarUrl && !list.includes(avatarUrl)) list.unshift(avatarUrl)
    return list
  }, [avatarUrl, avatarGallery])

  const activePhoto =
    presence === 'gallery' && gallery.length
      ? gallery[galleryIdx % gallery.length]
      : avatarUrl

  const filteredRooms = useMemo(() => {
    const rankedOnly = rooms.filter((r) => isRankedRoom(r))
    const q = query.trim().toLowerCase()
    if (!q) return rankedOnly
    return rankedOnly.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.host.toLowerCase().includes(q) ||
        gameLabel(r.game).toLowerCase().includes(q) ||
        r.game.toLowerCase().includes(q)
    )
  }, [rooms, query])

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base: LobbyPlayer[] = [
      { id: 'me', name: userName, avatarUrl },
      ...players,
    ]
    const uniq = new Map<string, LobbyPlayer>()
    for (const p of base) {
      if (!uniq.has(p.name.toLowerCase())) uniq.set(p.name.toLowerCase(), p)
    }
    const list = [...uniq.values()]
    if (!q) return list
    return list.filter((p) => p.name.toLowerCase().includes(q))
  }, [players, query, userName, avatarUrl])

  if (!ONLINE_GAMES_ENABLED || !open) return null

  function setPresenceMode(mode: PresenceMode) {
    setPresence(mode)
    savePresenceMode(mode)
  }

  function enterRoom(room: GameRoom) {
    setActiveRoom(room)
    setJoinMsg(null)
  }

  function createRoom(opts?: { vsCpu?: boolean }) {
    bumpFeatureUse('online_games')
    const meta =
      ONLINE_GAME_CATALOG.find((c) => c.id === game) || ONLINE_GAME_CATALOG[0]
    const rr = rulesFor(meta.id)
    const vsCpu = Boolean(opts?.vsCpu)
    const diffLabel =
      CPU_DIFFICULTY_OPTIONS.find((d) => d.id === cpuDiff)?.label || 'Средно'
    const room: GameRoom = {
      id: `gr_${Date.now()}${vsCpu ? '_cpu' : ''}`,
      game: meta.id,
      title: vsCpu
        ? title.trim() || `${meta.label} · CPU · ${diffLabel}`
        : title.trim() || `${meta.label} · ${userName}`,
      host: userName,
      hasPassword: vsCpu ? false : Boolean(password.trim()),
      // CPU table fills to minimum so deal can start immediately in-session
      players: vsCpu ? rr.min : 1,
      max: rr.max || meta.max,
      skinMode,
      primarySkinId: skinMode === 'fixed' ? primarySkinId : undefined,
      feltSkinId: skinMode === 'fixed' ? feltSkinId : undefined,
      vsCpu,
      cpuDifficulty: vsCpu ? cpuDiff : undefined,
    }
    // Casual CPU games stay out of the ranked lobby list
    if (!vsCpu) {
      setRooms((r) => [room, ...r])
    }
    setTitle('')
    setPassword('')
    setJoinMsg(
      vsCpu
        ? `Срещу компютъра · ${diffLabel} · без ранкинг и турнир`
        : null
    )
    enterRoom(room)
  }

  function exitAll() {
    setActiveRoom(null)
    setRulesDrop(false)
    onClose()
  }

  function joinRoom(room: GameRoom) {
    bumpFeatureUse('online_games')
    if (room.hasPassword) {
      const pw = window.prompt('Парола за стаята:')
      if (pw == null) return
      if (!pw.trim()) {
        setJoinMsg('Грешна парола')
        return
      }
    }
    if (room.players >= room.max && room.host !== userName) {
      setJoinMsg('Стаята е пълна')
      return
    }
    const next = {
      ...room,
      players: Math.min(room.max, room.players + (room.host === userName ? 0 : 1)),
    }
    setRooms((list) =>
      list.map((r) => (r.id === room.id ? next : r))
    )
    if (isRankedRoom(room) && Math.random() > 0.55) {
      recordWin(room.game, userName, 1, { ranked: true })
      setRanksTick((t) => t + 1)
    }
    enterRoom(next)
  }

  function joinTournament() {
    bumpFeatureUse('online_games')
    ensureWeeklyTournamentJoined(userName)
    setGame(tournament.gameId)
    setRankGame(tournament.gameId)
    setTab('lobby')
    setJoinMsg(`Записан за ${tournament.title}`)
    setRanksTick((t) => t + 1)
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'lobby', label: 'Лоби' },
    { id: 'search', label: 'Търсене' },
    { id: 'ranks', label: 'Ранклист' },
    { id: 'tournament', label: 'Турнир' },
  ]

  const presenceAvatar = (
    <div
      className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${skins.felt.tone} ring-1 ring-[var(--accent)]/40`}
    >
      {presence === 'camera' ? (
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full scale-x-[-1] object-cover"
        />
      ) : activePhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={activePhoto} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
          {userName.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  )

  if (!mounted) return null

  if (activeRoom) {
    return (
      <GameRoomSession
        room={activeRoom}
        userName={userName}
        presenceNode={presenceAvatar}
        onLeave={() => setActiveRoom(null)}
        onExitAll={exitAll}
      />
    )
  }

  const selectedRules = rulesFor(game)

  const lobby = (
    <div
      className="fixed inset-0 z-[92] flex items-end justify-center bg-black/55 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label="Онлайн игри"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Swords className="h-4 w-4 text-[var(--accent)]" />
              Онлайн игри
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              Мин. играчи преди раздаване · Esc / ✕ затваря
            </p>
          </div>
          <button
            type="button"
            className="ov-icon-btn bg-[var(--chip)]"
            aria-label="Затвори"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Presence + rotating skins */}
        <div className="shrink-0 space-y-2 border-b border-[var(--panel-border)] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${skins.felt.tone} ring-2 ring-[var(--accent)]/40`}
            >
              {presence === 'camera' ? (
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="h-full w-full scale-x-[-1] object-cover"
                />
              ) : activePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activePhoto}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{userName}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    presence === 'camera'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--chip)]'
                  }`}
                  onClick={() => setPresenceMode('camera')}
                >
                  <Camera className="h-3 w-3" /> Камера
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    presence === 'avatar'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--chip)]'
                  }`}
                  onClick={() => setPresenceMode('avatar')}
                >
                  <UserRound className="h-3 w-3" /> Профил
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    presence === 'gallery'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--chip)]'
                  }`}
                  onClick={() => {
                    setPresenceMode('gallery')
                    if (gallery.length)
                      setGalleryIdx((i) => (i + 1) % gallery.length)
                  }}
                  disabled={!gallery.length}
                  title={
                    gallery.length
                      ? 'Смени снимка от галерията'
                      : 'Няма снимки в профила'
                  }
                >
                  <ImageIcon className="h-3 w-3" /> Галерия
                </button>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl bg-gradient-to-r ${skins.primary.tone} px-2.5 py-2 text-white`}
          >
            <p className="text-[10px] font-bold uppercase opacity-90">
              Консумативи сега · смяна на 5 мин
            </p>
            <p className="text-[12px] font-semibold">
              {skins.primary.preview} {skins.primary.label} · {skins.felt.label}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {showcase.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-black/25 px-2 py-0.5 text-[10px]"
                >
                  {s.preview} {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="ov-scroll-x flex shrink-0 gap-1 border-b border-[var(--panel-border)] px-2 py-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                tab === t.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--chip)] text-[var(--muted)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ov-scroll min-h-0 flex-1 space-y-3 p-4">
          {tab === 'lobby' ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {ONLINE_GAME_CATALOG.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setGame(c.id)
                      setRankGame(c.id)
                      setRulesDrop(true)
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
                      game === c.id
                        ? 'bg-[var(--accent)] text-white ring-[var(--accent)]'
                        : 'bg-[var(--chip)] text-[var(--foreground)] ring-[var(--panel-border)]'
                    }`}
                    title={gamePlayInfo(c.id).label}
                  >
                    {c.emoji} {c.label}
                    {gamePlayInfo(c.id).mode === 'team' ? ' · 2v2' : ''}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)]/40">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                  onClick={() => setRulesDrop((v) => !v)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold">
                      Правила · {label}
                    </span>
                    <span className="block text-[10px] text-[var(--muted)]">
                      {selectedRules.min}–{selectedRules.max} играчи
                      {selectedRules.needsDealer
                        ? ` · ${selectedRules.dealerTitle}`
                        : ''}{' '}
                      · {selectedRules.deckLabel}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[var(--muted)] transition ${
                      rulesDrop ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {rulesDrop ? (
                  <div className="space-y-1.5 border-t border-[var(--panel-border)] px-3 py-2.5">
                    <p className="text-[11px] leading-snug text-[var(--foreground)]">
                      {selectedRules.summary}
                    </p>
                    <ul className="space-y-1 text-[10px] leading-snug text-[var(--muted)]">
                      {selectedRules.rules.map((line) => (
                        <li key={line} className="flex gap-1.5">
                          <span className="text-[var(--accent)]">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      {selectedRules.dealNote}
                    </p>
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-[var(--muted)]"
                      onClick={() => setRulesDrop(false)}
                    >
                      Скрий правилата
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--panel-border)] p-3">
                <p className="text-[10px] font-bold uppercase text-[var(--muted)]">
                  Нова стая · {label} · мин. {selectedRules.min}
                </p>
                <select
                  className="ov-field mt-2 text-sm"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                >
                  {ONLINE_GAME_CATALOG.map((c) => {
                    const rr = rulesFor(c.id)
                    return (
                      <option key={c.id} value={c.id}>
                        {c.label} ({rr.min}–{rr.max}
                        {rr.needsDealer ? ` · ${rr.dealerTitle}` : ''})
                      </option>
                    )
                  })}
                </select>
                <input
                  className="ov-field mt-2 text-sm"
                  placeholder="Име на стаята"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  className="ov-field mt-2 text-sm"
                  placeholder="Парола (по желание)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <p className="mt-3 text-[10px] font-bold uppercase text-[var(--muted)]">
                  Консумативи · клубни / VIP / Pin-up 18+
                </p>
                <p className="mt-0.5 text-[9px] text-[var(--muted)]">
                  Стил като Stars / GG / Belote Club — избери тесте и сукно
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSkinMode('auto')}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      skinMode === 'auto'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--chip)]'
                    }`}
                  >
                    Авто · смяна на 5 мин
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkinMode('fixed')}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      skinMode === 'fixed'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--chip)]'
                    }`}
                  >
                    Избери сам
                  </button>
                </div>
                {skinMode === 'auto' ? (
                  <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                    Тестета, пионки и сукно ще се сменят автоматично на всеки 5
                    минути за всички в стаята.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <label className="block text-[10px] text-[var(--muted)]">
                      Тесте / фигури / пионки
                      <select
                        className="ov-field mt-1 text-sm"
                        value={primarySkinId}
                        onChange={(e) => setPrimarySkinId(e.target.value)}
                      >
                        {createPrimaryOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.preview} {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[10px] text-[var(--muted)]">
                      Сукно / маса
                      <select
                        className="ov-field mt-1 text-sm"
                        value={feltSkinId}
                        onChange={(e) => setFeltSkinId(e.target.value)}
                      >
                        {createFeltOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.preview} {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div
                      className={`rounded-xl bg-gradient-to-r ${
                        createPrimaryOptions.find((s) => s.id === primarySkinId)
                          ?.tone || 'from-slate-600 to-slate-900'
                      } px-2.5 py-2 text-[11px] font-semibold text-white`}
                    >
                      Преглед:{' '}
                      {
                        createPrimaryOptions.find((s) => s.id === primarySkinId)
                          ?.preview
                      }{' '}
                      {
                        createPrimaryOptions.find((s) => s.id === primarySkinId)
                          ?.label
                      }{' '}
                      ·{' '}
                      {
                        createFeltOptions.find((s) => s.id === feltSkinId)
                          ?.label
                      }
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-xl border border-violet-500/25 bg-violet-500/5 p-2.5">
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    <Bot className="h-3 w-3" /> Срещу компютъра · трудност
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {CPU_DIFFICULTY_OPTIONS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setCpuDiff(d.id)}
                        className={`rounded-xl px-1.5 py-2 text-center transition ${
                          cpuDiff === d.id
                            ? d.id === 'easy'
                              ? 'bg-emerald-500 text-white shadow'
                              : d.id === 'hard'
                                ? 'bg-rose-600 text-white shadow'
                                : 'bg-violet-600 text-white shadow'
                            : 'bg-[var(--panel)] text-[var(--muted)] ring-1 ring-[var(--panel-border)]'
                        }`}
                      >
                        <span className="block text-[11px] font-bold">
                          {d.label}
                        </span>
                        <span className="mt-0.5 block text-[8px] leading-tight opacity-90">
                          {d.blurb.split(' · ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[9px] text-[var(--muted)]">
                    {
                      CPU_DIFFICULTY_OPTIONS.find((d) => d.id === cpuDiff)
                        ?.blurb
                    }{' '}
                    · без ранкинг / турнир
                  </p>
                  <button
                    type="button"
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-500"
                    onClick={() => createRoom({ vsCpu: true })}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Играй срещу CPU ·{' '}
                    {CPU_DIFFICULTY_OPTIONS.find((d) => d.id === cpuDiff)?.label}
                  </button>
                </div>

                <button
                  type="button"
                  className="ov-btn-primary mt-2 w-full justify-center text-xs"
                  onClick={() => createRoom()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Създай онлайн стая
                </button>
              </div>

              <ul className="space-y-1.5">
                {rooms.filter((r) => isRankedRoom(r)).map((room) => (
                  <li
                    key={room.id}
                    className="flex items-center gap-2 rounded-2xl border border-[var(--panel-border)] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {room.title}
                        {room.hasPassword ? (
                          <Lock className="ml-1 inline h-3 w-3 text-[var(--muted)]" />
                        ) : null}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {gameLabel(room.game)} · {room.host} · {room.players}/
                        {room.max}
                        {room.players < rulesFor(room.game).min
                          ? ` · чака ${rulesFor(room.game).min}`
                          : ' · пълна за старт'}
                        {' · '}
                        {(room.skinMode || 'auto') === 'auto'
                          ? 'Авто кожи'
                          : 'Фиксирани кожи'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ov-btn-ghost !px-2.5 !py-1 text-[11px]"
                      onClick={() => joinRoom(room)}
                    >
                      Влез
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {tab === 'search' ? (
            <>
              <div className="ov-input-wrap">
                <Search className="h-4 w-4 opacity-50" />
                <input
                  className="ov-input"
                  placeholder="Търси играчи или стаи…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                  Играчи ({filteredPlayers.length})
                </p>
                <ul className="space-y-1">
                  {filteredPlayers.slice(0, 20).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[var(--chip)]"
                    >
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--chip)] text-[11px] font-bold">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          p.name.slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                        {p.name}
                      </span>
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-[var(--accent)]"
                        onClick={() => {
                          setGame('santase')
                          setTitle(`${p.name} · предизвикай`)
                          setTab('lobby')
                          setJoinMsg(`Предизвикай ${p.name} в стая`)
                        }}
                      >
                        Предизвикай
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-[var(--muted)]">
                  Стаи ({filteredRooms.length})
                </p>
                <ul className="space-y-1.5">
                  {filteredRooms.map((room) => (
                    <li
                      key={room.id}
                      className="flex items-center gap-2 rounded-2xl border border-[var(--panel-border)] px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">
                          {room.title}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {gameLabel(room.game)} · {room.host}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ov-btn-ghost !px-2.5 !py-1 text-[11px]"
                        onClick={() => joinRoom(room)}
                      >
                        Влез
                      </button>
                    </li>
                  ))}
                  {!filteredRooms.length ? (
                    <p className="text-[11px] text-[var(--muted)]">
                      Няма стаи по търсенето.
                    </p>
                  ) : null}
                </ul>
              </div>
            </>
          ) : null}

          {tab === 'ranks' ? (
            <>
              <select
                className="ov-field text-sm"
                value={rankGame}
                onChange={(e) => setRankGame(e.target.value)}
              >
                {ONLINE_GAME_CATALOG.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--muted)]">
                Ранклист по победи · {gameLabel(rankGame)}
              </p>
              <ol className="space-y-1">
                {ranks.length ? (
                  ranks.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-2"
                    >
                      <span className="w-6 text-center text-xs font-bold text-[var(--accent)]">
                        {r.rank}
                      </span>
                      <Trophy
                        className={`h-3.5 w-3.5 ${
                          r.rank <= 3 ? 'text-amber-500' : 'text-[var(--muted)]'
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                        {r.name}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {r.wins} победи
                      </span>
                    </li>
                  ))
                ) : (
                  <p className="text-[11px] text-[var(--muted)]">
                    Все още няма победи за тази игра — влез в стая и играй.
                  </p>
                )}
              </ol>
            </>
          ) : null}

          {tab === 'tournament' ? (
            <div className="space-y-3">
              <div
                className={`rounded-2xl bg-gradient-to-br ${skins.felt.tone} p-4 text-white`}
              >
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <Trophy className="h-4 w-4 text-amber-300" />
                  {tournament.title}
                </p>
                <p className="mt-1 text-[11px] opacity-90">
                  Седмица {tournament.weekKey} · автоматично всеки понеделник
                </p>
                <p className="mt-3 text-[12px]">
                  {tournament.startsLabel} → {tournament.endsLabel}
                </p>
                <p className="mt-1 text-[11px] opacity-90">
                  Награда: {tournament.prize}
                </p>
                <button
                  type="button"
                  className="mt-3 w-full rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-slate-900"
                  onClick={joinTournament}
                >
                  Участвай · {tournament.gameLabel}
                </button>
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Турнирът сменя играта всяка седмица. Ранклистът за турнирната
                игра е в раздел „Ранклист“. Мачовете „Срещу компютъра“ не се
                броят.
              </p>
              <button
                type="button"
                className="ov-btn-ghost w-full justify-center text-xs"
                onClick={() => {
                  setRankGame(tournament.gameId)
                  setTab('ranks')
                }}
              >
                Виж ранкинг за {tournament.gameLabel}
              </button>
            </div>
          ) : null}

          {joinMsg ? (
            <p className="text-center text-[11px] text-[var(--accent)]">
              {joinMsg}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--panel-border)] px-4 py-2.5">
          <button
            type="button"
            className="ov-btn-ghost w-full justify-center text-xs"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
            Затвори менюто с игри
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(lobby, document.body)
}
