import { COUNTRIES, flag } from '../data/catalog.js'
import { byCountryName, sortCoins } from './store.js'

// Teilt Text über das Teilen-Menü des Handys, sonst Zwischenablage. Gibt zurück, was passiert ist.
export async function shareText(title, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return 'shared' } catch (e) {
      if (e?.name === 'AbortError') return 'aborted'
    }
  }
  try { await navigator.clipboard.writeText(text); return 'copied' } catch (e) { return 'failed' }
}

function groupByCountry(items) {
  const map = new Map()
  for (const it of items) {
    const code = it.coin.country
    if (!map.has(code)) map.set(code, [])
    map.get(code).push(it)
  }
  return [...map.entries()].sort((a, b) => byCountryName(a[0], b[0]))
}

export function doublesText(coins, countOf) {
  const items = coins.map((coin) => ({ coin, n: countOf(coin) })).filter((x) => x.n > 1)
  if (!items.length) return null
  const lines = ['Meine doppelten 2-Euro-Münzen zum Tauschen:', '']
  for (const [code, list] of groupByCountry(items)) {
    lines.push(`${flag(code)} ${COUNTRIES[code]}`)
    for (const { coin, n } of list.sort((a, b) => sortCoins(a.coin, b.coin))) {
      lines.push(`  ${coin.year} ${coin.motif} (${n - 1}× doppelt)`)
    }
  }
  return lines.join('\n')
}

export function missingText(coins, countOf, country) {
  const items = coins
    .filter((coin) => !countOf(coin) && (!country || coin.country === country))
    .map((coin) => ({ coin }))
  if (!items.length) return null
  const lines = ['Diese 2-Euro-Münzen fehlen mir noch:', '']
  for (const [code, list] of groupByCountry(items)) {
    lines.push(`${flag(code)} ${COUNTRIES[code]} (${list.length})`)
    for (const { coin } of list.sort((a, b) => sortCoins(a.coin, b.coin))) lines.push(`  ${coin.year} ${coin.motif}`)
  }
  return lines.join('\n')
}

export function wishText(coins, wish) {
  const items = coins.filter((c) => wish[c.id]).map((coin) => ({ coin }))
  if (!items.length) return null
  const lines = ['Meine Wunschliste (2-Euro-Münzen):', '']
  for (const [code, list] of groupByCountry(items)) {
    lines.push(`${flag(code)} ${COUNTRIES[code]}`)
    for (const { coin } of list.sort((a, b) => sortCoins(a.coin, b.coin))) lines.push(`  ${coin.year} ${coin.motif}`)
  }
  return lines.join('\n')
}

export function priceLinks(coin) {
  const q = `2 Euro ${COUNTRIES[coin.country]} ${coin.sortYear} ${coin.motif}`
  const enc = encodeURIComponent(q)
  return [
    ['zwei-euro.com', `https://zwei-euro.com/en/identify-coin/?jahr=${coin.sortYear}`],
    ['Numista', `https://de.numista.com/catalogue/index.php?r=${enc}&ct=coin`],
    ['eBay verkauft', `https://www.ebay.de/sch/i.html?_nkw=${enc}&LH_Sold=1&LH_Complete=1`],
  ]
}
