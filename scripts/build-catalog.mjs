// Erzeugt public/catalog.json aus src/data/catalog.js (läuft automatisch vor jedem Build)
import { writeFileSync, mkdirSync } from 'node:fs'
import { CATALOG, CATALOG_STAND } from '../src/data/catalog.js'

mkdirSync(new URL('../public/', import.meta.url), { recursive: true })
writeFileSync(
  new URL('../public/catalog.json', import.meta.url),
  JSON.stringify({ stand: CATALOG_STAND, coins: CATALOG }),
)
console.log(`catalog.json: ${CATALOG.length} Münzen, Stand ${CATALOG_STAND}`)
