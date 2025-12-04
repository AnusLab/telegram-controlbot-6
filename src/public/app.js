// Telegram Web App initialisieren
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

// Globale Variablen
let tmdbApiKey = '';
let currentMediaType = 'all';
let currentView = 'home';
let searchTimeout = null;

// DOM Elemente
const homeView = document.getElementById('homeView');
const searchView = document.getElementById('searchView');
const detailView = document.getElementById('detailView');
const bottomNav = document.getElementById('bottomNav');

// API Key laden
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        tmdbApiKey = config.tmdbApiKey;
    } catch (error) {
        console.error('Fehler beim Laden der Konfiguration:', error);
        tmdbApiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNGViMGQzM2RhZGNkZmNhZjI3ZWM5ZWJiZTBhMGRjZiIsIm5iZiI6MTY0NjQzMTA5Ni45Miwic3ViIjoiNjIyMjhiNzg5MDIwMTIwMDZkNGUxMzJjIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.UJoGbP2Vf9vWy_u6bpWUtiClAuTiHvb8RBPZbEHhiM8';
    }
}

// View Management
window.showView = function(view) {
    // Hide all views
    homeView.classList.add('hidden');
    searchView.classList.add('hidden');
    detailView.classList.add('hidden');
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected view
    if (view === 'home') {
        homeView.classList.remove('hidden');
        document.querySelector('.nav-item[onclick*="home"]').classList.add('active');
        currentView = 'home';
    } else if (view === 'search') {
        searchView.classList.remove('hidden');
        document.querySelector('.nav-item[onclick*="search"]').classList.add('active');
        document.getElementById('searchEmpty').classList.remove('hidden');
        currentView = 'search';
    }
};

// Tab Switcher
window.switchTab = function(type) {
    currentMediaType = type;
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    loadTrending(type);
};

