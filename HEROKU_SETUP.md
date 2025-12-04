# Heroku Deployment Anleitung

## ⚠️ WICHTIG: Umgebungsvariablen im Heroku Control Panel setzen

Die `.env` Datei funktioniert **NICHT** auf Heroku! Du musst die Variablen im Heroku Control Panel setzen.

## 📝 Schritt-für-Schritt Anleitung

### 1. Gehe zu deinem Heroku Dashboard
- Öffne: https://dashboard.heroku.com/apps
- Wähle deine App aus

### 2. Öffne die Settings
- Klicke auf den Tab **"Settings"**
- Scrolle zu **"Config Vars"**
- Klicke auf **"Reveal Config Vars"**

### 3. Füge folgende Variablen hinzu:

| KEY | VALUE |
|-----|-------|
| `BOT_TOKEN` | Dein Bot Token von @BotFather (z.B. `7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`) |
| `TMDB_API_KEY` | `eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNGViMGQzM2RhZGNkZmNhZjI3ZWM5ZWJiZTBhMGRjZiIsIm5iZiI6MTY0NjQzMTA5Ni45Miwic3ViIjoiNjIyMjhiNzg5MDIwMTIwMDZkNGUxMzJjIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.UJoGbP2Vf9vWy_u6bpWUtiClAuTiHvb8RBPZbEHhiM8` |
| `HEROKU_APP_NAME` | Dein Heroku App Name (z.B. `my-movie-bot`) |
| `WEB_APP_URL` | `https://DEIN-APP-NAME.herokuapp.com` (ersetze DEIN-APP-NAME) |

### 4. Beispiel Screenshot-Anleitung

```
Config Vars
┌─────────────────┬──────────────────────────────────────────┐
│ KEY             │ VALUE                                    │
├─────────────────┼──────────────────────────────────────────┤
│ BOT_TOKEN       │ 7123456789:AAHdqTcvCH1vGWJxfSeofSAs... │
│ TMDB_API_KEY    │ eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNGV... │
│ HEROKU_APP_NAME │ my-movie-bot                             │
│ WEB_APP_URL     │ https://my-movie-bot.herokuapp.com       │
└─────────────────┴──────────────────────────────────────────┘
```

### 5. Speichern
- Heroku speichert automatisch
- Die App wird automatisch neu gestartet

## 🔍 Logs überprüfen

Nach dem Deployment kannst du die Logs überprüfen:

```bash
heroku logs --tail
```

Du solltest sehen:
```
🌐 Web-Server läuft auf Port 80
📋 Umgebungsvariablen Check:
   - BOT_TOKEN: ✅ Gesetzt
   - TMDB_API_KEY: ✅ Gesetzt
   - HEROKU_APP_NAME: my-movie-bot
   - WEB_APP_URL: https://my-movie-bot.herokuapp.com
✅ Webhook gesetzt: https://my-movie-bot.herokuapp.com/webhook
✅ Bot läuft im Webhook-Modus
```

## ❌ Häufige Fehler

### Fehler: "Bot Token is required"
**Problem:** `BOT_TOKEN` ist nicht gesetzt oder leer

**Lösung:** 
1. Gehe zu Heroku Dashboard → Settings → Config Vars
2. Füge `BOT_TOKEN` mit deinem echten Token hinzu
3. Warte auf automatischen Neustart

### Fehler: "Webhook gesetzt: https://your-app-name.herokuapp.com/webhook"
**Problem:** `HEROKU_APP_NAME` ist noch auf dem Platzhalter-Wert

**Lösung:**
1. Setze `HEROKU_APP_NAME` auf deinen echten App-Namen
2. Setze `WEB_APP_URL` auf `https://DEIN-APP-NAME.herokuapp.com`

## 🎯 Bot Token von BotFather holen

1. Öffne Telegram und suche nach `@BotFather`
2. Sende `/newbot`
3. Folge den Anweisungen
4. Kopiere den Token (sieht aus wie: `7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`)
5. Füge ihn als `BOT_TOKEN` in Heroku Config Vars ein

## 📱 Mini App in BotFather konfigurieren

Nach erfolgreichem Deployment:

1. Gehe zu `@BotFather`
2. Sende `/mybots`
3. Wähle deinen Bot
4. "Bot Settings" → "Menu Button"
5. Setze URL: `https://DEIN-APP-NAME.herokuapp.com`

Fertig! 🎉
