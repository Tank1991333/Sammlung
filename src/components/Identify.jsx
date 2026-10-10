import { useState } from 'react'
import { COUNTRIES, flag } from '../data/catalog.js'
import { INSCRIPTIONS, SCRIPTS } from '../data/inscriptions.js'
import { byCountryName, sortCoins } from '../lib/store.js'
import CoinFace from './CoinFace.jsx'

const norm = (s) => s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, ' ')
const NORM_INSCRIPTIONS = Object.entries(INSCRIPTIONS).map(([code, list]) => [code, list.map(norm)])

// Gilt die Münze für dieses Jahr? Gedenkmünzen: genau das Jahr. Nationalseiten: Zeitraum.
function matchesYear(c, y) {
  if (c.type !== 'national') return c.sortYear === y
  const nums = String(c.year).match(/\d{4}/g)?.map(Number) || [c.sortYear]
  const from = nums[0]
  const to = /^ab/i.test(c.year) || nums.length === 1 ? 9999 : nums[1]
  return y >= from && y <= to
}

function countriesFromText(text) {
  const t = norm(text)
  const tokens = t.split(/\s+/).filter(Boolean)
  const hits = new Set()
  for (const [code, list] of NORM_INSCRIPTIONS) {
    for (const ins of list) {
      if (ins.length <= 3) { if (tokens.includes(ins)) hits.add(code) }
      else if (t.includes(ins) || tokens.some((tok) => tok.length >= 4 && ins.includes(tok))) hits.add(code)
    }
  }
  return hits
}

export default function Identify({ coins, countOf, photos, onPick }) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState('')
  const [text, setText] = useState('')
  const [script, setScript] = useState(null)
  const [country, setCountry] = useState('')

  const reset = () => { setYear(''); setText(''); setScript(null); setCountry('') }
  const close = () => { setOpen(false); reset() }

  const y = /^\d{4}$/.test(year) ? Number(year) : null
  const hasInput = y || text.trim() || script || country

  let results = []
  let hint = ''
  if (hasInput) {
    let pool = y ? coins.filter((c) => matchesYear(c, y)) : coins
    const fromText = text.trim() ? countriesFromText(text) : new Set()
    const countries = new Set([...fromText, ...(script ? SCRIPTS[script].countries : []), ...(country ? [country] : [])])
    if (countries.size) pool = pool.filter((c) => countries.has(c.country))

    const words = norm(text).split(/\s+/).filter((w) => w.length >= 3)
    const score = (c) => words.filter((w) => norm(c.motif).includes(w)).length
    const anyMotif = words.length && pool.some((c) => score(c) > 0)
    if (anyMotif) pool = pool.filter((c) => score(c) > 0)

    if (text.trim() && !fromText.size && !anyMotif) {
      hint = 'Diese Aufschrift kenne ich nicht. Unten siehst du alle Münzen, die zu den übrigen Angaben passen.'
    }
    if (!y && !countries.size && !anyMotif) pool = []

    results = pool
      .sort((a, b) => score(b) - score(a) || byCountryName(a.country, b.country) || sortCoins(a, b))
      .slice(0, 60)
  }

  return (
    <>
      <button className="ghost recog-btn" onClick={() => setOpen(true)} aria-label="Unbekannte Münze bestimmen">🔍 Bestimmen</button>

      {open && (
        <div className="sheet-backdrop" onClick={close}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="identify-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="identify-title">Münze bestimmen</h2>
            <p className="hint">Schau auf die Seite mit dem Ländermotiv, nicht auf die Seite mit der großen 2. Trage ein, was du lesen kannst. Die Liste unten wird sofort kleiner.</p>

            <div className="row">
              <label className="field">
                <span>Jahr auf der Münze</span>
                <input inputMode="numeric" maxLength={4} placeholder="z. B. 2019" value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} />
              </label>
              <label className="field">
                <span>Land (falls bekannt)</span>
                <select value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">Weiß nicht</option>
                  {Object.keys(COUNTRIES).sort(byCountryName).map((code) => (
                    <option key={code} value={code}>{flag(code)} {COUNTRIES[code]}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Was steht sonst drauf? Ein Wort oder Kürzel genügt</span>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. EIRE, RF, Dante, Leonardo" />
            </label>

            <div className="chips chips--wrap" role="group" aria-label="Schrift">
              {SCRIPTS.map((s, i) => (
                <button key={s.label} className={script === i ? 'is-active' : ''} aria-pressed={script === i}
                  onClick={() => setScript(script === i ? null : i)}>{s.label}</button>
              ))}
            </div>

            {!hasInput && (
              <p className="hint">Tipp: Das Jahr findest du fast immer auf der Motivseite. Länder erkennst du oft am Namen oder Kürzel, zum Beispiel D für Deutschland, RF für Frankreich, RI für Italien oder EIRE für Irland.</p>
            )}
            {hint && <p className="msg">{hint}</p>}

            {hasInput && (
              <>
                <p className="field-label" role="status">
                  {results.length === 0 ? 'Keine passende Münze gefunden.' : results.length === 1 ? '1 passende Münze' : `${results.length === 60 ? 'Mindestens 60' : results.length} passende Münzen`}
                </p>
                {y && (
                  <a className="link" href={`https://zwei-euro.com/en/identify-coin/?jahr=${y}`} target="_blank" rel="noopener noreferrer">
                    Bilder aller 2-Euro-Münzen von {y} ansehen ↗
                  </a>
                )}
                <div className="recog-list">
                  {results.map((c) => (
                    <button key={c.id} className="recog-item" onClick={() => { onPick(c.id); close() }}>
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

            <div className="sheet-actions">
              {hasInput && <button className="link" onClick={reset}>Neu beginnen</button>}
              <button className="ghost" onClick={close}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