// Load Trending
async function loadTrending(mediaType) {
    const loading = document.getElementById('trendingLoading');
    const grid = document.getElementById('trendingGrid');
    
    loading.classList.remove('hidden');
    grid.innerHTML = '';
    
    try {
        if (mediaType === 'all') {
            // Load both movies and TV shows
            const [moviesResponse, tvResponse] = await Promise.all([
                fetch(`/api/trending/movie/week`),
                fetch(`/api/trending/tv/week`)
            ]);
            
            const moviesData = await moviesResponse.json();
            const tvData = await tvResponse.json();
            
            const allResults = [
                ...moviesData.results.slice(0, 10).map(item => ({ ...item, media_type: 'movie' })),
                ...tvData.results.slice(0, 10).map(item => ({ ...item, media_type: 'tv' }))
            ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            
            loading.classList.add('hidden');
            
            allResults.forEach(item => {
                const card = createMediaCard(item, item.media_type);
                grid.appendChild(card);
            });
        } else {
            const response = await fetch(`/api/trending/${mediaType}/week`);
            const data = await response.json();
            
            loading.classList.add('hidden');
            
            if (data.results && data.results.length > 0) {
                data.results.slice(0, 20).forEach(item => {
                    const card = createMediaCard(item, mediaType);
                    grid.appendChild(card);
                });
            }
        }
    } catch (error) {
        console.error('Fehler beim Laden von Trending:', error);
        loading.classList.add('hidden');
    }
}

// Create Media Card
function createMediaCard(item, mediaType) {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.onclick = () => showDetail(item.id, mediaType);
    
    const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
        : null;
    
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
    
    card.innerHTML = `
        <div class="media-card-poster">
            ${posterUrl 
                ? `<img src="${posterUrl}" alt="${title}" loading="lazy">` 
                : '<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: auto;"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'
            }
            <div class="availability-indicator" data-tmdb-id="${item.id}" data-media-type="${mediaType}">
                <span>⏳</span>
            </div>
        </div>
        <div class="media-card-info">
            <div class="media-card-title">${title}</div>
            <div class="media-card-year">${year}</div>
        </div>
    `;
    
    // Check availability
    checkAvailabilityForCard(item.id, mediaType, card);
    
    return card;
}

// Check Availability for Card
async function checkAvailabilityForCard(tmdbId, mediaType, card) {
    try {
        const response = await fetch(`/api/jellyseerr/check/${mediaType}/${tmdbId}`);
        const data = await response.json();
        
        const indicator = card.querySelector('.availability-indicator');
        
        if (data.available) {
            indicator.className = 'availability-indicator available';
            indicator.innerHTML = '<span>✅</span>';
        } else if (data.requested) {
            indicator.className = 'availability-indicator requested';
            indicator.innerHTML = '<span>⏳</span>';
        } else {
            indicator.className = 'availability-indicator not-available';
            indicator.innerHTML = '<span>❌</span>';
        }
    } catch (error) {
        console.error('Fehler bei Verfügbarkeitsprüfung:', error);
    }
}

// Show Detail View
async function showDetail(tmdbId, mediaType) {
    detailView.classList.remove('hidden');
    homeView.classList.add('hidden');
    searchView.classList.add('hidden');
    bottomNav.classList.add('hidden');
    
    const content = document.getElementById('detailContent');
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Lade Details...</p></div>';
    
    try {
        const response = await fetch(`/api/details/${mediaType}/${tmdbId}`);
        const data = await response.json();
        
        const backdropUrl = data.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
            : null;
        
        const posterUrl = data.poster_path
            ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
            : null;
        
        const title = data.title || data.name;
        const releaseDate = data.release_date || data.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
        const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        const runtime = data.runtime || (data.episode_run_time && data.episode_run_time[0]) || null;
        const genres = data.genres ? data.genres.map(g => g.name).join(', ') : '';
        
        // Get availability
        const availResponse = await fetch(`/api/jellyseerr/check/${mediaType}/${tmdbId}`);
        const availData = await availResponse.json();
        
        let availabilityBadge = '';
        let requestButton = '';
        
        if (availData.available) {
            availabilityBadge = '<div class="availability-badge available">✅ Verfügbar</div>';
            requestButton = '<button class="request-button available" disabled><span class="button-text">✅ Bereits verfügbar</span></button>';
        } else if (availData.requested) {
            availabilityBadge = '<div class="availability-badge requested">⏳ Angefragt</div>';
            requestButton = '<button class="request-button requested" disabled><span class="button-text">⏳ Bereits angefragt</span></button>';
        } else {
            availabilityBadge = '<div class="availability-badge not-available">❌ Nicht verfügbar</div>';
            requestButton = `<button class="request-button" onclick="requestMediaFromDetail(${tmdbId}, '${mediaType}', '${title.replace(/'/g, "\\'")}')"><span class="button-text">📥 ${mediaType === 'movie' ? 'Film' : 'Serie'} anfragen</span></button>`;
        }
        
        // Cast
        const cast = data.credits && data.credits.cast ? data.credits.cast.slice(0, 8) : [];
        const castHTML = cast.map(person => {
            const photoUrl = person.profile_path
                ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
                : null;
            
            return `
                <div class="cast-member">
                    <div class="cast-photo">
                        ${photoUrl 
                            ? `<img src="${photoUrl}" alt="${person.name}">` 
                            : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path></svg>'
                        }
                    </div>
                    <div class="cast-name">${person.name}</div>
                    <div class="cast-character">${person.character || ''}</div>
                </div>
            `;
        }).join('');
        
        content.innerHTML = `
            ${backdropUrl ? `
                <div class="detail-backdrop">
                    <img src="${backdropUrl}" alt="${title}">
                </div>
            ` : ''}
            
            <div class="detail-header">
                ${posterUrl ? `
                    <div class="detail-poster">
                        <img src="${posterUrl}" alt="${title}">
                    </div>
                ` : ''}
                <div class="detail-info">
                    <h2 class="detail-title">${title}</h2>
                    <div class="detail-meta">
                        ${year ? `<span>📅 ${year}</span>` : ''}
                        ${runtime ? `<span>⏱️ ${runtime} Min</span>` : ''}
                        <span class="detail-rating">⭐ ${rating}</span>
                    </div>
                    ${genres ? `<div style="color: var(--text-secondary); margin-bottom: 12px;">${genres}</div>` : ''}
                    ${availabilityBadge}
                </div>
            </div>
            
            ${requestButton}
            
            ${data.overview ? `
                <div class="detail-section">
                    <h3>📖 Beschreibung</h3>
                    <div class="detail-overview">${data.overview}</div>
                </div>
            ` : ''}
            
            ${cast.length > 0 ? `
                <div class="detail-section">
                    <h3>🎭 Besetzung</h3>
                    <div class="cast-grid">${castHTML}</div>
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('Fehler beim Laden der Details:', error);
        content.innerHTML = '<div class="empty-state"><h2>Fehler</h2><p>Details konnten nicht geladen werden</p></div>';
    }
}

// Close Detail View
window.closeDetail = function() {
    detailView.classList.add('hidden');
    bottomNav.classList.remove('hidden');
    
    if (currentView === 'home') {
        homeView.classList.remove('hidden');
    } else {
        searchView.classList.remove('hidden');
    }
};

// Request Media from Detail
window.requestMediaFromDetail = async function(tmdbId, mediaType, title) {
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
                mediaType: mediaType,
                tmdbId: tmdbId,
                title: title
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            button.className = 'request-button requested';
            buttonText.textContent = '✅ Erfolgreich angefragt!';
            
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

// Search Functionality
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    
    const query = e.target.value.trim();
    
    if (query) {
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 500);
    } else {
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('searchEmpty').classList.remove('hidden');
        document.getElementById('noResults').classList.add('hidden');
        document.getElementById('searchLoading').classList.add('hidden');
    }
});

async function performSearch(query) {
    const loading = document.getElementById('searchLoading');
    const results = document.getElementById('searchResults');
    const empty = document.getElementById('searchEmpty');
    const noResults = document.getElementById('noResults');
    
    empty.classList.add('hidden');
    noResults.classList.add('hidden');
    loading.classList.remove('hidden');
    results.innerHTML = '';
    
    try {
        // Search both movies and TV shows
        const [moviesResponse, tvResponse] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=de-DE`, {
                headers: {
                    'Authorization': `Bearer ${tmdbApiKey}`,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(`https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&language=de-DE`, {
                headers: {
                    'Authorization': `Bearer ${tmdbApiKey}`,
                    'Content-Type': 'application/json'
                }
            })
        ]);
        
        const moviesData = await moviesResponse.json();
        const tvData = await tvResponse.json();
        
        const allResults = [
            ...moviesData.results.map(item => ({ ...item, media_type: 'movie' })),
            ...tvData.results.map(item => ({ ...item, media_type: 'tv' }))
        ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        
        loading.classList.add('hidden');
        
        if (allResults.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            allResults.slice(0, 20).forEach(item => {
                const card = createMediaCard(item, item.media_type);
                results.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Fehler bei der Suche:', error);
        loading.classList.add('hidden');
        noResults.classList.remove('hidden');
    }
}

// Initialisierung
loadConfig().then(() => {
    console.log('✅ App initialisiert');
    bottomNav.classList.remove('hidden');
    loadTrending('all'); // Load trending on start
});
