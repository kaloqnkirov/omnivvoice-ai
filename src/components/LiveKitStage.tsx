'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from 'livekit-client'
import { CameraOff, Loader2 } from 'lucide-react'

type Props = {
  roomId: string
  displayName: string
  guestId?: string
  micOn: boolean
  cameraOn: boolean
}

export default function LiveKitStage({
  roomId,
  displayName,
  guestId,
  micOn,
  cameraOn,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteHostRef = useRef<HTMLDivElement>(null)
  const roomRef = useRef<Room | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'local' | 'error'>(
    'connecting'
  )
  const [error, setError] = useState<string | null>(null)
  const [remoteCount, setRemoteCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function startLocalPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: cameraOn,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        stream.getAudioTracks().forEach((t) => {
          t.enabled = micOn
        })
        stream.getVideoTracks().forEach((t) => {
          t.enabled = cameraOn
        })
        setStatus('local')
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Не мога да отворя микрофон/камера'
        )
        setStatus('error')
      }
    }

    async function connect() {
      setError(null)
      setStatus('connecting')
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ roomId, guestId, displayName }),
        })
        const data = (await res.json()) as {
          server_url?: string
          participant_token?: string
          localPreview?: boolean
          error?: string
        }

        if (!res.ok || !data.server_url || !data.participant_token) {
          await startLocalPreview()
          return
        }

        const room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room

        const attachRemote = (
          participant: RemoteParticipant,
          publication: RemoteTrackPublication
        ) => {
          if (!publication.track || !remoteHostRef.current) return
          if (
            publication.kind !== Track.Kind.Video &&
            publication.kind !== Track.Kind.Audio
          ) {
            return
          }
          const el = publication.track.attach()
          el.className =
            publication.kind === Track.Kind.Video
              ? 'h-full w-full object-cover'
              : 'hidden'
          if (publication.kind === Track.Kind.Video) {
            remoteHostRef.current.innerHTML = ''
            remoteHostRef.current.appendChild(el)
          } else {
            remoteHostRef.current.appendChild(el)
          }
          setRemoteCount(room.remoteParticipants.size)
        }

        room.on(
          RoomEvent.TrackSubscribed,
          (track, publication, participant) => {
            attachRemote(participant, publication as RemoteTrackPublication)
          }
        )
        room.on(RoomEvent.ParticipantDisconnected, () => {
          setRemoteCount(room.remoteParticipants.size)
        })

        await room.connect(data.server_url, data.participant_token)
        await room.localParticipant.setMicrophoneEnabled(micOn)
        await room.localParticipant.setCameraEnabled(cameraOn)

        const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
        if (camPub?.track && localVideoRef.current) {
          camPub.track.attach(localVideoRef.current)
        }

        if (!cancelled) setStatus('live')
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'LiveKit error')
          await startLocalPreview()
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
      roomRef.current?.disconnect()
      roomRef.current = null
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect only on room identity
  }, [roomId, guestId, displayName])

  useEffect(() => {
    const room = roomRef.current
    if (room && status === 'live') {
      void room.localParticipant.setMicrophoneEnabled(micOn)
      void room.localParticipant.setCameraEnabled(cameraOn)
      return
    }
    const stream = localStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach((t) => {
      t.enabled = micOn
    })
    stream.getVideoTracks().forEach((t) => {
      t.enabled = cameraOn
    })
  }, [micOn, cameraOn, status])

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black/80">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-cover ${cameraOn ? '' : 'opacity-0'}`}
        />
        {!cameraOn ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            <CameraOff className="h-8 w-8" />
            <span className="text-xs">Камерата е изключена</span>
          </div>
        ) : null}
        <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
          {displayName} (ти)
        </span>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black/60">
        <div ref={remoteHostRef} className="h-full w-full" />
        {remoteCount === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
            {status === 'connecting' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : null}
            <span className="text-xs">
              {status === 'local'
                ? 'Локален преглед — добави LiveKit за multi-device'
                : status === 'live'
                  ? 'Чакаме други участници…'
                  : status === 'connecting'
                    ? 'Свързване…'
                    : 'Няма видео'}
            </span>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="md:col-span-2 text-xs text-amber-500">{error}</p>
      ) : null}
    </div>
  )
}
