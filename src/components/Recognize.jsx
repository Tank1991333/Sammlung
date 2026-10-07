import { useEffect, useRef, useState } from 'react'
import { COUNTRIES, flag } from '../data/catalog.js'
import { processImage } from '../photos.js'
import CoinFace from './CoinFace.jsx'

// Prüft einmal, ob die Erkennung auf dem Server eingerichtet ist
export function useRecognitionAvailable() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    fetch('/api/identify')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setOk(!!j?.configured))
      .catch(() => setOk(false))
  }, [])
  return ok
}

export default function Recognize({ coins, countOf, photos, onPick }) {
  const fileRef = useRef(null)
  const [state, setState] = useState(null) // { status, photo, candidates, note, error }

  const start = () => fileRef.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setState({ status: 'loading' })
    try {
      const photo = await processImage(file, 1.1, 0, 0, 512)
      const catalog = coins.map((c) => `${c.id}|${COUNTRIES[c.country]}|${c.year}|${c.motif}`).join('\n')
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photo.split(',')[1], catalog }),
      })
      if (res.status === 429) throw new Error('Das kostenlose Tageslimit der Erkennung ist erreicht. Bitte wähle die Münze heute manuell aus.')
      if (!res.ok) throw new Error('Die Erkennung ist gerade nicht erreichbar. Bitte wähle die Münze manuell aus.')
      const j = await res.json()
      const byId = new Map(coins.map((c) => [c.id, c]))
      const candidates = (j.candidates || []).map((x) => byId.get(x.id)).filter(Boolean).slice(0, 3)
      setState({ status: 'done', photo, candidates, note: j.note || '' })
    } catch (err) {
      setState({ status: 'error', error: err.message || 'Die Erkennung hat nicht funktioniert.' })
    }
  }

  const close = () => setState(null)

  return (
    <>
      <button className="ghost recog-btn" onClick={start} aria-label="Münze per Foto erkennen">📷 Erkennen</button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

      {state && (
        <div className="sheet-backdrop" onClick={state.status === 'loading' ? undefined : close}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="recog-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="recog-title">Münze erkennen</h2>
            {state.status === 'loading' && <p role="status">Foto wird ausgewertet …</p>}
            {state.status === 'error' && <p className="msg" role="alert">{state.error}</p>}
            {state.status === 'done' && (
              <>
                {state.note && <p className="hint">{state.note}</p>}
                {state.candidates.length === 0 ? (
                  <p className="msg">Keine passende Münze gefunden. Versuche ein schärferes Foto von oben oder wähle die Münze manuell aus.</p>
                ) : (
                  <>
                    <p className="field-label">Welche Münze ist es? Tippe auf den passenden Vorschlag.</p>
                    <div className="recog-list">
                      {state.candidates.map((c) => (
                        <button key={c.id} className="recog-item" onClick={() => { onPick(c.id, state.photo); close() }}>
                          <CoinFace coin={c} count={countOf(c)} photo={photos[c.id]} />
                          <span>
                            <strong>{c.motif}</strong>
                            <small>{flag(c.country)} {COUNTRIES[c.country]}, {c.year}{countOf(c) ? `, schon ${countOf(c)}× vorhanden` : ''}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            {state.status !== 'loading' && <button className="ghost" onClick={close}>Schließen</button>}
          </div>
        </div>
      )}
    </>
  )
}
