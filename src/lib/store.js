import { CATALOG, COUNTRIES } from '../data/catalog.js'

export const STORE_KEY = 'zwei-euro-album-v1'
export const CATALOG_KEY = 'zwei-euro-katalog-v1'
export const MINTS = ['A', 'D', 'F', 'G', 'J']
export const MINT_NAMES = { A: 'Berlin', D: 'München', F: 'Stuttgart', G: 'Karlsruhe', J: 'Hamburg' }
export const QUALITIES = [
  ['umlauf', 'Umlauf'],
  ['bankfrisch', 'Bankfrisch'],
  ['stgl', 'Stempelglanz'],
  ['pp', 'Spiegelglanz'],
  ['coincard', 'Coincard/Blister'],
]
export const RARE_FROM = 10 // Richtwert ab dem eine Münze als selten markiert wird

export const EMPTY = {
  owned: {}, values: {}, notes: {}, custom: [], wish: {}, quality: {},
  settings: { mints: false }, updatedAt: 0,
}

export function normalizeData(d) {
  return { ...EMPTY, ...d, settings: { ...EMPTY.settings, ...(d?.settings || {}) } }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return normalizeData(JSON.parse(raw))
  } catch (e) { /* leer starten */ }
  return EMPTY
}

export function saveData(d) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)) } catch (e) { /* Speicher voll oder gesperrt */ }
}

export function loadExtraCatalog() {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* kein Zusatzkatalog */ }
  return { stand: null, coins: [] }
}

export function saveExtraCatalog(extra) {
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(extra)) } catch (e) { /* Speicher voll */ }
}

const validCoin = (c) =>
  c && typeof c.id === 'string' && COUNTRIES[c.country] && typeof c.motif === 'string' &&
  (c.type === 'national' || c.type === 'gedenk') && Number.isFinite(Number(c.sortYear))

export function normalizeCatalog(json) {
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

export function mergeCatalog(extra, custom) {
  const byId = new Map(CATALOG.map((c) => [c.id, c]))
  for (const c of extra.coins) byId.set(c.id, { ...byId.get(c.id), ...c })
  return [...byId.values(), ...custom]
}

// Stückzahl einer Münze: ohne Prägestätte plus alle Prägestätten
export function ownedCount(owned, c) {
  let n = owned[c.id] || 0
  if (c.country === 'DE') for (const m of MINTS) n += owned[`${c.id}|${m}`] || 0
  return n
}

export function mintsOwned(owned, c) {
  return MINTS.filter((m) => (owned[`${c.id}|${m}`] || 0) > 0)
}

// Entfernt alle Einträge einer Münze (inklusive Prägestätten)
export function stripId(obj, id) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) if (k !== id && !k.startsWith(`${id}|`)) out[k] = v
  return out
}

export const fmt = (n) =>
  n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 })

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '–')

export const sortCoins = (a, b) =>
  (a.type === b.type ? 0 : a.type === 'national' ? -1 : 1) ||
  a.sortYear - b.sortYear ||
  a.motif.localeCompare(b.motif, 'de')

export const byCountryName = (a, b) => COUNTRIES[a].localeCompare(COUNTRIES[b], 'de')
