# IPTV Telegram Bot mit TMDB Mini App

Ein Telegram Bot mit integrierter Mini App zur Filmsuche über die TMDB API.

## Features

- 🤖 Telegram Bot mit Telegraf.js v4.16.3
- 🎬 TMDB Filmsuche über Mini App
- 📱 Moderne, responsive Web-Oberfläche
- 🔍 Echtzeit-Filmsuche

## Installation

1. Dependencies installieren:
```bash
npm install
```

2. `.env` Datei erstellen:
```bash
cp .env.example .env
```

3. Bot Token in `.env` eintragen:
   - Gehe zu [@BotFather](https://t.me/BotFather) auf Telegram
   - Erstelle einen neuen Bot mit `/newbot`
   - Kopiere den Bot Token in die `.env` Datei

## Verwendung

### Lokale Entwicklung
```bash
npm install
npm start
```

### Development Mode (mit Auto-Reload)
```bash
npm run dev
```

## Heroku Deployment

### 1. `.env.heroku` Datei konfigurieren
Bearbeite die `.env.heroku` Datei und trage deine Werte ein:
```bash
BOT_TOKEN=your_actual_bot_token
HEROKU_APP_NAME=your-app-name
WEB_APP_URL=https://your-app-name.herokuapp.com
```

### 2. Heroku App erstellen
```bash
heroku create your-app-name
```

### 3. Umgebungsvariablen aus .env.heroku laden
```bash
# Windows (PowerShell)
Get-Content .env.heroku | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.+)$') {
        heroku config:set "$($matches[1])=$($matches[2])"
    }
}

# Linux/Mac
while IFS='=' read -r key value; do
    if [[ ! $key =~ ^# && -n $key ]]; then
        heroku config:set "$key=$value"
    fi
done < .env.heroku
```

**ODER manuell:**
```bash
heroku config:set BOT_TOKEN=your_bot_token_here
heroku config:set TMDB_API_KEY=your_tmdb_api_key
heroku config:set HEROKU_APP_NAME=your-app-name
heroku config:set WEB_APP_URL=https://your-app-name.herokuapp.com
```

### 4. Deployen
```bash
git add .
git commit -m "Update Heroku config"
git push heroku main
```

### 5. Mini App in BotFather konfigurieren
- Gehe zu [@BotFather](https://t.me/BotFather)
- Sende `/mybots` und wähle deinen Bot
- Wähle "Bot Settings" → "Menu Button"
- Setze die URL: `https://your-app-name.herokuapp.com`

## Projekt-Struktur

```
.
├── src/
│   ├── index.js        # Hauptprozess (Bot + Server für Heroku)
│   ├── bot.js          # Telegram Bot (Standalone)
│   ├── server.js       # Express Web-Server (Standalone)
│   └── public/         # Web App Dateien
│       ├── index.html  # TMDB Filmsuche UI
│       ├── style.css   # Styling
│       └── app.js      # Frontend Logik
├── Procfile            # Heroku Konfiguration
├── .env                # Umgebungsvariablen (lokal)
├── .env.example        # Beispiel-Konfiguration
└── package.json        # Dependencies
```

## Technische Details

- **Lokale Entwicklung**: Bot verwendet Polling-Modus
- **Heroku Deployment**: Bot verwendet Webhook-Modus (automatisch erkannt)
- **Port**: Dynamisch von Heroku zugewiesen via `process.env.PORT`

## Nächste Schritte

- [ ] Bot Token konfigurieren
- [ ] Mini App URL in BotFather einrichten
- [ ] Anfrage-Funktion implementieren
