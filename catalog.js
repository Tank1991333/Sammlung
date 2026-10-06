// Münzkatalog. Richtwerte sind grobe Schätzungen für Umlaufzustand
// und können in der App für jede Münze angepasst werden.
// Fehlende Gedenkmünzen lassen sich in der App selbst hinzufügen.

export const COUNTRIES = {
  AD: 'Andorra', AT: 'Österreich', BE: 'Belgien', BG: 'Bulgarien', CY: 'Zypern',
  DE: 'Deutschland', EE: 'Estland', ES: 'Spanien', FI: 'Finnland', FR: 'Frankreich',
  GR: 'Griechenland', HR: 'Kroatien', IE: 'Irland', IT: 'Italien', LT: 'Litauen',
  LU: 'Luxemburg', LV: 'Lettland', MC: 'Monaco', MT: 'Malta', NL: 'Niederlande',
  PT: 'Portugal', SI: 'Slowenien', SK: 'Slowakei', SM: 'San Marino', VA: 'Vatikan',
}

export const flag = (code) =>
  String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))

export const slugify = (s) =>
  s.toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// [Land, Zeitraum, Motiv, Richtwert in €]
const NATIONAL = [
  ['AD', 'ab 2014', 'Wappen von Andorra', 4],
  ['AT', 'ab 2002', 'Bertha von Suttner', 2],
  ['BE', '1999–2007', 'König Albert II.', 2],
  ['BE', '2008–2013', 'König Albert II. (neues Porträt)', 2],
  ['BE', 'ab 2014', 'König Philippe', 2],
  ['BG', 'ab 2026', 'Paisij Hilendarski', 2],
  ['CY', 'ab 2008', 'Idol von Pomos', 2],
  ['DE', 'ab 2002', 'Bundesadler', 2],
  ['EE', 'ab 2011', 'Landkarte Estlands', 2],
  ['ES', '1999–2009', 'König Juan Carlos I.', 2],
  ['ES', '2010–2014', 'König Juan Carlos I. (neues Porträt)', 2],
  ['ES', 'ab 2015', 'König Felipe VI.', 2],
  ['FI', 'ab 1999', 'Moltebeeren', 2],
  ['FR', '1999–2021', 'Lebensbaum', 2],
  ['FR', 'ab 2022', 'Eiche und Olivenbaum', 2],
  ['GR', 'ab 2002', 'Europa auf dem Stier', 2],
  ['HR', 'ab 2023', 'Landkarte Kroatiens', 2],
  ['IE', 'ab 2002', 'Keltische Harfe', 2],
  ['IT', 'ab 2002', 'Dante Alighieri', 2],
  ['LT', 'ab 2015', 'Vytis (Reiter)', 2],
  ['LU', 'ab 2002', 'Großherzog Henri', 2],
  ['LV', 'ab 2014', 'Lettische Frau', 2],
  ['MC', '2001–2005', 'Fürst Rainier III.', 10],
  ['MC', 'ab 2006', 'Fürst Albert II.', 6],
  ['MT', 'ab 2008', 'Malteserkreuz', 2],
  ['NL', '1999–2013', 'Königin Beatrix', 2],
  ['NL', 'ab 2014', 'König Willem-Alexander', 2],
  ['PT', 'ab 2002', 'Königliches Siegel von 1144', 2],
  ['SI', 'ab 2007', 'France Prešeren', 2],
  ['SK', 'ab 2009', 'Doppelkreuz', 2],
  ['SM', '2002–2016', 'Nationalseite (1. Serie)', 5],
  ['SM', 'ab 2017', 'Nationalseite (2. Serie)', 5],
  ['VA', '2002–2005', 'Papst Johannes Paul II.', 30],
  ['VA', '2006–2013', 'Papst Benedikt XVI.', 25],
  ['VA', 'ab 2014', 'Papst Franziskus', 20],
]

