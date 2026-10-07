import { useEffect, useRef, useState } from 'react'
import {
  supabase, syncAvailable, pullCollection, pushCollection,
  pullPhotoIds, pullPhoto, pushPhoto, deleteRemotePhoto,
} from './sync.js'
import { savePhoto } from '../photos.js'
import { normalizeData } from './store.js'

// Hält Sammlung, Zusatzkatalog und Fotos zwischen Geräten aktuell.
// Regel: Der neuere Stand (updatedAt) gewinnt. Fotos werden ergänzt, nicht überschrieben.
export function useSync({ data, setData, extra, setExtra, photos, setPhotos }) {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('')
  const fromRemote = useRef(false)
  const ready = useRef(false)
  const timer = useRef(null)
  const latest = useRef({ data, extra, photos })
  latest.current = { data, extra, photos }

  useEffect(() => {
    if (!syncAvailable) return
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  // Beim Anmelden bzw. Start: abgleichen
  useEffect(() => {
    if (!userId) { ready.current = false; return }
    let cancelled = false
    ;(async () => {
      try {
        setStatus('Wird abgeglichen …')
        const remote = await pullCollection(userId)
        const local = latest.current
        if (remote && (remote.updatedAt || 0) > (local.data.updatedAt || 0)) {
          fromRemote.current = true
          setData(normalizeData(remote))
          if (remote.extraCatalog) setExtra(remote.extraCatalog)
        } else {
          await pushCollection(userId, { ...local.data, extraCatalog: local.extra })
        }
        const remoteIds = new Set(await pullPhotoIds(userId))
        const localPhotos = latest.current.photos
        const got = {}
        for (const id of remoteIds) {
          if (cancelled) return
          if (!localPhotos[id]) {
            const url = await pullPhoto(userId, id)
            if (url) { await savePhoto(id, url); got[id] = url }
          }
        }
        if (Object.keys(got).length) setPhotos((p) => ({ ...p, ...got }))
        for (const [id, url] of Object.entries(localPhotos)) {
          if (!remoteIds.has(id)) await pushPhoto(userId, id, url)
        }
        ready.current = true
        setStatus(`Synchronisiert um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`)
      } catch (e) {
        setStatus('Synchronisation fehlgeschlagen. Prüfe die Internetverbindung.')
      }
    })()
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lokale Änderungen kurz verzögert hochladen
  useEffect(() => {
    if (!userId || !ready.current) return
    if (fromRemote.current) { fromRemote.current = false; return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        await pushCollection(userId, { ...latest.current.data, extraCatalog: latest.current.extra })
        setStatus(`Synchronisiert um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`)
      } catch (e) {
        setStatus('Änderung konnte nicht hochgeladen werden. Sie wird beim nächsten Mal übertragen.')
      }
    }, 1500)
    return () => clearTimeout(timer.current)
  }, [data.updatedAt, extra, userId])

  const syncPhoto = async (id, url) => {
    if (!userId) return
    try {
      if (url) await pushPhoto(userId, id, url); else await deleteRemotePhoto(userId, id)
    } catch (e) { /* wird beim nächsten Abgleich nachgeholt */ }
  }

  return { available: syncAvailable, session, status, syncPhoto }
}
