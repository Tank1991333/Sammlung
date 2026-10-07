import { useState } from 'react'
import { COUNTRIES, flag } from '../data/catalog.js'
import { QUALITIES, byCountryName, fmt, mintsOwned, sortCoins } from '../lib/store.js'

const QUALITY_LABEL = Object.fromEntries(QUALITIES)

export default function PrintView({ coins, data, countOf, valueOf, photos, onClose }) {
  const [mode, setMode] = useState('meine')
  const [withPhotos, setWithPhotos] = useState(true)

  const list = coins.filter((c) => mode === 'alle' || countOf(c) > 0)
  const groups = new Map()
  for (const c of list) {
    if (!groups.has(c.country)) groups.set(c.country, [])
    groups.get(c.country).push(c)
  }
  const sorted = [...groups.entries()].sort((a, b) => byCountryName(a[0], b[0]))

  let unique = 0, total = 0, value = 0
  for (const c of coins) {
    const n = countOf(c)
    if (n) { unique++; total += n; value += n * valueOf(c) }
  }

  return (
    <div className="print-view">
      <div className="print-controls no-print">
        <button className="ghost" onClick={onClose}>← Zurück</button>
        <div className="segmented" role="group" aria-label="Umfang">
          <button className={mode === 'meine' ? 'is-active' : ''} aria-pressed={mode === 'meine'} onClick={() => setMode('meine')}>Meine Münzen</button>
          <button className={mode === 'alle' ? 'is-active' : ''} aria-pressed={mode === 'alle'} onClick={() => setMode('alle')}>Checkliste mit fehlenden</button>
        </div>
        <label className="check"><input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} /> Fotos anzeigen</label>
        <button className="primary" onClick={() => window.print()}>Drucken oder als PDF speichern</button>
        <p className="hint">Im Druckdialog „Als PDF sichern“ bzw. „Als PDF speichern“ wählen.</p>
      </div>

      <header className="print-head">
        <h1>2-Euro-Album</h1>
        <p>Stand {new Date().toLocaleDateString('de-DE')}: {unique} von {coins.length} Münzen, {total} Stück insgesamt, geschätzter Wert {fmt(value)}</p>
      </header>

      {sorted.map(([code, items]) => (
        <section key={code} className="print-country">
          <h2>{flag(code)} {COUNTRIES[code]}</h2>
          <div className="table-wrap"><table>
            <thead>
              <tr>
                {withPhotos && <th className="col-photo">Foto</th>}
                <th>Jahr</th><th>Motiv</th><th className="num">Stück</th><th>Details</th><th className="num">Wert</th>
              </tr>
            </thead>
            <tbody>
              {items.sort(sortCoins).map((c) => {
                const n = countOf(c)
                const mints = c.country === 'DE' ? mintsOwned(data.owned, c) : []
                const q = (data.quality[c.id] || []).map((k) => QUALITY_LABEL[k]).filter(Boolean)
                const details = [mints.length ? `Prägest. ${mints.join(' ')}` : '', ...q, data.notes[c.id] || ''].filter(Boolean).join(', ')
                return (
                  <tr key={c.id} className={n ? '' : 'is-missing'}>
                    {withPhotos && <td className="col-photo">{photos[c.id] && n ? <img src={photos[c.id]} alt="" /> : null}</td>}
                    <td>{c.year}</td>
                    <td>{c.motif}</td>
                    <td className="num">{n ? n : '☐'}</td>
                    <td>{details}</td>
                    <td className="num">{n ? fmt(n * valueOf(c)) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </section>
      ))}
    </div>
  )
}
