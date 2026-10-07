import { useEffect, useMemo, useRef, useState } from 'react'
import { CATALOG, CATALOG_STAND, COUNTRIES, TYPE_LABEL, flag } from './data/catalog.js'
import { loadPhotos, savePhoto, deletePhoto, clearPhotos, processImage } from './photos.js'

const STORE_KEY = 'zwei-euro-album-v1'
const CATALOG_KEY = 'zwei-euro-katalog-v1'
const EMPTY = { owned: {}, values: {}, notes: {}, custom: [] }

// Zusätzlich geladener Katalog (Online-Update oder Katalogdatei). Ergänzt den eingebauten Katalog.
function loadExtraCatalog() {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* kein Zusatzkatalog */ }
  return { stand: null, coins: [] }
}

const validCoin = (c) =>
  c && typeof c.id === 'string' && COUNTRIES[c.country] && typeof c.motif === 'string' &&
  (c.type === 'national' || c.type === 'gedenk') && Number.isFinite(Number(c.sortYear))

function normalizeCatalog(json) {
  const list = Array.isArray(json) ? json : json?.coins
  if (!Array.isArray(list)) throw new Error('kein Katalog')
  const coins = list.filter(validCoin).map((c) => ({
    id: c.id, country: c.country, type: c.type, motif: c.motif,
    year: String(c.year ?? c.sortYear), sortYear: Number(c.sortYear),
    value: Number(c.value) || 2, joint: !!c.joint,
  }))
  if (!coins.length) throw new Error('leer')
  return { stand: typeof json?.stand === 'string' ? json.stand : null, coins }
}

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '–')

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch (e) { /* leer starten */ }
  return EMPTY
}

const fmt = (n) =>
  n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 })

const sortCoins = (a, b) =>
  (a.type === b.type ? 0 : a.type === 'national' ? -1 : 1) ||
  a.sortYear - b.sortYear ||
  a.motif.localeCompare(b.motif, 'de')

const BUCKETS = [
  { label: 'Nennwert (2 €)', test: (v) => v <= 2 },
  { label: 'über 2 bis 5 €', test: (v) => v > 2 && v <= 5 },
  { label: 'über 5 bis 20 €', test: (v) => v > 5 && v <= 20 },
  { label: 'über 20 bis 100 €', test: (v) => v > 20 && v <= 100 },
  { label: 'über 100 €', test: (v) => v > 100 },
]

