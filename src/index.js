import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Telegraf, Markup } from 'telegraf';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables
if (!process.env.BOT_TOKEN) {
  console.error('❌ FEHLER: BOT_TOKEN ist nicht gesetzt!');
  console.error('Bitte setze die Umgebungsvariable BOT_TOKEN in deinem Heroku Control Panel.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get config (for frontend)
app.get('/api/config', (req, res) => {
  res.json({
    tmdbApiKey: process.env.TMDB_API_KEY,
    jellyseerrUrl: process.env.JELLYSEERR_URL
  });
});

// API endpoint to check media availability in Jellyseerr
app.get('/api/jellyseerr/check/:mediaType/:tmdbId', async (req, res) => {
  const { mediaType, tmdbId } = req.params;
  
  if (!process.env.JELLYSEERR_URL || !process.env.JELLYSEERR_API_KEY) {
    return res.json({ available: false, error: 'Jellyseerr not configured' });
  }
  
  try {
    const response = await fetch(
      `${process.env.JELLYSEERR_URL}/api/v1/${mediaType}/${tmdbId}`,
      {
        headers: {
          'X-Api-Key': process.env.JELLYSEERR_API_KEY
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        available: data.mediaInfo?.status === 5 || data.mediaInfo?.status === 4,
        status: data.mediaInfo?.status,
        requested: data.mediaInfo?.status === 3 || data.mediaInfo?.status === 2,
        mediaInfo: data.mediaInfo
      });
    } else {
      res.json({ available: false, requested: false });
    }
  } catch (error) {
    console.error('Jellyseerr check error:', error);
    res.json({ available: false, error: error.message });
  }
});

// API endpoint to request media in Jellyseerr
app.post('/api/jellyseerr/request', async (req, res) => {
  const { mediaType, tmdbId, title } = req.body;
  
  if (!process.env.JELLYSEERR_URL || !process.env.JELLYSEERR_API_KEY) {
    return res.status(500).json({ success: false, error: 'Jellyseerr not configured' });
  }
  
  try {
    const response = await fetch(
      `${process.env.JELLYSEERR_URL}/api/v1/request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.JELLYSEERR_API_KEY
        },
        body: JSON.stringify({
          mediaType: mediaType === 'movie' ? 'movie' : 'tv',
          mediaId: parseInt(tmdbId)
        })
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      res.json({ success: true, data });
    } else {
      const error = await response.text();
      res.status(response.status).json({ success: false, error });
    }
  } catch (error) {
    console.error('Jellyseerr request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve index.html for all routes (except webhook)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/webhook')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== TELEGRAM BOT =====

// Start Command
bot.start((ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
  
  ctx.reply(
    '🎬 Willkommen beim IPTV Film-Bot!\n\n' +
    'Nutze die Mini App, um Filme zu durchsuchen und anzufragen.',
    Markup.keyboard([
      [Markup.button.webApp('🔍 Filme suchen', webAppUrl)]
    ]).resize()
  );
});

// Help Command
bot.help((ctx) => {
  ctx.reply(
    '📖 Hilfe:\n\n' +
    '/start - Bot starten\n' +
    '/help - Diese Hilfe anzeigen\n' +
    '/search - Film-Suche öffnen\n\n' +
    'Nutze den "Filme suchen" Button, um die Mini App zu öffnen.'
  );
});

// Search Command
bot.command('search', (ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
  
  ctx.reply(
    '🔍 Öffne die Film-Suche:',
    Markup.inlineKeyboard([
      [Markup.button.webApp('Film-Suche öffnen', webAppUrl)]
    ])
  );
});

// Error Handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
});

// ===== START SERVER & BOT =====

app.listen(PORT, async () => {
  console.log(`🌐 Web-Server läuft auf Port ${PORT}`);
  console.log(`📋 Umgebungsvariablen Check:`);
  console.log(`   - BOT_TOKEN: ${process.env.BOT_TOKEN ? '✅ Gesetzt' : '❌ Fehlt'}`);
  console.log(`   - TMDB_API_KEY: ${process.env.TMDB_API_KEY ? '✅ Gesetzt' : '❌ Fehlt'}`);
  console.log(`   - HEROKU_APP_NAME: ${process.env.HEROKU_APP_NAME || '❌ Nicht gesetzt (lokaler Modus)'}`);
  console.log(`   - WEB_APP_URL: ${process.env.WEB_APP_URL || '❌ Nicht gesetzt'}`);
  
  // Heroku verwendet Webhooks statt Polling
  if (process.env.HEROKU_APP_NAME && process.env.HEROKU_APP_NAME !== 'your-app-name') {
    const webhookUrl = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/webhook`;
    
    try {
      // Webhook Route ZUERST registrieren
      app.use(bot.webhookCallback('/webhook'));
      
      // Dann Webhook setzen
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Webhook gesetzt: ${webhookUrl}`);
      console.log(`✅ Bot läuft im Webhook-Modus`);
    } catch (error) {
      console.error('❌ Fehler beim Setzen des Webhooks:', error);
      process.exit(1);
    }
  } else {
    // Lokale Entwicklung: Polling verwenden
    console.log('🔄 Starte Bot im Polling-Modus (lokale Entwicklung)...');
    bot.launch()
      .then(() => {
        console.log('✅ Bot gestartet (Polling-Modus)!');
        console.log('Bot Username:', bot.botInfo?.username);
      })
      .catch((err) => {
        console.error('❌ Fehler beim Starten des Bots:', err);
        process.exit(1);
      });
  }
});

// Enable graceful stop (nur für Polling-Modus)
if (!process.env.HEROKU_APP_NAME || process.env.HEROKU_APP_NAME === 'your-app-name') {
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
