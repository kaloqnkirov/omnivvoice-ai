import type { Conversation } from '@/lib/auth-types'
import {
  loadWallPosts,
  patchWallPost,
  saveWallPosts,
  type WallComment,
  type WallPost,
} from '@/lib/page-wall-store'
import { pushFeedNotification } from '@/lib/feed-social'
import { activeStories, type UserStory } from '@/lib/profile-social'
import type { Subscriber } from '@/lib/user-store'

export type FeedStoryRing = {
  id: string
  kind: 'me' | 'friend' | 'page' | 'group'
  title: string
  avatarUrl?: string
  stories: UserStory[]
  pageId?: string
  friendId?: string
}

export type FeedItem = WallPost & {
  source: 'page' | 'friend' | 'me' | 'group'
  sourceLabel: string
}

const PAGE_FORMATS = new Set(['page', 'community', 'business', 'podcast'])
const GROUP_FORMATS = new Set(['group', 'community'])

function friendDemoStories(_sub: Subscriber): UserStory[] {
  // No fake friend stories — only real content
  return []
}

export function followedPages(
  conversations: Conversation[],
  userId: string
): Conversation[] {
  return conversations.filter((c) => {
    if (!c.spaceFormat || !PAGE_FORMATS.has(c.spaceFormat)) return false
    if (c.adminUserId === userId) return true
    return (c.followerIds || []).includes(userId)
  })
}

/** Groups / communities the user is in (member or follower) */
export function joinedGroups(
  conversations: Conversation[],
  userId: string
): Conversation[] {
  return conversations.filter((c) => {
    if (!c.spaceFormat || !GROUP_FORMATS.has(c.spaceFormat)) return false
    if (c.adminUserId === userId) return true
    if ((c.followerIds || []).includes(userId)) return true
    return c.members.some((m) => m.id === userId)
  })
}

export function buildStoryRings(input: {
  userId: string
  displayName: string
  avatarUrl?: string
  myStories: UserStory[]
  friends: Subscriber[]
  conversations: Conversation[]
}): FeedStoryRing[] {
  const rings: FeedStoryRing[] = []
  const mine = activeStories(input.myStories)
  rings.push({
    id: 'me',
    kind: 'me',
    title: 'Твоята',
    avatarUrl: input.avatarUrl,
    stories: mine,
  })

  for (const f of input.friends.filter((s) => s.status !== 'blocked').slice(0, 12)) {
    const stories = friendDemoStories(f)
    if (!activeStories(stories).length) continue
    rings.push({
      id: `friend_${f.id}`,
      kind: 'friend',
      title: f.name.split(' ')[0] || f.name,
      avatarUrl: f.avatarDataUrl,
      stories: activeStories(stories),
      friendId: f.id,
    })
  }

  for (const page of followedPages(input.conversations, input.userId).slice(
    0,
    10
  )) {
    const posts = loadWallPosts(page.id)
    const latest = posts[0]
    if (!latest) continue
    const created = new Date(latest.createdAt)
    const expires = new Date(created.getTime() + 24 * 60 * 60 * 1000)
    if (expires.getTime() < Date.now()) continue
    rings.push({
      id: `page_${page.id}`,
      kind: 'page',
      title: page.title.slice(0, 12),
      stories: [
        {
          id: `page_story_${latest.id}`,
          type: 'text',
          text: latest.text.slice(0, 120),
          createdAt: latest.createdAt,
          expiresAt: expires.toISOString(),
          views: 1,
          audience: 'public',
        },
      ],
      pageId: page.id,
    })
  }

  return rings
}

export function buildHomeFeedPosts(input: {
  userId: string
  displayName: string
  friends: Subscriber[]
  conversations: Conversation[]
}): FeedItem[] {
  const items: FeedItem[] = []
  const pages = followedPages(input.conversations, input.userId)
  const groups = joinedGroups(input.conversations, input.userId)

  for (const page of pages) {
    const posts = loadWallPosts(page.id)
    for (const p of posts) {
      items.push({
        ...p,
        pageId: page.id,
        pageTitle: page.title,
        source: page.adminUserId === input.userId ? 'me' : 'page',
        sourceLabel: page.title,
      })
    }
  }

  for (const group of groups) {
    const posts = loadWallPosts(group.id)
    for (const p of posts) {
      // avoid duplicates if community already counted as page
      if (items.some((i) => i.id === p.id)) continue
      items.push({
        ...p,
        pageId: group.id,
        pageTitle: group.title,
        source: 'group',
        sourceLabel: `Група · ${group.title}`,
      })
    }
  }

  for (const f of input.friends.filter((s) => s.status === 'active').slice(0, 8)) {
    items.push({
      id: `friend_status_${f.id}`,
      authorId: f.id,
      authorName: f.name,
      text: `${f.name.split(' ')[0]} е онлайн · готов(а) за разговор с превод.`,
      createdAt: new Date(
        Date.now() - ((f.id.length * 97) % 8) * 3600_000
      ).toISOString(),
      reactions: {},
      comments: [],
      kind: 'post',
      source: 'friend',
      sourceLabel: 'Приятел',
    })
  }

  items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return items
}

export function feedReels(items: FeedItem[]): FeedItem[] {
  return items.filter((i) => i.kind === 'reel' && Boolean(i.mediaUrl))
}

export function toggleFeedReaction(
  post: FeedItem,
  userId: string,
  emoji: string,
  actorName?: string
): FeedItem {
  const current = post.reactions[emoji] || []
  const adding = !current.includes(userId)
  const next = adding
    ? [...current, userId]
    : current.filter((id) => id !== userId)
  const reactions = { ...post.reactions }
  if (next.length) reactions[emoji] = next
  else delete reactions[emoji]
  const updated = { ...post, reactions }
  if (post.pageId && !post.id.startsWith('friend_status_')) {
    const all = loadWallPosts(post.pageId).map((p) =>
      p.id === post.id ? { ...p, reactions } : p
    )
    saveWallPosts(post.pageId, all)
  }
  if (adding && post.authorId !== userId) {
    pushFeedNotification({
      kind: 'like',
      title: `${actorName || 'Някой'} хареса пост`,
      body: post.text.slice(0, 80),
      pageId: post.pageId,
      postId: post.id,
    })
  }
  return updated
}

export function addFeedComment(
  post: FeedItem,
  comment: Omit<WallComment, 'id' | 'createdAt'>
): FeedItem {
  const entry: WallComment = {
    ...comment,
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
  }
  const comments = [...(post.comments || []), entry]
  const updated = { ...post, comments }
  if (post.pageId && !post.id.startsWith('friend_status_')) {
    patchWallPost(post.pageId, post.id, { comments })
  }
  if (post.authorId !== comment.authorId) {
    pushFeedNotification({
      kind: 'comment',
      title: `${comment.authorName} коментира`,
      body: comment.text.slice(0, 100),
      pageId: post.pageId,
      postId: post.id,
    })
  }
  return updated
}

export function notifyPublish(input: {
  authorName: string
  text: string
  pageId?: string
  postId?: string
}) {
  pushFeedNotification({
    kind: 'publish',
    title: `${input.authorName} публикува`,
    body: input.text.slice(0, 120),
    pageId: input.pageId,
    postId: input.postId,
  })
}
