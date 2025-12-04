# Database & Authentication Setup Guide

## 🎯 Overview

Das System verwendet MySQL für User-Management, Request-Logging und Session-Storage. Die Authentifizierung erfolgt über eine externe API (xfast.online panel_api.php).

## 📦 Installation

```bash
npm install
```

Dies installiert automatisch:
- `mysql2` - MySQL Client
- `express-session` - Session Management

## 🔧 Konfiguration

### 1. Umgebungsvariablen

Füge zu deiner `.env` Datei hinzu:

```env
# Session Secret (generiere einen zufälligen String)
SESSION_SECRET=dein-geheimer-schlüssel-hier

# Alle anderen Variablen bleiben gleich
BOT_TOKEN=...
TMDB_API_KEY=...
JELLYSEERR_URL=...
JELLYSEERR_API_KEY=...
```

### 2. Datenbank

Die Datenbank wird **automatisch** beim ersten Start initialisiert!

**Verbindungsdaten:**
- Host: `vhi09o.easypanel.host`
- Port: `9905`
- User: `mysql`
- Password: `fb6e90710fbec5629cb1`
- Database: `sixcontrol`

## 🗄️ Datenbank-Tabellen

### `users`
Speichert alle User-Accounts mit:
- Username, Password (von externer API)
- Email, Role (user/admin/reseller)
- Telegram Name & User ID
- Request Credits & Reset Date
- Expiration Date & Status

### `request_logs`
Loggt alle Media-Requests:
- User ID & Username
- Media Type (movie/tv) & TMDB ID
- Media Title
- Request Status (success/failed/pending)
- Error Message
- IP Address & User Agent
- Timestamp

### `sessions`
Express-Session Storage für Login-Sessions

### `login_attempts`
Security-Logging für Login-Versuche

## 🔐 Authentifizierung

### Externe API

Das System authentifiziert gegen:
```
http://xfast.online:8080/panel_api.php?username=XXX&password=XXX
```

**Validierung:**
1. Status muss "Active" sein
2. `exp_date` darf nicht abgelaufen sein (Unix Timestamp)

### Login-Flow

1. User gibt Username & Password ein
2. System prüft gegen externe API
3. Bei Erfolg: User wird in DB angelegt/aktualisiert
4. Session wird erstellt
5. User wird eingeloggt

## 👥 Rollen & Credits

| Role | Credits/Monat | Beschreibung |
|------|---------------|--------------|
| **user** | 5 | Standard-Benutzer |
| **reseller** | 25 | Reseller mit mehr Credits |
| **admin** | ∞ | Unbegrenzte Requests |

**Credits Reset:**
- Automatisch am 1. Tag jeden Monats
- Läuft alle 24 Stunden im Hintergrund

## 📊 Request-Logging

Jede Media-Anfrage wird geloggt mit:
- ✅ **success** - Erfolgreich angefragt
- ❌ **failed** - Fehlgeschlagen
- ⏳ **pending** - In Bearbeitung

Zusätzlich:
- IP-Adresse des Users
- User-Agent (Browser)
- Fehlermeldung bei Fehler
- Timestamp

## 🚀 Start

```bash
# Lokal
npm run dev

# Produktion
npm start
```

Die Datenbank wird beim Start automatisch initialisiert!

## 🔍 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current User Info
- `GET /api/auth/logs` - User Request Logs

### Media (Auth Required)
- `POST /api/jellyseerr/request` - Request Media (benötigt Credits)

## 📱 Frontend

### Login-Seite
- Username & Password Input
- Validierung gegen externe API
- Error-Handling

### Account-Seite
- User-Info (Username, Role, Exp-Date)
- Credits-Anzeige
- Reset-Datum
- Request-History
- Logout-Button

### Navigation
- Home (Trending)
- Suche
- **Account** (NEU!)

## 🛡️ Security Features

✅ Session-based Authentication
✅ External API Validation
✅ Expiration Date Checking
✅ Login Attempt Logging
✅ IP Address Tracking
✅ Request Logging
✅ Role-based Access Control
✅ Credits System

## 🐛 Troubleshooting

### Datenbank-Verbindung fehlgeschlagen
```
❌ Database initialization error
```
**Lösung:** Prüfe Netzwerkverbindung zu `vhi09o.easypanel.host:9905`

### Login funktioniert nicht
```
❌ Invalid credentials / Account expired
```
**Lösung:** 
1. Prüfe Username/Password
2. Prüfe Status in externer API (muss "Active" sein)
3. Prüfe Expiration Date

### Credits werden nicht abgezogen
**Lösung:** Prüfe ob User-Role korrekt gesetzt ist (Admin hat unlimited)

### Session läuft ab
**Lösung:** Session läuft nach 7 Tagen ab, User muss sich neu einloggen

## 📝 Hinweise

- **Erste Anmeldung:** User wird automatisch in DB angelegt
- **Role-Änderung:** Muss manuell in DB geändert werden
- **Credits-Reset:** Automatisch am 1. jeden Monats
- **Logs:** Werden unbegrenzt gespeichert (ggf. später Cleanup implementieren)

## 🎉 Fertig!

Das System ist jetzt vollständig eingerichtet und bereit für den Einsatz!
