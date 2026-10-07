import { useRef, useState } from 'react'
import { COUNTRIES, flag } from '../data/catalog.js'
import { EMPTY, byCountryName, fmtDate, normalizeCatalog, normalizeData } from '../lib/store.js'
import { doublesText, missingText, shareText, wishText } from '../lib/share.js'
import { signIn, signOut } from '../lib/sync.js'

export default function More({
  data, update, replaceData, photos, replaceAllPhotos, onAdd, goAlbum,
  coins, countOf, catalogCount, catalogStand, applyCatalog, onPrint, sync, recognitionOk, theme,
}) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [shareCountry, setShareCountry] = useState('')
  const [email, setEmail] = useState('')
  const [fallbackText, setFallbackText] = useState('')
  const [form, setForm] = useState({ country: 'DE', type: 'gedenk', year: String(new Date().getFullYear()), motif: '', value: '2' })
  const fileRef = useRef(null)
  const catFileRef = useRef(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const say = (text) => { setMsg(text); top() }

  // Katalog
  const report = (added) => {
    if (!added.length) { say('Der Katalog ist aktuell. Es wurden keine neuen Münzen gefunden.'); return }
    const names = added.slice(0, 3).map((c) => `${flag(c.country)} ${c.motif}`).join(', ')
    say(`${added.length} neue ${added.length === 1 ? 'Münze' : 'Münzen'} hinzugefügt: ${names}${added.length > 3 ? ' …' : ''}. Deine Sammlung ist unverändert.`)
  }
  const updateOnline = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/catalog.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      report(applyCatalog(normalizeCatalog(await res.json())))
    } catch {
      say('Der Katalog konnte nicht geladen werden. Prüfe die Internetverbindung und versuche es erneut.')
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
      catch { say('Diese Datei ist keine gültige Katalogdatei.') }
    }
    reader.readAsText(file)
  }

  // Teilen
  const share = async (title, text, emptyMsg) => {
    if (!text) { say(emptyMsg); return }
    const result = await shareText(title, text)
    if (result === 'copied') say('Die Liste wurde in die Zwischenablage kopiert. Du kannst sie jetzt in WhatsApp oder einer E-Mail einfügen.')
    if (result === 'failed') { setFallbackText(text); say('Teilen ist hier nicht möglich. Kopiere die Liste aus dem Textfeld unten.') }
  }

  // Münze hinzufügen
  const add = (e) => {
    e.preventDefault()
    const year = parseInt(form.year, 10)
    if (!form.motif.trim() || !year) { say('Bitte Jahr und Motiv angeben.'); return }
    onAdd({
      id: `custom-${Date.now()}`, country: form.country, type: form.type,
      year: String(year), sortYear: year, motif: form.motif.trim(),
      value: parseFloat(form.value.replace(',', '.')) || 2, custom: true,
    })
    setForm({ ...form, motif: '' })
    say(`„${form.motif.trim()}“ wurde zum Katalog hinzugefügt.`)
  }

  // Sicherung
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
          replaceData({ ...normalizeData(rest), updatedAt: Date.now() })
          replaceAllPhotos(importedPhotos)
          say('Sicherung wurde geladen.')
        }
      } catch {
        say('Diese Datei ist keine gültige Sicherung der Sammlung.')
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  const login = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) { say('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    try {
      await signIn(email.trim())
      say('Wir haben dir einen Anmeldelink geschickt. Öffne die E-Mail auf diesem Gerät und tippe auf den Link.')
    } catch {
      say('Der Anmeldelink konnte nicht gesendet werden. Versuche es in ein paar Minuten erneut.')
    }
  }

  const countryOptions = Object.keys(COUNTRIES).sort(byCountryName)

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

      <h2>Tauschliste teilen</h2>
      <p className="hint">Erstellt eine Textliste, die du per WhatsApp, E-Mail oder Nachricht an andere Sammler schicken kannst.</p>
      <div className="stack">
        <button className="ghost" onClick={() => share('Doppelte 2-Euro-Münzen', doublesText(coins, countOf), 'Du hast noch keine doppelten Münzen.')}>Doppelte teilen</button>
        <label className="field">
          <span>Fehlende Münzen für</span>
          <select value={shareCountry} onChange={(e) => setShareCountry(e.target.value)}>
            <option value="">Alle Länder</option>
            {countryOptions.map((code) => <option key={code} value={code}>{flag(code)} {COUNTRIES[code]}</option>)}
          </select>
        </label>
        <button className="ghost" onClick={() => share('Fehlende 2-Euro-Münzen', missingText(coins, countOf, shareCountry), 'Dir fehlt in dieser Auswahl keine Münze.')}>Fehlende teilen</button>
        <button className="ghost" onClick={() => share('Meine Wunschliste', wishText(coins, data.wish), 'Deine Wunschliste ist leer.')}>Wunschliste teilen</button>
        {fallbackText && <textarea className="share-fallback" rows={8} readOnly value={fallbackText} onFocus={(e) => e.target.select()} />}
      </div>

      <h2>Album als PDF</h2>
      <p className="hint">Druckbare Übersicht deiner Sammlung, zum Beispiel für die Versicherung oder als Checkliste für die Münzbörse.</p>
      <button className="ghost" onClick={onPrint}>Druckansicht öffnen</button>

      <h2>Ansicht</h2>
      <div className="segmented" role="group" aria-label="Hell oder dunkel">
        {[['auto', 'Automatisch'], ['hell', 'Hell'], ['dunkel', 'Dunkel']].map(([key, label]) => (
          <button key={key} className={theme.pref === key ? 'is-active' : ''} aria-pressed={theme.pref === key}
            onClick={() => theme.setPref(key)}>{label}</button>
        ))}
      </div>
      <p className="hint">„Automatisch“ folgt der Einstellung deines Handys. Mit dem Knopf oben rechts schaltest du jederzeit schnell um.</p>

      <h2>Sammeleinstellungen</h2>
      <label className="switch">
        <input type="checkbox" checked={data.settings.mints}
          onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, mints: e.target.checked } }))} />
        <span>Deutsche Münzen nach Prägestätte sammeln (A, D, F, G, J)</span>
      </label>
      <p className="hint">Wenn eingeschaltet, kannst du bei jeder deutschen Münze die Stückzahl pro Prägestätte erfassen. Bereits erfasste Münzen bleiben unter „Ohne Angabe“ erhalten.</p>

      <h2>Foto-Erkennung</h2>
      <p className="hint">{recognitionOk
        ? 'Eingerichtet. Im Album findest du oben den Knopf „Erkennen“.'
        : 'Noch nicht eingerichtet. Die Anleitung steht in der Datei EINRICHTUNG.md im Projekt. Ohne Einrichtung wählst du die Münzen wie bisher manuell aus.'}</p>

      <h2>Synchronisation zwischen Geräten</h2>
      {!sync.available ? (
        <p className="hint">Noch nicht eingerichtet. Die Anleitung steht in der Datei EINRICHTUNG.md im Projekt. Bis dahin kannst du die Sammlung mit einer Sicherung übertragen.</p>
      ) : sync.session ? (
        <div className="stack">
          <p className="hint">Angemeldet als {sync.session.user.email}. {sync.status}</p>
          <button className="ghost" onClick={() => signOut()}>Abmelden</button>
        </div>
      ) : (
        <form className="form" onSubmit={login}>
          <p className="hint">Melde dich auf jedem Gerät mit derselben E-Mail an. Du bekommst einen Anmeldelink, ein Passwort ist nicht nötig.</p>
          <label className="field"><span>E-Mail-Adresse</span>
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="primary" type="submit">Anmeldelink senden</button>
        </form>
      )}

      <h2>Münze hinzufügen</h2>
      <p className="hint">Für Münzen, die noch nicht im Katalog stehen.</p>
      <form onSubmit={add} className="form">
        <label className="field"><span>Land</span>
          <select value={form.country} onChange={set('country')}>
            {countryOptions.map((code) => <option key={code} value={code}>{flag(code)} {COUNTRIES[code]}</option>)}
          </select>
        </label>
        <div className="row">
          <label className="field"><span>Jahr</span><input inputMode="numeric" value={form.year} onChange={set('year')} /></label>
          <label className="field"><span>Richtwert in €</span><input inputMode="decimal" value={form.value} onChange={set('value')} /></label>
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
      <p className="hint">Die Sammlung wird auf diesem Gerät gespeichert. Lade regelmäßig eine Sicherung herunter, damit nichts verloren geht. Deine Münzfotos sind in der Sicherung enthalten.</p>
      <div className="stack">
        <button className="ghost" onClick={exportData}>Sicherung herunterladen</button>
        <button className="ghost" onClick={() => fileRef.current?.click()}>Sicherung laden</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
        <button className="danger" onClick={() => {
          if (confirm('Wirklich die ganze Sammlung löschen? Das kann nicht rückgängig gemacht werden.')) {
            replaceData({ ...EMPTY, updatedAt: Date.now() }); replaceAllPhotos({}); say('Sammlung wurde gelöscht.')
          }
        }}>Sammlung löschen</button>
      </div>
    </section>
  )
}
