import { useEffect, useMemo, useState } from 'react'
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { COUNTRIES, flag } from '../data/catalog.js'

// Ländergrenzen (Natural Earth über world-atlas), wird einmal geladen und offline gespeichert
const ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

// ISO-Nummern der Euro-Länder im Kartendatensatz
const ISO_NUM = {
  AT: 40, BE: 56, BG: 100, HR: 191, CY: 196, EE: 233, FI: 246, FR: 250, DE: 276, GR: 300,
  IE: 372, IT: 380, LV: 428, LT: 440, LU: 442, MT: 470, NL: 528, PT: 620, SK: 703, SI: 705,
  ES: 724, AD: 20, MC: 492, SM: 674, VA: 336,
}
const CODE_BY_NUM = Object.fromEntries(Object.entries(ISO_NUM).map(([c, n]) => [n, c]))

// Sehr kleine Länder zusätzlich als antippbarer Punkt
const MICRO = {
  AD: [1.52, 42.51], MC: [7.42, 43.74], SM: [12.46, 43.94], VA: [12.45, 41.9], MT: [14.44, 35.9], LU: [6.13, 49.61],
}

const W = 800
const H = 760

const PALETTE = {
  dunkel: { from: '#2C3B5C', to: '#E2BC5C', other: '#172036', stroke: '#0F1729', otherStroke: '#2C3B5C' },
  hell: { from: '#DCD3BF', to: '#B8892A', other: '#ECE7DC', stroke: '#F5F1E8', otherStroke: '#D5CDBB' },
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
function mix(a, b, t) {
  const [x, y] = [hex(a), hex(b)]
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`
}

let atlasPromise = null
function loadAtlas() {
  atlasPromise ||= fetch(ATLAS_URL).then((r) => {
    if (!r.ok) throw new Error('Karte nicht erreichbar')
    return r.json()
  }).catch((e) => { atlasPromise = null; throw e })
  return atlasPromise
}

export default function MapView({ coins, countOf, theme, onShowCountry }) {
  const [atlas, setAtlas] = useState(null)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState(null)
  const colors = PALETTE[theme === 'hell' ? 'hell' : 'dunkel']

  const load = () => {
    setError(false)
    loadAtlas().then(setAtlas).catch(() => setError(true))
  }
  useEffect(load, [])

  // Fortschritt je Land
  const progress = {}
  for (const c of coins) {
    const p = (progress[c.country] ||= { have: 0, all: 0 })
    p.all++
    if (countOf(c)) p.have++
  }
  const ratio = (code) => (progress[code]?.all ? progress[code].have / progress[code].all : 0)
  const fillFor = (code) => mix(colors.from, colors.to, ratio(code))

  const shapes = useMemo(() => {
    if (!atlas) return null
    const projection = geoAzimuthalEqualArea()
      .rotate([-14, -52])
      .fitExtent([[12, 12], [W - 12, H - 12]], {
        type: 'MultiPoint',
        coordinates: [[-10.5, 36], [34.6, 34.6], [-10.5, 58], [31.5, 70.1], [20, 70.1], [-9.5, 43]],
      })
      .clipExtent([[0, 0], [W, H]])
    const path = geoPath(projection)
    const features = feature(atlas, atlas.objects.countries).features
    return {
      countries: features
        .map((f) => ({ code: CODE_BY_NUM[Number(f.id)] || null, d: path(f), id: f.id }))
        .filter((f) => f.d),
      micro: Object.entries(MICRO).map(([code, lonlat]) => ({ code, xy: projection(lonlat) })).filter((m) => m.xy),
    }
  }, [atlas])

  const select = (code) => setSelected((s) => (s === code ? null : code))
  const keySelect = (code) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(code) } }
  const sel = selected && progress[selected]

  const ranking = Object.keys(COUNTRIES)
    .filter((c) => progress[c]?.all)
    .sort((a, b) => ratio(b) - ratio(a) || COUNTRIES[a].localeCompare(COUNTRIES[b], 'de'))
  const complete = ranking.filter((c) => ratio(c) === 1).length

  return (
    <section className="map-view">
      <h2 className="map-title">Europakarte</h2>
      <p className="hint">Je kräftiger ein Land leuchtet, desto vollständiger ist deine Sammlung dort. Tippe auf ein Land für Details.</p>

      {error && (
        <div className="msg" role="alert">
          <p>Die Karte konnte nicht geladen werden. Beim ersten Öffnen ist eine Internetverbindung nötig, danach funktioniert sie auch offline.</p>
          <button className="ghost" onClick={load}>Erneut versuchen</button>
        </div>
      )}
      {!shapes && !error && <p className="hint" role="status">Karte wird geladen …</p>}

      {shapes && (
        <div className="map-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="group" aria-label="Europakarte mit Sammelfortschritt">
            {shapes.countries.map((f, i) => f.code ? (
              <path key={f.id ?? i} d={f.d} fill={fillFor(f.code)} stroke={selected === f.code ? 'var(--ink)' : colors.stroke}
                strokeWidth={selected === f.code ? 2.5 : 0.8} className="map-country is-euro"
                role="button" tabIndex={0} onClick={() => select(f.code)} onKeyDown={keySelect(f.code)}
                aria-label={`${COUNTRIES[f.code]}: ${progress[f.code]?.have || 0} von ${progress[f.code]?.all || 0} Münzen`} />
            ) : (
              <path key={f.id ?? i} d={f.d} fill={colors.other} stroke={colors.otherStroke} strokeWidth={0.6} aria-hidden="true" />
            ))}
            {shapes.micro.map(({ code, xy }) => (
              <circle key={code} cx={xy[0]} cy={xy[1]} r={selected === code ? 9 : 7} fill={fillFor(code)}
                stroke={selected === code ? 'var(--ink)' : colors.stroke} strokeWidth={2} className="map-country is-euro"
                role="button" tabIndex={0} onClick={() => select(code)} onKeyDown={keySelect(code)}
                aria-label={`${COUNTRIES[code]}: ${progress[code]?.have || 0} von ${progress[code]?.all || 0} Münzen`} />
            ))}
          </svg>
          <div className="map-legend" aria-hidden="true">
            <span>0 %</span>
            <span className="map-legend-bar" style={{ background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }} />
            <span>100 %</span>
          </div>
        </div>
      )}

      {sel && (
        <div className="map-info" role="status">
          <div>
            <strong>{flag(selected)} {COUNTRIES[selected]}</strong>
            <span>{sel.have} von {sel.all} Münzen, {Math.round(ratio(selected) * 100)} %</span>
          </div>
          <button className="primary" onClick={() => onShowCountry(selected)}>Im Album zeigen</button>
        </div>
      )}

      <p className="map-summary">{complete === 0 ? 'Noch kein Land komplett.' : `${complete} ${complete === 1 ? 'Land' : 'Länder'} komplett.`}</p>
      <div className="map-chips">
        {ranking.map((code) => (
          <button key={code} className={`map-chip${selected === code ? ' is-active' : ''}`} onClick={() => select(code)}>
            <span className="map-dot" style={{ background: fillFor(code) }} />
            {flag(code)} {COUNTRIES[code]} <small>{Math.round(ratio(code) * 100)} %</small>
          </button>
        ))}
      </div>
    </section>
  )
}