// [Land, Jahr, Motiv, Richtwert in €]
const COMMEMORATIVE = [
  ['DE', 2006, 'Schleswig-Holstein: Holstentor Lübeck', 3],
  ['DE', 2007, 'Mecklenburg-Vorpommern: Schloss Schwerin', 3],
  ['DE', 2008, 'Hamburg: Michel', 3],
  ['DE', 2009, 'Saarland: Ludwigskirche Saarbrücken', 3],
  ['DE', 2010, 'Bremen: Rathaus und Roland', 3],
  ['DE', 2011, 'Nordrhein-Westfalen: Kölner Dom', 3],
  ['DE', 2012, 'Bayern: Schloss Neuschwanstein', 3],
  ['DE', 2013, 'Baden-Württemberg: Kloster Maulbronn', 3],
  ['DE', 2013, '50 Jahre Élysée-Vertrag', 3],
  ['DE', 2014, 'Niedersachsen: Michaeliskirche Hildesheim', 3],
  ['DE', 2015, 'Hessen: Paulskirche Frankfurt', 3],
  ['DE', 2015, '25 Jahre Deutsche Einheit', 3],
  ['DE', 2016, 'Sachsen: Dresdner Zwinger', 3],
  ['DE', 2017, 'Rheinland-Pfalz: Porta Nigra', 3],
  ['DE', 2018, 'Berlin: Schloss Charlottenburg', 3],
  ['DE', 2018, '100. Geburtstag Helmut Schmidt', 3],
  ['DE', 2019, '70 Jahre Bundesrat', 3],
  ['DE', 2019, '30 Jahre Mauerfall', 3],
  ['DE', 2020, 'Brandenburg: Schloss Sanssouci', 3],
  ['DE', 2020, '50 Jahre Kniefall von Warschau', 3],
  ['DE', 2021, 'Sachsen-Anhalt: Magdeburger Dom', 3],
  ['DE', 2022, 'Thüringen: Wartburg', 3],
  ['DE', 2023, 'Hamburg: Elbphilharmonie', 3],
  ['DE', 2023, 'Karl der Große', 3],
  ['DE', 2024, 'Mecklenburg-Vorpommern: Königsstuhl Rügen', 3],
  ['DE', 2025, 'Saarland: Saarschleife', 3],
  ['FR', 2013, '50 Jahre Élysée-Vertrag', 3],
  ['MC', 2007, '25. Todestag Grace Kelly', 1500],
]

// Gemeinschaftsausgaben: gleiches Motiv, jedes Land prägt eine eigene Version
const JOINT = [
  [2007, '50 Jahre Römische Verträge', ['BE', 'DE', 'IE', 'GR', 'ES', 'FR', 'IT', 'LU', 'NL', 'AT', 'PT', 'SI', 'FI']],
  [2009, '10 Jahre Wirtschafts- und Währungsunion', ['BE', 'DE', 'IE', 'GR', 'ES', 'FR', 'IT', 'CY', 'LU', 'MT', 'NL', 'AT', 'PT', 'SI', 'SK', 'FI']],
  [2012, '10 Jahre Euro-Bargeld', ['BE', 'DE', 'EE', 'IE', 'GR', 'ES', 'FR', 'IT', 'CY', 'LU', 'MT', 'NL', 'AT', 'PT', 'SI', 'SK', 'FI']],
  [2015, '30 Jahre Europaflagge', ['BE', 'DE', 'EE', 'IE', 'GR', 'ES', 'FR', 'IT', 'CY', 'LV', 'LT', 'LU', 'MT', 'NL', 'AT', 'PT', 'SI', 'SK', 'FI']],
  [2022, '35 Jahre Erasmus-Programm', ['BE', 'DE', 'EE', 'IE', 'GR', 'ES', 'FR', 'IT', 'CY', 'LV', 'LT', 'LU', 'MT', 'NL', 'AT', 'PT', 'SI', 'SK', 'FI']],
]

const startYear = (period) => Number(String(period).match(/\d{4}/)[0])

export const CATALOG = [
  ...NATIONAL.map(([country, year, motif, value]) => ({
    id: `${country}-n-${slugify(year + '-' + motif)}`,
    country, type: 'national', year, sortYear: startYear(year), motif, value,
  })),
  ...COMMEMORATIVE.map(([country, year, motif, value]) => ({
    id: `${country}-g-${year}-${slugify(motif)}`,
    country, type: 'gedenk', year: String(year), sortYear: year, motif, value,
  })),
  ...JOINT.flatMap(([year, motif, countries]) =>
    countries.map((country) => ({
      id: `${country}-g-${year}-${slugify(motif)}`,
      country, type: 'gedenk', year: String(year), sortYear: year, motif,
      value: country === 'MT' || country === 'LU' ? 3 : 2.5,
      joint: true,
    }))
  ),
]

export const TYPE_LABEL = {
  national: 'Nationale Seite (Umlaufmünze)',
  gedenk: 'Gedenkmünze',
}
