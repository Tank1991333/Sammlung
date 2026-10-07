# 2-Euro-Album

App zum Dokumentieren einer 2-Euro-Münzsammlung: Münzen abhaken und fotografieren, fehlende sehen, Werte schätzen, Statistik, Tauschlisten, Druckansicht, Offline-Modus. Optional mit Foto-Erkennung und Synchronisation (siehe EINRICHTUNG.md).

## Online stellen (kostenlos)
1. Auf github.com ein Repository anlegen und alle Dateien dieses Ordners hochladen.
2. Auf vercel.com das Repository importieren. Vercel erkennt Vite automatisch. Auf „Deploy“ klicken.

## Lokal starten
```
npm install
npm run dev
```

## Katalog erweitern
Münzen stehen in `src/data/catalog.js`. Beim Build wird daraus automatisch `public/catalog.json` erzeugt, die die App über „Katalog aktualisieren“ lädt. Eine Katalogdatei kann auch direkt in der App unter „Mehr“ geladen werden.
