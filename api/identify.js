// Vercel-Funktion: erkennt eine 2-Euro-Münze auf einem Foto mit Google Gemini (Gratis-Tarif).
// Benötigt die Umgebungsvariable GEMINI_API_KEY bei Vercel. Optional GEMINI_MODEL.
export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY

  if (req.method === 'GET') {
    return res.status(200).json({ configured: !!key })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })
  if (!key) return res.status(501).json({ error: 'not_configured' })

  const { image, catalog } = req.body || {}
  if (typeof image !== 'string' || typeof catalog !== 'string' || image.length > 3_000_000) {
    return res.status(400).json({ error: 'bad_request' })
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const prompt = [
    'Auf dem Foto ist die nationale Seite einer 2-Euro-Münze zu sehen.',
    'Bestimme Ausgabeland, Jahr und Motiv. Wähle dann aus der Liste unten die bis zu drei wahrscheinlichsten Einträge, der beste zuerst.',
    'Achte besonders auf Jahreszahl, Landesname oder Länderkürzel und das Motiv.',
    'Antworte ausschließlich mit JSON in dieser Form:',
    '{"candidates":[{"id":"<id aus der Liste>","confidence":0.0}],"note":"<ein kurzer Satz auf Deutsch, was du erkennst>"}',
    'Wenn keine Münze passt, gib eine leere Liste zurück.',
    '',
    'Liste (id|Land|Jahr|Motiv):',
    catalog,
  ].join('\n')

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: image } }, { text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    })
    if (r.status === 429) return res.status(429).json({ error: 'limit' })
    if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status })
    const j = await r.json()
    const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return res.status(200).json({
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates.slice(0, 3) : [],
      note: typeof parsed.note === 'string' ? parsed.note.slice(0, 300) : '',
    })
  } catch (e) {
    return res.status(502).json({ error: 'failed' })
  }
}
