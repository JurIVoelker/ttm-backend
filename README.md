# Tischtennis-Manager — Backend

REST-API für die Tischtennis-Manager-App. Dieses Repository enthält das Backend und ist der Nachfolger des ursprünglichen Monorepos [JurIVoelker/tischtennis-manager](https://github.com/JurIVoelker/tischtennis-manager).

Das zugehörige Frontend befindet sich unter [JurIVoelker/ttm-frontend](https://github.com/JurIVoelker/ttm-frontend).

## Funktionsübersicht

### Kernfunktionen
- Spielverwaltung mit Verfügbarkeitsabstimmung und Aufstellungsplanung
- Mannschafts- und Spielerverwaltung mit Rollen und Positionen
- Datensynchronisation mit externen Quellen (automatisch & manuell)
- Push-Benachrichtigungen via Web Push (VAPID)
- E-Mail-Versand (Einladungen, Passwort-Reset) via Resend

### Authentifizierung & Sicherheit
- JWT (HS256, 5 min Gültigkeit) mit Refresh-Tokens in HTTP-only Cookies
- Google OAuth2 für Mannschaftsführer und Admins
- Einladungstoken-System für Spieler
- Passwort-Reset per E-Mail
- Rate Limiting (1.000 Req/h global, 20 Req/10min auf Auth-Endpunkten)
- Rollenbasierte Zugriffskontrolle (`admin`, `leader`, `player`)

## Tech Stack

| Bereich | Technologie |
|---|---|
| Runtime | Bun |
| Framework | Hono v4 |
| Sprache | TypeScript (strict) |
| Datenbank | PostgreSQL + Prisma ORM v7 |
| Auth | JWT (oslo) + Google OAuth2 + bcryptjs |
| E-Mail | Resend + React Email |
| Push | web-push (VAPID) |
| Validierung | Zod 4 + @hono/zod-validator |
| Logging | Pino + pino-pretty |
| Rate Limiting | hono-rate-limiter |

## API-Übersicht

Alle Routen sind unter `/api` erreichbar.

| Bereich | Basis-Pfad | Rollen |
|---|---|---|
| Authentifizierung | `/api/auth` | public / alle |
| Spiele | `/api/match(es)` | player, leader, admin |
| Mannschaften | `/api/team(s)` | player, leader, admin |
| Spieler | `/api/player(s)` | player, leader, admin |
| Mannschaftsführer | `/api/leader(s)` | admin |
| Admins | `/api/admin(s)` | admin |
| Synchronisation | `/api/sync` | admin |
| Benachrichtigungen | `/api/notifications` | alle |
| Health | `/api/health` | public |

## Lokale Entwicklung

### Voraussetzungen
- [Bun](https://bun.sh) installiert
- PostgreSQL-Datenbank erreichbar

### Setup

```bash
# Abhängigkeiten installieren
bun install

# Umgebungsvariablen konfigurieren
cp .env.example .env

# Datenbank migrieren
bunx prisma migrate deploy

# Prisma Client generieren
bunx prisma generate

# Entwicklungsserver starten (inkl. Datenbank)
bun dev
```

Der Server läuft unter [http://localhost:8080](http://localhost:8080).

## Umgebungsvariablen

| Variable | Beschreibung | Pflicht |
|---|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungs-URL | ja |
| `JWT_SECRET` | Geheimschlüssel für JWT-Signierung | ja |
| `FRONTEND_URL` | CORS-Origin (Frontend-URL) | ja |
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client-ID | ja |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 Client-Secret | ja |
| `VAPID_PUBLIC_KEY` | Web Push Public Key | ja |
| `VAPID_PRIVATE_KEY` | Web Push Private Key | ja |
| `VAPID_PUSH_EMAIL` | Kontakt-E-Mail für VAPID | ja |
| `RESEND_API_KEY` | API-Key für E-Mail-Versand | ja |
| `RESEND_EMAIL_FROM` | Absender-Adresse für E-Mails | ja |
| `TT_API_KEY` | API-Key für externe Tischtennis-Datenquelle | ja |
| `DISCORD_WEBHOOK_URL` | Discord-Benachrichtigungen | nein |

## Datenbankmodelle

| Modell | Beschreibung |
|---|---|
| `Admin` | System-Administratoren |
| `TeamLeader` | Mannschaftsführer |
| `Player` | Vereinsspieler |
| `Team` | Mannschaften (mit Typ, Slug, Einladungstoken) |
| `Match` | Spiele (Heim/Auswärts, Aufstellung, Typ) |
| `MatchAvailabilityVote` | Verfügbarkeitsabstimmung pro Spieler/Spiel |
| `Location` | Spielorte |
| `RefreshToken` | JWT Refresh-Tokens |
| `Settings` | App-Einstellungen (Synchronisation) |
