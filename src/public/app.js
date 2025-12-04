// Telegram Web App initialisieren
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

// Globale Variablen
let tmdbApiKey = '';
let searchTimeout = null;
let currentMediaType = 'movie'; // 'movie' oder 'tv'

// DOM Elemente
const mediaTypeSelection = document.getElementById('mediaTypeSelection');
const searchView = document.getElementById('searchView');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const loadingElement = document.getElementById('loading');
const noResultsElement = document.getElementById('noResults');
const welcomeElement = document.getElementById('welcome');
const searchTitle = document.getElementById('searchTitle');
const searchSubtitle = document.getElementById('searchSubtitle');
const welcomeText = document.getElementById('welcomeText');

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

// Media Type Selection
window.selectMediaType = function(type) {
    currentMediaType = type;
    mediaTypeSelection.classList.add('hidden');
    searchView.classList.remove('hidden');
    
    if (type === 'movie') {
        searchTitle.textContent = '🎬 Filme';
        searchSubtitle.textContent = 'Durchsuche Millionen von Filmen';
        searchInput.placeholder = 'Film suchen...';
        welcomeText.textContent = 'Suche nach deinen Lieblingsfilmen';
    } else {
        searchTitle.textContent = '📺 Serien';
        searchSubtitle.textContent = 'Durchsuche TV-Serien';
        searchInput.placeholder = 'Serie suchen...';
        welcomeText.textContent = 'Suche nach deinen Lieblingsserien';
    }
    
    searchInput.value = '';
    searchInput.focus();
    showWelcome();
};

window.backToSelection = function() {
    searchView.classList.add('hidden');
    mediaTypeSelection.classList.remove('hidden');
    searchInput.value = '';
    hideAll();
};

// Media suchen (Filme oder Serien)
async function searchMedia(query) {
    if (!query.trim()) {
        showWelcome();
        return;
    }

    showLoading();

    try {
        const endpoint = currentMediaType === 'movie' ? 'search/movie' : 'search/tv';
        const response = await fetch(
            `https://api.themoviedb.org/3/${endpoint}?query=${encodeURIComponent(query)}&language=de-DE&page=1`,
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
function displayResults(items) {
    hideAll();

    if (!items || items.length === 0) {
        noResultsElement.classList.remove('hidden');
        return;
    }

    resultsContainer.innerHTML = '';
    
    items.forEach(item => {
        const card = createMediaCard(item);
        resultsContainer.appendChild(card);
    });

    resultsContainer.classList.remove('hidden');
}

// Media-Karte erstellen (Film oder Serie)
function createMediaCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.tmdbId = item.id;

    const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
        : null;

    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'Unbekannt';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    card.innerHTML = `
        <div class="movie-content">
            <div class="movie-poster ${!posterUrl ? 'no-image' : ''}">
                ${posterUrl 
                    ? `<img src="${posterUrl}" alt="${title}" loading="lazy">` 
                    : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'
                }
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${title}</h3>
                <div class="movie-year">📅 ${year}</div>
                ${item.overview ? `<p class="movie-overview">${item.overview}</p>` : ''}
                <div class="movie-rating">⭐ ${rating}</div>
                <div class="availability-container" data-tmdb-id="${item.id}">
                    <div class="availability-badge" style="display: none;"></div>
                    <button class="request-button" onclick="requestMedia(${item.id}, '${title.replace(/'/g, "\\'")}')">
                        <span class="button-text">Prüfe Verfügbarkeit...</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Verfügbarkeit prüfen
    checkAvailability(item.id, card);

    return card;
}

// Verfügbarkeit in Jellyseerr prüfen
async function checkAvailability(tmdbId, card) {
    try {
        const response = await fetch(`/api/jellyseerr/check/${currentMediaType}/${tmdbId}`);
        const data = await response.json();
        
        const container = card.querySelector('.availability-container');
        const badge = container.querySelector('.availability-badge');
        const button = container.querySelector('.request-button');
        const buttonText = button.querySelector('.button-text');
        
        if (data.available) {
            badge.className = 'availability-badge available';
            badge.innerHTML = '✅ Verfügbar';
            badge.style.display = 'inline-flex';
            button.className = 'request-button available';
            button.disabled = true;
            buttonText.textContent = '✅ Bereits verfügbar';
        } else if (data.requested) {
            badge.className = 'availability-badge requested';
            badge.innerHTML = '⏳ Angefragt';
            badge.style.display = 'inline-flex';
            button.className = 'request-button requested';
            button.disabled = true;
            buttonText.textContent = '⏳ Bereits angefragt';
        } else {
            badge.className = 'availability-badge not-available';
            badge.innerHTML = '❌ Nicht verfügbar';
            badge.style.display = 'inline-flex';
            buttonText.textContent = `📥 ${currentMediaType === 'movie' ? 'Film' : 'Serie'} anfragen`;
        }
    } catch (error) {
        console.error('Fehler bei Verfügbarkeitsprüfung:', error);
        const button = card.querySelector('.request-button .button-text');
        button.textContent = `📥 ${currentMediaType === 'movie' ? 'Film' : 'Serie'} anfragen`;
    }
}

// Media anfragen
window.requestMedia = async function(tmdbId, title) {
    const button = event.target.closest('.request-button');
    const buttonText = button.querySelector('.button-text');
    const originalText = buttonText.textContent;
    
    button.disabled = true;
    buttonText.textContent = '⏳ Wird angefragt...';
    
    try {
        const response = await fetch('/api/jellyseerr/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mediaType: currentMediaType,
                tmdbId: tmdbId,
                title: title
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            button.className = 'request-button requested';
            buttonText.textContent = '✅ Erfolgreich angefragt!';
            
            const badge = button.parentElement.querySelector('.availability-badge');
            badge.className = 'availability-badge requested';
            badge.innerHTML = '⏳ Angefragt';
            badge.style.display = 'inline-flex';
            
            if (tg) {
                tg.showAlert(`"${title}" wurde erfolgreich angefragt!`);
            }
            
            setTimeout(() => {
                buttonText.textContent = '⏳ Bereits angefragt';
            }, 2000);
        } else {
            throw new Error(data.error || 'Anfrage fehlgeschlagen');
        }
    } catch (error) {
        console.error('Fehler bei der Anfrage:', error);
        button.disabled = false;
        buttonText.textContent = originalText;
        
        if (tg) {
            tg.showAlert(`Fehler: ${error.message}`);
        } else {
            alert(`Fehler: ${error.message}`);
        }
    }
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
            searchMedia(query);
        }, 500); // Debounce: 500ms warten
    } else {
        showWelcome();
    }
});

// Initialisierung
loadConfig().then(() => {
    console.log('✅ App initialisiert');
    // Zeige Media Type Selection
    mediaTypeSelection.classList.remove('hidden');
});
