import { useEffect, useMemo, useState } from 'react'
import { CATALOG_STAND } from './data/catalog.js'
import { loadPhotos, savePhoto, deletePhoto, clearPhotos } from './photos.js'
import {
  loadData, saveData, loadExtraCatalog, saveExtraCatalog, mergeCatalog,
  ownedCount, stripId, fmt,
} from './lib/store.js'
import { useSync } from './lib/useSync.js'
import Album from './components/Album.jsx'
import CoinSheet from './components/CoinSheet.jsx'
import Stats from './components/Stats.jsx'
import More from './components/More.jsx'
import PrintView from './components/PrintView.jsx'
import Recognize, { useRecognitionAvailable } from './components/Recognize.jsx'

export default function App() {
  const [data, setData] = useState(loadData)
  const [extra, setExtra] = useState(loadExtraCatalog)
  const [photos, setPhotos] = useState({})
  const [tab, setTab] = useState('album')
  const [openId, setOpenId] = useState(null)
  const [suggested, setSuggested] = useState(null) // Foto aus der Erkennung
  const [printing, setPrinting] = useState(false)
  const recognitionOk = useRecognitionAvailable()

  useEffect(() => { loadPhotos().then(setPhotos).catch(() => {}) }, [])
  useEffect(() => { saveData(data) }, [data])
  useEffect(() => { saveExtraCatalog(extra) }, [extra])

  const sync = useSync({ data, setData, extra, setExtra, photos, setPhotos })

  // Jede Änderung an der Sammlung bekommt einen Zeitstempel (für die Synchronisation)
  const update = (fn) => setData((d) => ({ ...fn(d), updatedAt: Date.now() }))

  const coins = useMemo(() => mergeCatalog(extra, data.custom), [extra, data.custom])
  const catalogStand = [CATALOG_STAND, extra.stand].filter(Boolean).sort().pop()
  const countOf = (c) => ownedCount(data.owned, c)
  const valueOf = (c) => data.values[c.id] ?? c.value

  const setOwned = (key, n) => update((d) => {
    const owned = { ...d.owned }
    if (n > 0) owned[key] = n; else delete owned[key]
    return { ...d, owned }
  })
  const setValue = (id, v) => update((d) => {
    const values = { ...d.values }
    if (v === null) delete values[id]; else values[id] = v
    return { ...d, values }
  })
  const setNote = (id, text) => update((d) => {
    const notes = { ...d.notes }
    if (text) notes[id] = text; else delete notes[id]
    return { ...d, notes }
  })
  const toggleWish = (id) => update((d) => {
    const wish = { ...d.wish }
    if (wish[id]) delete wish[id]; else wish[id] = true
    return { ...d, wish }
  })
  const toggleQuality = (id, key) => update((d) => {
    const cur = d.quality[id] || []
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    const quality = { ...d.quality }
    if (next.length) quality[id] = next; else delete quality[id]
    return { ...d, quality }
  })
  const setPhoto = async (id, url) => {
    if (url) await savePhoto(id, url); else await deletePhoto(id)
    setPhotos((p) => { const n = { ...p }; if (url) n[id] = url; else delete n[id]; return n })
    sync.syncPhoto(id, url)
  }
  const replaceAllPhotos = async (next) => {
    await clearPhotos()
    for (const [id, url] of Object.entries(next)) { await savePhoto(id, url); sync.syncPhoto(id, url) }
    setPhotos(next)
  }
  const addCustom = (coin) => update((d) => ({ ...d, custom: [...d.custom, coin] }))
  const removeCustom = (id) => {
    setPhoto(id, null)
    update((d) => ({
      ...d,
      owned: stripId(d.owned, id), values: stripId(d.values, id), notes: stripId(d.notes, id),
      wish: stripId(d.wish, id), quality: stripId(d.quality, id),
      custom: d.custom.filter((c) => c.id !== id),
    }))
  }

  // Neuen Katalog übernehmen: nur ergänzen, nie Sammlungsdaten verändern
  const applyCatalog = (incoming) => {
    const known = new Set(coins.map((c) => c.id))
    const added = incoming.coins.filter((c) => !known.has(c.id))
    const byId = new Map(extra.coins.map((c) => [c.id, c]))
    for (const c of incoming.coins) byId.set(c.id, c)
    setExtra({ stand: [extra.stand, incoming.stand].filter(Boolean).sort().pop() || null, coins: [...byId.values()] })
    return added
  }

  let unique = 0, value = 0
  for (const c of coins) {
    const n = countOf(c)
    if (n) { unique++; value += n * valueOf(c) }
  }

  const open = coins.find((c) => c.id === openId)
  const closeSheet = () => { setOpenId(null); setSuggested(null) }

  if (printing) {
    return <PrintView coins={coins} data={data} countOf={countOf} valueOf={valueOf} photos={photos} onClose={() => setPrinting(false)} />
  }

  return (
    <div className="app">
      <header className="top">
        <h1>2-Euro-Album</h1>
        <div className="top-stats">
          <p><strong>{unique}</strong> von {coins.length} Münzen</p>
          <p>Wert ca. <strong>{fmt(value)}</strong></p>
        </div>
      </header>

      <main>
        {tab === 'album' && (
          <Album coins={coins} data={data} countOf={countOf} valueOf={valueOf} photos={photos} onOpen={setOpenId}
            recognizeButton={recognitionOk ? (
              <Recognize coins={coins} countOf={countOf} photos={photos}
                onPick={(id, photo) => { setOpenId(id); setSuggested(photo) }} />
            ) : null} />
        )}
        {tab === 'stats' && <Stats coins={coins} data={data} countOf={countOf} valueOf={valueOf} onOpen={setOpenId} />}
        {tab === 'more' && (
          <More data={data} update={update} replaceData={setData} photos={photos} replaceAllPhotos={replaceAllPhotos}
            onAdd={addCustom} goAlbum={() => setTab('album')} coins={coins} countOf={countOf}
            catalogCount={coins.length - data.custom.length} catalogStand={catalogStand} applyCatalog={applyCatalog}
            onPrint={() => { setPrinting(true); window.scrollTo(0, 0) }} sync={sync} recognitionOk={recognitionOk} />
        )}
      </main>

      <nav className="tabs" aria-label="Bereiche">
        {[['album', 'Album'], ['stats', 'Statistik'], ['more', 'Mehr']].map(([key, label]) => (
          <button key={key} className={tab === key ? 'is-active' : ''} aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      {open && (
        <CoinSheet
          key={open.id}
          coin={open}
          data={data}
          count={countOf(open)}
          value={valueOf(open)}
          photo={photos[open.id]}
          suggestedPhoto={suggested}
          onPhoto={(url) => { setPhoto(open.id, url); if (url && !countOf(open)) setOwned(open.id, 1); if (url === suggested) setSuggested(null) }}
          onOwned={setOwned}
          onValue={(v) => setValue(open.id, v)}
          onNote={(t) => setNote(open.id, t)}
          onWish={() => toggleWish(open.id)}
          onQuality={(k) => toggleQuality(open.id, k)}
          onRemove={() => { removeCustom(open.id); closeSheet() }}
          onClose={closeSheet}
        />
      )}
    </div>
  )
}
