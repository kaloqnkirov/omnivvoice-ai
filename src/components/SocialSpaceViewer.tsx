'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  Lock,
  MessageCircle,
  Phone,
  Share2,
  UserPlus,
  Users,
  Video,
} from 'lucide-react'
import type { Conversation } from '@/lib/auth-types'
import {
  canRequestFollow,
  hasPendingFollowOrJoin,
  isGroupSpace,
  spaceAccessForUser,
} from '@/lib/social-access'
import {
  loadCover,
  loadWallPosts,
  type WallPost,
} from '@/lib/page-wall-store'
import PageWall from '@/components/PageWall'

type Props = {
  space: Conversation
  userId: string
  userName: string
  focusPostId?: string | null
  onBack: () => void
  onToggleFollowOrJoin: () => void
  onAcceptRequest?: (requestId: string) => void
  onGoLive?: (cover: string | null) => void
  /** Open chat thread for this space (then voice/video from chat) */
  onOpenChat?: () => void
  onStartVoice?: () => void
  onStartVideo?: () => void
  readerLang?: string
  plan?: 'free' | 'business' | 'podcast'
  bonusChars?: number
  className?: string
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('bg-BG', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Full page/group entry: public → whole wall; approval/private →
 * cover + avatar + one focused (or latest) post until follow/member.
 */
export default function SocialSpaceViewer({
  space,
  userId,
  userName,
  focusPostId,
  onBack,
  onToggleFollowOrJoin,
  onAcceptRequest,
  onGoLive,
  onOpenChat,
  onStartVoice,
  onStartVideo,
  readerLang = 'bg',
  plan = 'free',
  bonusChars,
  className = '',
}: Props) {
  const access = spaceAccessForUser(space, userId)
  const [cover, setCover] = useState<string | null>(null)
  const [posts, setPosts] = useState<WallPost[]>([])
  const pending = hasPendingFollowOrJoin(space, userId)
  const isGroup = isGroupSpace(space) && space.spaceFormat === 'group'
  const isOwner = space.adminUserId === userId
  const pendingIncoming = (space.joinRequests || []).filter(
    (j) => j.status === 'pending' && j.kind === 'knock'
  )

  useEffect(() => {
    setCover(loadCover(space.id))
    setPosts(loadWallPosts(space.id))
  }, [space.id, space.title])

  const teaserPost = useMemo(() => {
    if (focusPostId) {
      const hit = posts.find((p) => p.id === focusPostId)
      if (hit) return hit
    }
    return posts[0] || null
  }, [posts, focusPostId])

  const canAsk = canRequestFollow(space, userId)
  const ctaLabel = isGroup
    ? pending
      ? 'Чака одобрение'
      : 'Заяви членство'
    : pending
      ? 'Чака одобрение'
      : 'Заяви следване'

  async function shareSpace() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard?space=${encodeURIComponent(space.id)}`
        : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: space.title, url })
        return
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* ignore */
    }
  }

  if (access === 'none') {
    return (
      <div
        className={`ov-scroll flex h-full min-h-0 flex-col ${className}`}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2.5">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--chip)]"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold">{space.title}</p>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Lock className="h-8 w-8 text-[var(--muted)]" />
          <p className="text-sm font-semibold">Частно пространство</p>
          <p className="text-xs text-[var(--muted)]">
            Само поканени членове виждат тази{' '}
            {isGroup ? 'група' : 'страница'}.
          </p>
        </div>
      </div>
    )
  }

  if (access === 'full') {
    return (
      <div
        className={`flex h-full min-h-0 flex-col overflow-hidden ${className}`}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2.5">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--chip)]"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{space.title}</p>
            <p className="truncate text-[10px] text-[var(--muted)]">
              {isGroup ? 'Група' : 'Страница'}
              {space.followPolicy === 'public' ? ' · публична' : ''}
            </p>
          </div>
          {onOpenChat ? (
            <button
              type="button"
              className="ov-icon-btn"
              title="Чат"
              onClick={onOpenChat}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          ) : null}
          {onStartVoice ? (
            <button
              type="button"
              className="ov-icon-btn"
              title="Гласово"
              onClick={onStartVoice}
            >
              <Phone className="h-4 w-4" />
            </button>
          ) : null}
          {onStartVideo ? (
            <button
              type="button"
              className="ov-icon-btn"
              title="Видео"
              onClick={onStartVideo}
            >
              <Video className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            className="ov-icon-btn"
            title="Сподели"
            onClick={() => void shareSpace()}
          >
            <Share2 className="h-4 w-4" />
          </button>
        </header>
        {isOwner && pendingIncoming.length > 0 ? (
          <div className="shrink-0 space-y-1.5 border-b border-[var(--panel-border)] bg-amber-500/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300">
              Заявки ({pendingIncoming.length})
            </p>
            {pendingIncoming.slice(0, 5).map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate font-medium">{j.name}</span>
                <button
                  type="button"
                  className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent-ink)]"
                  onClick={() => onAcceptRequest?.(j.id)}
                >
                  Приеми
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden">
          <PageWall
            variant="full"
            pageTitle={space.title}
            convId={space.id}
            currentUserId={userId}
            currentUserName={userName}
            writerLang={readerLang}
            readerLang={readerLang}
            plan={plan}
            bonusChars={bonusChars}
            isFollowing={
              (space.followerIds || []).includes(userId) ||
              space.adminUserId === userId
            }
            canFollow={
              space.adminUserId !== userId &&
              Boolean(
                space.spaceFormat &&
                  ['page', 'business', 'podcast', 'community'].includes(
                    space.spaceFormat
                  )
              )
            }
            onToggleFollow={onToggleFollowOrJoin}
            onGoLive={onGoLive}
          />
        </div>
      </div>
    )
  }

  // teaser — cover + avatar + one post + request CTA
  return (
    <div
      className={`ov-scroll flex h-full min-h-0 flex-col ${className}`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2.5">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--chip)]"
          onClick={onBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {space.title}
        </p>
      </header>

      <div className="relative h-36 shrink-0 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 sm:h-44">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-white/50">
            Корица
          </div>
        )}
      </div>

      <div className="relative px-4 pb-3 pt-10">
        <span className="absolute -top-8 left-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-indigo-700 text-xl font-bold text-white ring-4 ring-[var(--panel)]">
          {space.title.slice(0, 1).toUpperCase()}
        </span>
        <p className="text-lg font-semibold">{space.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)]">
          {isGroup ? (
            <>
              <Users className="h-3 w-3" /> Група · нужно членство
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" /> Страница · нужно одобрение за
              следване
            </>
          )}
        </p>

        {canAsk || pending ? (
          <button
            type="button"
            disabled={pending}
            onClick={onToggleFollowOrJoin}
            className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
              pending
                ? 'bg-[var(--chip)] text-[var(--muted)]'
                : 'bg-[var(--accent)] text-[var(--accent-ink)]'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {ctaLabel}
          </button>
        ) : null}
      </div>

      <div className="border-t border-[var(--panel-border)] px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {focusPostId ? 'Споделена публикация' : 'Преглед'}
        </p>
        {teaserPost ? (
          <article className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3">
            <header className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-700 text-xs font-bold text-white">
                {teaserPost.authorName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  {teaserPost.authorName}
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  {formatTime(teaserPost.createdAt)}
                </p>
              </div>
            </header>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">
              {teaserPost.text}
            </p>
            {teaserPost.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={teaserPost.mediaUrl}
                alt=""
                className="mt-2 max-h-56 w-full rounded-xl object-cover"
              />
            ) : null}
          </article>
        ) : (
          <p className="text-xs text-[var(--muted)]">Няма публична публикация.</p>
        )}
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          След одобрение от създателя ще видиш цялата{' '}
          {isGroup ? 'група' : 'стена'}.
        </p>
      </div>
    </div>
  )
}
