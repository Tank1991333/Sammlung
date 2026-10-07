import { useEffect, useRef, useState } from 'react'
import { COUNTRIES, TYPE_LABEL, flag } from '../data/catalog.js'
import { processImage } from '../photos.js'
import { MINTS, MINT_NAMES, QUALITIES, RARE_FROM, fmt } from '../lib/store.js'
import { priceLinks } from '../lib/share.js'
import CoinFace from './CoinFace.jsx'

function Stepper({ label, value, onChange }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label}: eine weniger`} disabled={value === 0}>−</button>
      <span>{label}: {value}</span>
      <button onClick={() => onChange(value + 1)} aria-label={`${label}: eine mehr`}>+</button>
    </div>
  )
}

export default function CoinSheet({
  coin, data, count, value, photo, suggestedPhoto,
  onPhoto, onOwned, onValue, onNote, onWish, onQuality, onRemove, onClose,
}) {
  const fileRef = useRef(null)
  const closeRef = useRef(null)
  const frameRef = useRef(null)
  const pointers = useRef(new Map())
  const pinch = useRef(null)
  const closeFn = useRef(onClose)
  closeFn.current = onClose

  const [valStr, setValStr] = useState(String(value).replace('.', ','))
  const [pending, setPending] = useState(null) // { file, preview }
  const [zoom, setZoom] = useState(1.3)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [photoErr, setPhotoErr] = useState('')

  const isDE = coin.country === 'DE'
  const mintCounts = MINTS.map((m) => data.owned[`${coin.id}|${m}`] || 0)
  const showMints = isDE && (data.settings.mints || mintCounts.some(Boolean))
  const base = data.owned[coin.id] || 0
  const qualities = data.quality[coin.id] || []
  const rare = value >= RARE_FROM

  useEffect(() => { setValStr(String(value).replace('.', ',')) }, [coin.id, value])
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

  // Zuschnitt: verschieben und zoomen
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
      onPhoto(await processImage(pending.file, zoom, pan.x, pan.y))
    } catch {
      setPhotoErr('Das Foto konnte nicht gelesen werden. Versuche es mit einem anderen Bild.')
    }
    cancelPending()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span key={count > 0 ? 'on' : 'off'} className="sheet-coin"><CoinFace coin={coin} count={count} photo={photo} big /></span>
          <div>
            <p className="sheet-meta">{flag(coin.country)} {COUNTRIES[coin.country]}, {coin.year}</p>
            <h2 id="sheet-title">{coin.motif}</h2>
            <p className="sheet-type">
              {TYPE_LABEL[coin.type]}{coin.joint ? ', Gemeinschaftsausgabe' : ''}{coin.custom ? ', selbst hinzugefügt' : ''}
            </p>
            {rare && <p className="sheet-rare">★ Selten: kleine Auflage oder hoher Sammlerwert</p>}
          </div>
        </div>

        {suggestedPhoto && !photo && (
          <div className="msg">
            <p>Das Foto aus der Erkennung als Münzfoto verwenden?</p>
            <button className="primary" onClick={() => onPhoto(suggestedPhoto)}>Foto übernehmen</button>
          </div>
        )}

        {pending ? (
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
        ) : (
          <div className="photo-actions">
            <button className="ghost" onClick={() => fileRef.current?.click()}>{photo ? 'Foto ändern' : 'Münze fotografieren'}</button>
            {photo && <button className="link" onClick={() => onPhoto(null)}>Foto entfernen</button>}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />
          </div>
        )}
        {photoErr && <p className="msg" role="alert">{photoErr}</p>}

        {showMints ? (
          <div className="mints">
            <p className="field-label">Stückzahl nach Prägestätte</p>
            {MINTS.map((m, i) => (
              <Stepper key={m} label={`${m} (${MINT_NAMES[m]})`} value={mintCounts[i]}
                onChange={(n) => onOwned(`${coin.id}|${m}`, n)} />
            ))}
            <Stepper label="Ohne Angabe" value={base} onChange={(n) => onOwned(coin.id, n)} />
          </div>
        ) : count === 0 ? (
          <button className="primary" onClick={() => onOwned(coin.id, 1)}>Habe ich</button>
        ) : (
          <Stepper label="Stück in der Sammlung" value={base} onChange={(n) => onOwned(coin.id, n)} />
        )}

        <button className={`wish-toggle${data.wish[coin.id] ? ' is-active' : ''}`} aria-pressed={!!data.wish[coin.id]} onClick={onWish}>
          {data.wish[coin.id] ? '♥ Auf der Wunschliste' : '♡ Auf die Wunschliste'}
        </button>

        <div className="field">
          <span className="field-label">Erhaltungszustand (mehrere möglich)</span>
          <div className="chips chips--wrap" role="group" aria-label="Erhaltungszustand">
            {QUALITIES.map(([key, label]) => (
              <button key={key} className={qualities.includes(key) ? 'is-active' : ''} aria-pressed={qualities.includes(key)}
                onClick={() => onQuality(key)}>{label}</button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Richtwert pro Stück in €</span>
          <input inputMode="decimal" value={valStr} onChange={(e) => setValStr(e.target.value)} onBlur={commitValue}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        </label>
        {value !== coin.value && (
          <button className="link" onClick={() => onValue(null)}>Auf Katalogwert {fmt(coin.value)} zurücksetzen</button>
        )}

        <div className="field">
          <span className="field-label">Aktuellen Marktpreis prüfen</span>
          <div className="price-links">
            {priceLinks(coin).map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Notiz, z. B. Fundort oder Kaufpreis</span>
          <textarea rows={2} value={data.notes[coin.id] || ''} onChange={(e) => onNote(e.target.value)} />
        </label>

        <div className="sheet-actions">
          {coin.custom && <button className="danger" onClick={() => { if (confirm('Diese Münze aus dem Katalog löschen?')) onRemove() }}>Münze löschen</button>}
          <button ref={closeRef} className="ghost" onClick={onClose}>Fertig</button>
        </div>
      </div>
    </div>
  )
}
