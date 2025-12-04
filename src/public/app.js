// Telegram Web App initialisieren
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

// Globale Variablen
let tmdbApiKey = '';
let searchTimeout = null;

// DOM Elemente
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const loadingElement = document.getElementById('loading');
const noResultsElement = document.getElementById('noResults');
const welcomeElement = document.getElementById('welcome');

// API Key laden
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        tmdbApiKey = config.tmdbApiKey;
    } catch (error) {
        console.error('Fehler beim Laden der Konfiguration:', error);
        // Fallback: Verwende den API Key direkt
        tmdbApiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNGViMGQzM2RhZGNkZmNhZjI3ZWM5ZWJiZTBhMGRjZiIsIm5iZiI6MTY0NjQzMTA5Ni45Miwic3ViIjoiNjIyMjhiNzg5MDIwMTIwMDZkNGUxMzJjIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.UJoGbP2Vf9vWy_u6bpWUtiClAuTiHvb8RBPZbEHhiM8';
    }
}

// Filme suchen
async function searchMovies(query) {
    if (!query.trim()) {
        showWelcome();
        return;
    }

    showLoading();

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=de-DE&page=1`,
            {
                headers: {
                    'Authorization': `Bearer ${tmdbApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('API Fehler');
        }

        const data = await response.json();
        displayResults(data.results);
    } catch (error) {
        console.error('Fehler bei der Suche:', error);
        showError();
    }
}

// Ergebnisse anzeigen
function displayResults(movies) {
    hideAll();

    if (!movies || movies.length === 0) {
        noResultsElement.classList.remove('hidden');
        return;
    }

    resultsContainer.innerHTML = '';
    
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        resultsContainer.appendChild(movieCard);
    });

    resultsContainer.classList.remove('hidden');
}

// Film-Karte erstellen
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
        : null;

    const year = movie.release_date 
        ? new Date(movie.release_date).getFullYear()
        : 'Unbekannt';

    const rating = movie.vote_average 
        ? movie.vote_average.toFixed(1)
        : 'N/A';

    card.innerHTML = `
        <div class="movie-content">
            <div class="movie-poster ${!posterUrl ? 'no-image' : ''}">
                ${posterUrl 
                    ? `<img src="${posterUrl}" alt="${movie.title}" loading="lazy">` 
                    : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'
                }
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-year">📅 ${year}</div>
                ${movie.overview ? `<p class="movie-overview">${movie.overview}</p>` : ''}
                <div class="movie-rating">⭐ ${rating}</div>
                <button class="request-button" onclick="requestMovie(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">
                    📥 Film anfragen
                </button>
            </div>
        </div>
    `;

    return card;
}

// Film anfragen (Platzhalter für später)
window.requestMovie = function(movieId, movieTitle) {
    // Diese Funktion wird später implementiert
    if (tg) {
        tg.showAlert(`Film-Anfrage für "${movieTitle}" wird später implementiert.`);
    } else {
        alert(`Film-Anfrage für "${movieTitle}" wird später implementiert.`);
    }
    
    console.log('Film angefragt:', { movieId, movieTitle });
};

// UI Hilfsfunktionen
function showLoading() {
    hideAll();
    loadingElement.classList.remove('hidden');
}

function showWelcome() {
    hideAll();
    welcomeElement.classList.remove('hidden');
}

function showError() {
    hideAll();
    noResultsElement.classList.remove('hidden');
}

function hideAll() {
    loadingElement.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    noResultsElement.classList.add('hidden');
    welcomeElement.classList.add('hidden');
}

// Event Listener
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    
    const query = e.target.value;
    
    if (query.trim()) {
        searchTimeout = setTimeout(() => {
            searchMovies(query);
        }, 500); // Debounce: 500ms warten
    } else {
        showWelcome();
    }
});

// Initialisierung
loadConfig().then(() => {
    console.log('✅ App initialisiert');
    showWelcome();
});