export default function App() {
  const [data, setData] = useState(loadState)
  const [tab, setTab] = useState('album')
  const [openId, setOpenId] = useState(null)
  const [photos, setPhotos] = useState({})
  const [extra, setExtra] = useState(loadExtraCatalog)

  useEffect(() => { loadPhotos().then(setPhotos).catch(() => {}) }, [])

  const setPhoto = async (id, dataUrl) => {
    if (dataUrl) await savePhoto(id, dataUrl); else await deletePhoto(id)
    setPhotos((p) => { const n = { ...p }; if (dataUrl) n[id] = dataUrl; else delete n[id]; return n })
  }
  const replaceAllPhotos = async (next) => {
    await clearPhotos()
    for (const [id, url] of Object.entries(next)) await savePhoto(id, url)
    setPhotos(next)
  }

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch (e) { /* Speicher voll oder gesperrt */ }
  }, [data])

  const coins = useMemo(() => {
    const byId = new Map(CATALOG.map((c) => [c.id, c]))
    for (const c of extra.coins) byId.set(c.id, { ...byId.get(c.id), ...c })
    return [...byId.values(), ...data.custom]
  }, [extra, data.custom])

  const catalogStand = [CATALOG_STAND, extra.stand].filter(Boolean).sort().pop()

  // Neuen Katalog übernehmen: nur ergänzen, nie Sammlungsdaten verändern
  const applyCatalog = (incoming) => {
    const known = new Set(coins.map((c) => c.id))
    const added = incoming.coins.filter((c) => !known.has(c.id))
    const byId = new Map(extra.coins.map((c) => [c.id, c]))
    for (const c of incoming.coins) byId.set(c.id, c)
    const next = { stand: [extra.stand, incoming.stand].filter(Boolean).sort().pop() || null, coins: [...byId.values()] }
    try { localStorage.setItem(CATALOG_KEY, JSON.stringify(next)) } catch (e) { /* Speicher voll */ }
    setExtra(next)
    return added
  }
  const countOf = (c) => data.owned[c.id] || 0
  const valueOf = (c) => data.values[c.id] ?? c.value

  const setCount = (id, n) => setData((d) => {
    const owned = { ...d.owned }
    if (n > 0) owned[id] = n; else delete owned[id]
    return { ...d, owned }
  })
  const setValue = (id, v) => setData((d) => {
    const values = { ...d.values }
    if (v === null) delete values[id]; else values[id] = v
    return { ...d, values }
  })
  const setNote = (id, text) => setData((d) => {
    const notes = { ...d.notes }
    if (text) notes[id] = text; else delete notes[id]
    return { ...d, notes }
  })
  const addCustom = (coin) => setData((d) => ({ ...d, custom: [...d.custom, coin] }))
  const removeCustom = (id) => { setPhoto(id, null); setData((d) => {
    const strip = (obj) => { const o = { ...obj }; delete o[id]; return o }
    return { owned: strip(d.owned), values: strip(d.values), notes: strip(d.notes), custom: d.custom.filter((c) => c.id !== id) }
  }) }

  let unique = 0
  let total = 0
  let value = 0
  for (const c of coins) {
    const n = countOf(c)
    if (n) { unique++; total += n; value += n * valueOf(c) }
  }

  const open = coins.find((c) => c.id === openId)

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
        {tab === 'album' && <Album coins={coins} countOf={countOf} photos={photos} onOpen={setOpenId} />}
        {tab === 'stats' && (
          <Stats coins={coins} countOf={countOf} valueOf={valueOf}
            unique={unique} total={total} value={value} onOpen={setOpenId} />
        )}
        {tab === 'more' && <More data={data} setData={setData} photos={photos} replaceAllPhotos={replaceAllPhotos} onAdd={addCustom} goAlbum={() => setTab('album')} catalogCount={coins.length - data.custom.length} catalogStand={catalogStand} applyCatalog={applyCatalog} />}
      </main>

      <nav className="tabs" aria-label="Bereiche">
        {[['album', 'Album'], ['stats', 'Statistik'], ['more', 'Mehr']].map(([key, label]) => (
          <button key={key} className={tab === key ? 'is-active' : ''} aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      {open && (
        <CoinSheet
          coin={open}
          count={countOf(open)}
          value={valueOf(open)}
          note={data.notes[open.id] || ''}
          photo={photos[open.id]}
          onPhoto={(url) => { setPhoto(open.id, url); if (url && !countOf(open)) setCount(open.id, 1) }}
          onCount={(n) => setCount(open.id, n)}
          onValue={(v) => setValue(open.id, v)}
          onNote={(t) => setNote(open.id, t)}
          onRemove={() => { removeCustom(open.id); setOpenId(null) }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

function CoinFace({ coin, count, big, photo }) {
  if (photo && count > 0) {
    return (
      <span className={`coin has-photo${big ? ' coin--big' : ''}`} aria-hidden="true">
        <img src={photo} alt="" />
      </span>
    )
  }
  return (
    <span className={`coin ${count > 0 ? 'is-owned' : 'is-missing'}${big ? ' coin--big' : ''}`} aria-hidden="true">
      <span className="coin-core">
        <span className="coin-flag">{flag(coin.country)}</span>
        <span className="coin-year">{coin.sortYear}</span>
      </span>
    </span>
  )
}

function Album({ coins, countOf, photos, onOpen }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('alle')
  const [country, setCountry] = useState('')

  const q = query.trim().toLowerCase()
  const groups = new Map()
  for (const c of coins) {
    const n = countOf(c)
    if (filter === 'habe' && !n) continue
    if (filter === 'fehlt' && n) continue
    if (filter === 'doppelt' && n < 2) continue
    if (country && c.country !== country) continue
    if (q && !`${c.motif} ${COUNTRIES[c.country]} ${c.year}`.toLowerCase().includes(q)) continue
    if (!groups.has(c.country)) groups.set(c.country, [])
    groups.get(c.country).push(c)
  }
  const sorted = [...groups.entries()].sort((a, b) => COUNTRIES[a[0]].localeCompare(COUNTRIES[b[0]], 'de'))

  const countryTotals = {}
  for (const c of coins) {
    const t = (countryTotals[c.country] ||= { all: 0, have: 0 })
    t.all++
    if (countOf(c)) t.have++
  }

  return (
    <section>
      <div className="filters">
        <input type="search" placeholder="Motiv, Land oder Jahr suchen" value={query}
          onChange={(e) => setQuery(e.target.value)} aria-label="Suchen" />
        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Land">
          <option value="">Alle Länder</option>
          {Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1], 'de')).map(([code, name]) => (
            <option key={code} value={code}>{flag(code)} {name}</option>
          ))}
        </select>
        <div className="chips" role="group" aria-label="Anzeigen">
          {[['alle', 'Alle'], ['habe', 'Habe ich'], ['fehlt', 'Fehlen'], ['doppelt', 'Doppelte']].map(([key, label]) => (
            <button key={key} className={filter === key ? 'is-active' : ''} aria-pressed={filter === key}
              onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
      </div>

      {sorted.length === 0 && (
        <p className="empty">
          {filter === 'habe' ? 'Noch keine Münze markiert. Tippe im Album auf eine Münze, die du hast.'
            : filter === 'doppelt' ? 'Keine doppelten Münzen. Erhöhe in einer Münze die Stückzahl, um sie hier zu sehen.'
            : 'Keine Münze passt zur Suche. Ändere den Suchbegriff oder füge die Münze unter „Mehr“ hinzu.'}
        </p>
      )}

      {sorted.map(([code, items]) => {
        const t = countryTotals[code]
        return (
          <div className="country" key={code}>
            <div className="country-head">
              <h2><span className="flag">{flag(code)}</span>{COUNTRIES[code]}</h2>
              <span className="country-count">{t.have} / {t.all}</span>
            </div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={t.all} aria-valuenow={t.have}
              aria-label={`${COUNTRIES[code]}: ${t.have} von ${t.all}`}>
              <span style={{ width: `${(t.have / t.all) * 100}%` }} />
            </div>
            <div className="slots">
              {items.sort(sortCoins).map((c) => {
                const n = countOf(c)
                return (
                  <button key={c.id} className="slot" onClick={() => onOpen(c.id)}
                    aria-label={`${c.year}, ${c.motif}: ${n ? `${n} Stück vorhanden` : 'fehlt'}`}>
                    <span className="slot-coin">
                      <CoinFace coin={c} count={n} photo={photos[c.id]} />
                      {n > 1 && <span className="badge">×{n}</span>}
                    </span>
                    <span className="slot-label">{c.motif}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function CoinSheet({ coin, count, value, note, photo, onPhoto, onCount, onValue, onNote, onRemove, onClose }) {
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null) // { file, preview }
  const [zoom, setZoom] = useState(1.3)
  const [pan, setPan] = useState({ x: 0, y: 0 }) // Verschiebung als Anteil der Kreisgröße
  const [photoErr, setPhotoErr] = useState('')
  const frameRef = useRef(null)
  const pointers = useRef(new Map())
  const pinch = useRef(null)

  // Verschiebung so begrenzen, dass der Kreis immer mit Foto gefüllt bleibt
  const clampPan = (p, z) => {
    const max = (1 - 1 / z) / 2
    return { x: Math.max(-max, Math.min(max, p.x)), y: Math.max(-max, Math.min(max, p.y)) }
  }
  const changeZoom = (z) => {
    const nz = Math.max(1, Math.min(4, z))
    setZoom(nz)
    setPan((p) => clampPan(p, nz))
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }
  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const now = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, now)
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current.dist > 0) changeZoom(pinch.current.zoom * (dist / pinch.current.dist))
      return
    }
    const size = frameRef.current?.clientWidth || 1
    setPan((p) => clampPan({ x: p.x + (now.x - prev.x) / size, y: p.y + (now.y - prev.y) / size }, zoom))
  }
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const pickFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoErr('')
    setZoom(1.3)
    setPan({ x: 0, y: 0 })
    setPending({ file, preview: URL.createObjectURL(file) })
  }
  const cancelPending = () => { if (pending) URL.revokeObjectURL(pending.preview); setPending(null) }
  const acceptPending = async () => {
    try {
      const url = await processImage(pending.file, zoom, pan.x, pan.y)
      onPhoto(url)
    } catch {
      setPhotoErr('Das Foto konnte nicht gelesen werden. Versuche es mit einem anderen Bild.')
    }
    cancelPending()
  }

  const [valStr, setValStr] = useState(String(value).replace('.', ','))
  const closeRef = useRef(null)

  useEffect(() => { setValStr(String(value).replace('.', ',')) }, [coin.id, value])
  const closeFn = useRef(onClose)
  closeFn.current = onClose
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeFn.current() }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus({ preventScroll: true })
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const commitValue = () => {
    const v = parseFloat(valStr.replace(',', '.'))
    if (valStr.trim() === '' || Number.isNaN(v) || v < 0) { onValue(null); return }
    onValue(v === coin.value ? null : v)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span key={count > 0 ? 'on' : 'off'} className="sheet-coin"><CoinFace coin={coin} count={count} photo={photo} big /></span>
          <div>
            <p className="sheet-meta">{flag(coin.country)} {COUNTRIES[coin.country]}, {coin.year}</p>
            <h2 id="sheet-title">{coin.motif}</h2>
            <p className="sheet-type">{TYPE_LABEL[coin.type]}{coin.joint ? ', Gemeinschaftsausgabe' : ''}{coin.custom ? ', selbst hinzugefügt' : ''}</p>
          </div>
        </div>

        {pending && (
          <div className="crop">
            <div className="crop-frame" ref={frameRef}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove}
              onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
              <img src={pending.preview} alt="Vorschau des Münzfotos" draggable={false}
                style={{ transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${zoom})` }} />
            </div>
            <label className="field">
              <span>Foto mit dem Finger verschieben, mit dem Regler oder zwei Fingern zoomen, bis die Münze den Kreis füllt</span>
              <input type="range" min="1" max="4" step="0.05" value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} />
            </label>
            <div className="sheet-actions">
              <button className="ghost" onClick={cancelPending}>Abbrechen</button>
              <button className="primary" onClick={acceptPending}>Foto übernehmen</button>
            </div>
          </div>
        )}

        {!pending && (
          <div className="photo-actions">
            <button className="ghost" onClick={() => fileRef.current?.click()}>
              {photo ? 'Foto ändern' : 'Münze fotografieren'}
            </button>
            {photo && <button className="link" onClick={() => onPhoto(null)}>Foto entfernen</button>}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />
          </div>
        )}
        {photoErr && <p className="msg" role="alert">{photoErr}</p>}

        {count === 0 ? (
          <button className="primary" onClick={() => onCount(1)}>Habe ich</button>
        ) : (
          <div className="stepper">
            <button onClick={() => onCount(count - 1)} aria-label="Eine weniger">−</button>
            <span>{count} Stück in der Sammlung</span>
            <button onClick={() => onCount(count + 1)} aria-label="Eine mehr">+</button>
          </div>
        )}

        <label className="field">
          <span>Richtwert pro Stück in €</span>
          <input inputMode="decimal" value={valStr} onChange={(e) => setValStr(e.target.value)} onBlur={commitValue}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        </label>
        {value !== coin.value && (
          <button className="link" onClick={() => onValue(null)}>Auf Katalogwert {fmt(coin.value)} zurücksetzen</button>
        )}

        <label className="field">
          <span>Notiz, z. B. Prägestätte oder Zustand</span>
          <textarea rows={2} value={note} onChange={(e) => onNote(e.target.value)} />
        </label>

        <div className="sheet-actions">
          {coin.custom && <button className="danger" onClick={() => { if (confirm('Diese Münze aus dem Katalog löschen?')) onRemove() }}>Münze löschen</button>}
          <button ref={closeRef} className="ghost" onClick={onClose}>Fertig</button>
        </div>
      </div>
    </div>
  )
}

function Stats({ coins, countOf, valueOf, unique, total, value, onOpen }) {
  const buckets = BUCKETS.map((b) => ({ ...b, count: 0, sum: 0 }))
  const owned = []
  const perCountry = {}
  for (const c of coins) {
    const n = countOf(c)
    const p = (perCountry[c.country] ||= { all: 0, have: 0 })
    p.all++
    if (!n) continue
    p.have++
    const v = valueOf(c)
    owned.push({ c, n, v })
    const b = buckets.find((x) => x.test(v))
    b.count += n
    b.sum += n * v
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count))
  const top = owned.sort((a, b) => b.v - a.v).slice(0, 5)
  const doubles = owned.reduce((s, o) => s + (o.n - 1), 0)
  const pct = coins.length ? Math.round((unique / coins.length) * 100) : 0

  return (
    <section className="stats">
      <div className="figures">
        <div><strong>{pct} %</strong><span>des Katalogs gesammelt</span></div>
        <div><strong>{total}</strong><span>Münzen insgesamt</span></div>
        <div><strong>{doubles}</strong><span>Doppelte zum Tauschen</span></div>
        <div><strong>{fmt(value)}</strong><span>geschätzter Gesamtwert</span></div>
      </div>

      <h2>Münzen nach Wert</h2>
      <div className="bars">
        {buckets.map((b) => (
          <div className="bar-row" key={b.label}>
            <span className="bar-label">{b.label}</span>
            <span className="bar"><span style={{ width: `${(b.count / maxBucket) * 100}%` }} /></span>
            <span className="bar-num">{b.count} Stk.<small>{fmt(b.sum)}</small></span>
          </div>
        ))}
      </div>

      {top.length > 0 && (
        <>
          <h2>Wertvollste Münzen</h2>
          <ol className="top-list">
            {top.map(({ c, n, v }) => (
              <li key={c.id}>
                <button onClick={() => onOpen(c.id)}>
                  <span>{flag(c.country)} {c.motif} <small>{c.year}</small></span>
                  <span>{fmt(v)}{n > 1 ? ` ×${n}` : ''}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}

      <h2>Fortschritt nach Land</h2>
      <div className="bars">
        {Object.entries(perCountry).sort((a, b) => b[1].have / b[1].all - a[1].have / a[1].all || COUNTRIES[a[0]].localeCompare(COUNTRIES[b[0]], 'de')).map(([code, p]) => (
          <div className="bar-row" key={code}>
            <span className="bar-label">{flag(code)} {COUNTRIES[code]}</span>
            <span className="bar"><span style={{ width: `${(p.have / p.all) * 100}%` }} /></span>
            <span className="bar-num">{p.have} / {p.all}</span>
          </div>
        ))}
      </div>

      <p className="hint">Die Richtwerte sind grobe Schätzungen für Münzen im Umlaufzustand. Den Wert jeder Münze kannst du in der Münze selbst anpassen.</p>
    </section>
  )
}

function More({ data, setData, photos, replaceAllPhotos, onAdd, goAlbum, catalogCount, catalogStand, applyCatalog }) {
  const [busy, setBusy] = useState(false)
  const catFileRef = useRef(null)

  const report = (added) => {
    if (!added.length) { setMsg('Der Katalog ist aktuell. Es wurden keine neuen Münzen gefunden.'); return }
    const names = added.slice(0, 3).map((c) => `${flag(c.country)} ${c.motif}`).join(', ')
    setMsg(`${added.length} neue ${added.length === 1 ? 'Münze' : 'Münzen'} hinzugefügt: ${names}${added.length > 3 ? ' …' : ''}. Deine Sammlung ist unverändert.`)
  }

  const updateOnline = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/catalog.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      report(applyCatalog(normalizeCatalog(await res.json())))
    } catch {
      setMsg('Der Katalog konnte nicht geladen werden. Prüfe die Internetverbindung und versuche es erneut.')
    }
    setBusy(false)
  }

  const loadCatalogFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { report(applyCatalog(normalizeCatalog(JSON.parse(reader.result)))) }
      catch { setMsg('Diese Datei ist keine gültige Katalogdatei.') }
    }
    reader.readAsText(file)
  }

  const [form, setForm] = useState({ country: 'DE', type: 'gedenk', year: String(new Date().getFullYear()), motif: '', value: '2' })
  const [msg, setMsg] = useState('')
  const fileRef = useRef(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const add = (e) => {
    e.preventDefault()
    const year = parseInt(form.year, 10)
    if (!form.motif.trim() || !year) { setMsg('Bitte Jahr und Motiv angeben.'); return }
    onAdd({
      id: `custom-${Date.now()}`, country: form.country, type: form.type,
      year: String(year), sortYear: year, motif: form.motif.trim(),
      value: parseFloat(form.value.replace(',', '.')) || 2, custom: true,
    })
    setForm({ ...form, motif: '' })
    setMsg(`„${form.motif.trim()}“ wurde zum Katalog hinzugefügt.`)
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ ...data, photos })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `2euro-sammlung-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importData = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (typeof parsed.owned !== 'object') throw new Error()
        if (confirm('Die aktuelle Sammlung wird durch die Sicherung ersetzt. Fortfahren?')) {
          const { photos: importedPhotos = {}, ...rest } = parsed
          setData({ ...EMPTY, ...rest })
          replaceAllPhotos(importedPhotos)
          setMsg('Sicherung wurde geladen.')
        }
      } catch {
        setMsg('Diese Datei ist keine gültige Sicherung der Sammlung.')
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <section className="more">
      {msg && <p className="msg" role="status">{msg}</p>}

      <h2>Katalog</h2>
      <p className="hint">Stand {fmtDate(catalogStand)}, {catalogCount} Münzen. Beim Aktualisieren kommen nur neue Münzen dazu. Deine abgehakten Münzen, Fotos, Werte und Notizen bleiben immer erhalten.</p>
      <div className="stack">
        <button className="primary" onClick={updateOnline} disabled={busy}>{busy ? 'Katalog wird geladen …' : 'Katalog aktualisieren'}</button>
        <button className="ghost" onClick={() => catFileRef.current?.click()}>Katalogdatei laden</button>
        <input ref={catFileRef} type="file" accept="application/json,.json" hidden onChange={loadCatalogFile} />
      </div>

      <h2>Münze hinzufügen</h2>
      <p className="hint">Für Gedenkmünzen, die noch nicht im Katalog stehen.</p>
      <form onSubmit={add} className="form">
        <label className="field"><span>Land</span>
          <select value={form.country} onChange={set('country')}>
            {Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1], 'de')).map(([code, name]) => (
              <option key={code} value={code}>{flag(code)} {name}</option>
            ))}
          </select>
        </label>
        <div className="row">
          <label className="field"><span>Jahr</span>
            <input inputMode="numeric" value={form.year} onChange={set('year')} />
          </label>
          <label className="field"><span>Richtwert in €</span>
            <input inputMode="decimal" value={form.value} onChange={set('value')} />
          </label>
        </div>
        <label className="field"><span>Art</span>
          <select value={form.type} onChange={set('type')}>
            <option value="gedenk">Gedenkmünze</option>
            <option value="national">Nationale Seite</option>
          </select>
        </label>
        <label className="field"><span>Motiv</span>
          <input value={form.motif} onChange={set('motif')} placeholder="z. B. 100 Jahre Bauhaus" />
        </label>
        <button className="primary" type="submit">Zum Katalog hinzufügen</button>
      </form>
      {data.custom.length > 0 && (
        <button className="link" onClick={goAlbum}>{data.custom.length} selbst hinzugefügte Münzen im Album ansehen</button>
      )}

      <h2>Sicherung</h2>
      <p className="hint">Die Sammlung wird nur auf diesem Gerät im Browser gespeichert. Lade regelmäßig eine Sicherung herunter, damit nichts verloren geht, und nutze sie, um die Sammlung auf ein anderes Gerät zu übertragen. Deine Münzfotos sind in der Sicherung enthalten.</p>
      <div className="stack">
        <button className="ghost" onClick={exportData}>Sicherung herunterladen</button>
        <button className="ghost" onClick={() => fileRef.current?.click()}>Sicherung laden</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
        <button className="danger" onClick={() => { if (confirm('Wirklich die ganze Sammlung löschen? Das kann nicht rückgängig gemacht werden.')) { setData(EMPTY); replaceAllPhotos({}); setMsg('Sammlung wurde gelöscht.') } }}>Sammlung löschen</button>
      </div>
    </section>
  )
}
