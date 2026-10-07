# Einrichtung der Zusatzfunktionen

Die App funktioniert ohne diese Schritte. Foto-Erkennung und Synchronisation sind optional und kostenlos.

## Foto-Erkennung (Google Gemini, Gratis-Tarif)

1. Auf https://aistudio.google.com mit einem Google-Konto anmelden und „Get API key“ wählen. Einen Schlüssel erstellen und kopieren.
2. Bei Vercel das Projekt öffnen: Settings → Environment Variables.
3. Neue Variable anlegen: Name `GEMINI_API_KEY`, Wert = der kopierte Schlüssel.
4. Unter „Deployments“ beim neuesten Eintrag „Redeploy“ wählen.

Danach erscheint im Album oben der Knopf „Erkennen“.

Hinweise:
- Der Schlüssel liegt nur bei Vercel und ist in der App nicht sichtbar.
- Im Gratis-Tarif gibt es ein Tageslimit. Ist es erreicht, meldet die App das, und du wählst die Münze manuell.
- Im Gratis-Tarif darf Google die Fotos zur Verbesserung seiner Modelle verwenden.
- Standardmodell ist `gemini-2.5-flash`. Falls Google das Modell umbenennt oder abschaltet, eine weitere Variable `GEMINI_MODEL` mit dem aktuellen Modellnamen anlegen.

## Synchronisation zwischen Geräten (Supabase, Gratis-Tarif)

1. Auf https://supabase.com ein kostenloses Konto und ein neues Projekt anlegen.
2. Im Projekt den „SQL Editor“ öffnen, den folgenden Text einfügen und auf „Run“ tippen:

```sql
create table public.collections (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.photos (
  user_id uuid not null references auth.users on delete cascade,
  coin_id text not null,
  data text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, coin_id)
);

alter table public.collections enable row level security;
alter table public.photos enable row level security;

create policy "eigene Sammlung" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "eigene Fotos" on public.photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

3. Unter Authentication → URL Configuration bei „Site URL“ die Adresse deiner App eintragen, z. B. `https://dein-projekt.vercel.app`.
4. Unter Project Settings → API (bzw. „Data API“) die „Project URL“ und den „anon public“-Schlüssel kopieren.
5. Bei Vercel unter Settings → Environment Variables zwei Variablen anlegen:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public Schlüssel
6. Bei Vercel „Redeploy“ wählen.

Danach kannst du dich in der App unter „Mehr“ → „Synchronisation“ mit deiner E-Mail anmelden. Melde dich auf jedem Gerät mit derselben E-Mail an.

Hinweise:
- Jeder sieht nur seine eigene Sammlung, das regeln die Richtlinien aus Schritt 2.
- Es gilt immer der neueste Stand. Ändere am besten nicht gleichzeitig auf zwei Geräten.
- Ein gelöschtes Foto wird auf anderen Geräten nicht automatisch entfernt.
- Kostenlose Supabase-Projekte werden nach längerer Inaktivität pausiert. Im Supabase-Dashboard lassen sie sich mit einem Klick wieder starten.
- Anmelde-E-Mails sind im Gratis-Tarif auf wenige pro Stunde begrenzt.
