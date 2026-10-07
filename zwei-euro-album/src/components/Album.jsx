import { useState } from 'react'
import { COUNTRIES, flag } from '../data/catalog.js'
import { MINTS, RARE_FROM, byCountryName, mintsOwned, sortCoins } from '../lib/store.js'
import CoinFace from './CoinFace.jsx'

const FILTERS = [
  ['alle', 'Alle'], ['habe', 'Habe ich'], ['fehlt', 'Fehlen'], ['doppelt', 'Doppelte'],
  ['wunsch', 'Wunschliste'], ['selten', 'Selten'],
]

export default function Album({ coins, data, countOf, valueOf, photos, onOpen, recognizeButton }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('alle')
  const [country, setCountry] = useState('')
  const [view, setView] = useState('land')
  const showMints = data.settings.mints

  const keyOf = (c) => (view === 'land' ? c.country : c.type === 'national' ? 'national' : String(c.sortYear))

  // Fortschritt je Gruppe (ungefiltert)
  const totals = {}
  for (const c of coins) {
    const t = (totals[keyOf(c)] ||= { all: 0, have: 0 })
    t.all++
    if (countOf(c)) t.have++
  }

  const q = query.trim().toLowerCase()
  const groups = new Map()
  for (const c of coins) {
    const n = countOf(c)
    if (filter === 'habe' && !n) continue
    if (filter === 'fehlt' && n) continue
    if (filter === 'doppelt' && n < 2) continue
    if (filter === 'wunsch' && !data.wish[c.id]) continue
    if (filter === 'selten' && valueOf(c) < RARE_FROM) continue
    if (country && c.country !== country) continue
    if (q && !`${c.motif} ${COUNTRIES[c.country]} ${c.year}`.toLowerCase().includes(q)) continue
    const k = keyOf(c)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(c)
  }

  const sorted = [...groups.entries()].sort((a, b) => {
    if (view === 'land') return byCountryName(a[0], b[0])
    if (a[0] === 'national') return -1
    if (b[0] === 'national') return 1
    return Number(b[0]) - Number(a[0])
  })

  const groupTitle = (k) =>
    view === 'land'
      ? <><span className="flag">{flag(k)}</span>{COUNTRIES[k]}</>
      : k === 'national' ? 'Umlaufmünzen (Nationalseiten)' : `Gedenkmünzen ${k}`

  const sortInGroup = (a, b) =>
    view === 'land' ? sortCoins(a, b) : byCountryName(a.country, b.country) || a.motif.localeCompare(b.motif, 'de')

  const emptyText = {
    habe: 'Noch keine Münze markiert. Tippe im Album auf eine Münze, die du hast.',
    doppelt: 'Keine doppelten Münzen. Erhöhe in einer Münze die Stückzahl, um sie hier zu sehen.',
    wunsch: 'Deine Wunschliste ist leer. Öffne eine Münze und tippe auf „Auf die Wunschliste“.',
    selten: 'Keine seltene Münze passt zu diesen Filtern.',
  }[filter] || 'Keine Münze passt zur Suche. Ändere den Suchbegriff oder füge die Münze unter „Mehr“ hinzu.'

  return (
    <section>
      <div className="filters">
        <div className="filter-row">
          <input type="search" placeholder="Motiv, Land oder Jahr suchen" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Suchen" />
          {recognizeButton}
        </div>
        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Land">
          <option value="">Alle Länder</option>
          {Object.keys(COUNTRIES).sort(byCountryName).map((code) => (
            <option key={code} value={code}>{flag(code)} {COUNTRIES[code]}</option>
          ))}
        </select>
        <div className="segmented" role="group" aria-label="Ansicht">
          <button className={view === 'land' ? 'is-active' : ''} aria-pressed={view === 'land'} onClick={() => setView('land')}>Nach Land</button>
          <button className={view === 'jahr' ? 'is-active' : ''} aria-pressed={view === 'jahr'} onClick={() => setView('jahr')}>Nach Jahr</button>
        </div>
        <div className="chips" role="group" aria-label="Anzeigen">
          {FILTERS.map(([key, label]) => (
            <button key={key} className={filter === key ? 'is-active' : ''} aria-pressed={filter === key}
              onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
      </div>

      {sorted.length === 0 && <p className="empty">{emptyText}</p>}

      {sorted.map(([k, items]) => {
        const t = totals[k]
        return (
          <div className="country" key={k}>
            <div className="country-head">
              <h2>{groupTitle(k)}</h2>
              <span className="country-count">{t.have} / {t.all}</span>
            </div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={t.all} aria-valuenow={t.have}>
              <span style={{ width: `${(t.have / t.all) * 100}%` }} />
            </div>
            <div className="slots">
              {items.sort(sortInGroup).map((c) => {
                const n = countOf(c)
                const rare = valueOf(c) >= RARE_FROM
                const mints = showMints && c.country === 'DE' ? mintsOwned(data.owned, c).length : null
                return (
                  <button key={c.id} className="slot" onClick={() => onOpen(c.id)}
                    aria-label={`${COUNTRIES[c.country]} ${c.year}, ${c.motif}: ${n ? `${n} Stück vorhanden` : 'fehlt'}${rare ? ', selten' : ''}${data.wish[c.id] ? ', auf der Wunschliste' : ''}`}>
                    <span className="slot-coin">
                      <CoinFace coin={c} count={n} photo={photos[c.id]} />
                      {n > 1 && <span className="badge">×{n}</span>}
                      {data.wish[c.id] && <span className="badge badge--wish" aria-hidden="true">♥</span>}
                      {rare && <span className="badge badge--rare" aria-hidden="true">★</span>}
                    </span>
                    <span className="slot-label">{view === 'jahr' && <>{flag(c.country)} </>}{c.motif}</span>
                    {mints !== null && <span className="slot-mints">{mints}/{MINTS.length} Prägestätten</span>}
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
