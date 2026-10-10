// Typische Aufschriften und Kürzel auf der Landesseite, zur Bestimmung unbekannter Münzen.
// Groß-/Kleinschreibung und Akzente spielen bei der Suche keine Rolle.
export const INSCRIPTIONS = {
  AD: ['ANDORRA'],
  AT: ['REPUBLIK ÖSTERREICH', 'ÖSTERREICH', 'OESTERREICH'],
  BE: ['BELGIQUE', 'BELGIË', 'BELGIEN', 'BELGIUM', 'BE'],
  BG: ['БЪЛГАРИЯ', 'BULGARIA', 'BALGARIYA'],
  CY: ['ΚΥΠΡΟΣ', 'KIBRIS', 'KYPROS', 'CYPRUS'],
  DE: ['BUNDESREPUBLIK DEUTSCHLAND', 'DEUTSCHLAND', 'D'],
  EE: ['EESTI'],
  ES: ['ESPAÑA', 'ESPANA'],
  FI: ['SUOMI', 'FINLAND', 'FI'],
  FR: ['RÉPUBLIQUE FRANÇAISE', 'FRANCE', 'RF'],
  GR: ['ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ', 'ΕΛΛΑΣ', 'ΕΛΛΑΔΑ', 'ELLINIKI DIMOKRATIA', 'ELLADA'],
  HR: ['HRVATSKA'],
  IE: ['ÉIRE', 'EIRE'],
  IT: ['REPUBBLICA ITALIANA', 'ITALIA', 'RI'],
  LT: ['LIETUVA'],
  LU: ['LUXEMBOURG', 'LËTZEBUERG', 'LETZEBUERG'],
  LV: ['LATVIJA', 'LATVIJAS REPUBLIKA'],
  MC: ['MONACO'],
  MT: ['MALTA'],
  NL: ['KONINKRIJK DER NEDERLANDEN', 'NEDERLAND', 'BEATRIX', 'WILLEM-ALEXANDER', 'NL'],
  PT: ['PORTUGAL'],
  SI: ['SLOVENIJA'],
  SK: ['SLOVENSKO'],
  SM: ['SAN MARINO', 'RSM'],
  VA: ['CITTÀ DEL VATICANO', 'VATICANO'],
}

// Schnellauswahl für Schriften, die man erkennt, aber nicht lesen kann
export const SCRIPTS = [
  { label: 'Griechische Buchstaben', countries: ['GR', 'CY'] },
  { label: 'Kyrillische Buchstaben', countries: ['BG'] },
]
