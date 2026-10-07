import { COUNTRIES, flag } from '../data/catalog.js'
import { MINTS, QUALITIES, RARE_FROM, byCountryName, fmt, mintsOwned } from '../lib/store.js'

const BUCKETS = [
  { label: 'Nennwert (2 €)', test: (v) => v <= 2 },
  { label: 'über 2 bis 5 €', test: (v) => v > 2 && v <= 5 },
  { label: 'über 5 bis 20 €', test: (v) => v > 5 && v <= 20 },
  { label: 'über 20 bis 100 €', test: (v) => v > 20 && v <= 100 },
  { label: 'über 100 €', test: (v) => v > 100 },
]

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.max ?? r.n))
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <span className="bar-label">{r.label}</span>
          <span className="bar"><span style={{ width: `${(r.n / (r.max ?? max)) * 100}%` }} /></span>
          <span className="bar-num">{r.text}{r.sub && <small>{r.sub}</small>}</span>
        </div>
      ))}
    </div>
  )
}

export default function Stats({ coins, data, countOf, valueOf, onOpen }) {
  const buckets = BUCKETS.map((b) => ({ ...b, count: 0, sum: 0 }))
  const quality = Object.fromEntries(QUALITIES.map(([k]) => [k, 0]))
  const perCountry = {}
  const owned = []
  let unique = 0, total = 0, value = 0, rareHave = 0, rareAll = 0, wishOpen = 0, mintHave = 0, mintAll = 0

  for (const c of coins) {
    const n = countOf(c)
    const v = valueOf(c)
    const p = (perCountry[c.country] ||= { all: 0, have: 0 })
    p.all++
    if (v >= RARE_FROM) { rareAll++; if (n) rareHave++ }
    if (data.wish[c.id] && !n) wishOpen++
    if (data.settings.mints && c.country === 'DE') { mintAll += MINTS.length; mintHave += mintsOwned(data.owned, c).length }
    if (!n) continue
    p.have++; unique++; total += n; value += n * v
    owned.push({ c, n, v })
    const b = buckets.find((x) => x.test(v))
    b.count += n; b.sum += n * v
    for (const q of data.quality[c.id] || []) if (q in quality) quality[q]++
  }

  const top = [...owned].sort((a, b) => b.v - a.v).slice(0, 5)
  const doubles = owned.reduce((s, o) => s + (o.n - 1), 0)
  const pct = coins.length ? Math.round((unique / coins.length) * 100) : 0

  return (
    <section className="stats">
      <div className="figures">
        <div><strong>{pct} %</strong><span>des Katalogs gesammelt</span></div>
        <div><strong>{total}</strong><span>Münzen insgesamt</span></div>
        <div><strong>{doubles}</strong><span>Doppelte zum Tauschen</span></div>
        <div><strong>{fmt(value)}</strong><span>geschätzter Gesamtwert</span></div>
        <div><strong>{rareHave} / {rareAll}</strong><span>seltene Münzen</span></div>
        <div><strong>{wishOpen}</strong><span>offene Wünsche</span></div>
      </div>

      <h2>Münzen nach Wert</h2>
      <Bars rows={buckets.map((b) => ({ label: b.label, n: b.count, text: `${b.count} Stk.`, sub: fmt(b.sum) }))} />

      <h2>Erhaltungszustand</h2>
      {Object.values(quality).some(Boolean)
        ? <Bars rows={QUALITIES.map(([k, label]) => ({ label, n: quality[k], text: `${quality[k]}` }))} />
        : <p className="hint">Noch keine Zustände erfasst. Du kannst sie in jeder Münze auswählen.</p>}

      {data.settings.mints && (
        <>
          <h2>Deutsche Prägestätten</h2>
          <Bars rows={[{ label: 'Belegte Plätze', n: mintHave, max: mintAll || 1, text: `${mintHave} / ${mintAll}` }]} />
        </>
      )}

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
      <Bars rows={Object.entries(perCountry)
        .sort((a, b) => b[1].have / b[1].all - a[1].have / a[1].all || byCountryName(a[0], b[0]))
        .map(([code, p]) => ({ label: `${flag(code)} ${COUNTRIES[code]}`, n: p.have, max: p.all, text: `${p.have} / ${p.all}` }))} />

      <p className="hint">Die Richtwerte sind grobe Schätzungen für Münzen im Umlaufzustand. Als selten gelten Münzen ab einem Richtwert von {fmt(RARE_FROM)}. Den Wert jeder Münze kannst du selbst anpassen.</p>
    </section>
  )
}
