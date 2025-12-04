import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get TMDB API key (for frontend)
app.get('/api/config', (req, res) => {
  res.json({
    tmdbApiKey: process.env.TMDB_API_KEY
  });
});

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Web-Server läuft auf http://localhost:${PORT}`);
  console.log(`📱 Mini App URL: ${process.env.WEB_APP_URL || `http://localhost:${PORT}`}`);
});
