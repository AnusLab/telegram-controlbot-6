# Authentication System Implementation

## ✅ Completed

### Backend
1. **Database Setup** (`src/database.js`)
   - MySQL connection pool
   - Auto-initialization of tables:
     - `users` - User accounts with roles, credits, exp_date
     - `request_logs` - All media requests with status
     - `sessions` - Express session storage
     - `login_attempts` - Security logging
   - Functions for user management, logging, credits

2. **Auth Middleware** (`src/auth.js`)
   - External API authentication (xfast.online panel_api.php)
   - Session validation
   - Credits checking
   - Role-based permissions

3. **API Endpoints** (`src/index.js`)
   - `POST /api/auth/login` - Login with external API validation
   - `POST /api/auth/logout` - Logout and destroy session
   - `GET /api/auth/me` - Get current user info
   - `GET /api/auth/logs` - Get user request history
   - `POST /api/jellyseerr/request` - Now requires auth + credits

### Frontend
1. **HTML** (`src/public/index.html`)
   - Login View with form
   - Account View with user info, credits, logs
   - Account button in bottom navigation

2. **CSS** (`src/public/style.css`)
   - Login form styles
   - Account card and info styles
   - Log list styles
   - Role badges
   - Responsive design

## 🔄 TODO: Update app.js

The `src/public/app.js` file needs to be updated with:

### 1. Add at the beginning:
```javascript
// Current user state
let currentUser = null;
let isAuthenticated = false;

// Check authentication on load
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            isAuthenticated = true;
            showView('home');
            bottomNav.classList.remove('hidden');
        } else {
            showView('login');
            bottomNav.classList.add('hidden');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showView('login');
        bottomNav.classList.add('hidden');
    }
}
```

### 2. Add login handler:
```javascript
// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.querySelector('.button-text').textContent = 'Anmeldung läuft...';
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            isAuthenticated = true;
            showView('home');
            bottomNav.classList.remove('hidden');
            loadTrending(currentMediaType);
        } else {
            errorDiv.textContent = data.error || 'Login fehlgeschlagen';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Verbindungsfehler. Bitte versuche es erneut.';
        errorDiv.classList.remove('hidden');
    } finally {
        submitButton.disabled = false;
        submitButton.querySelector('.button-text').textContent = 'Anmelden';
    }
});
```

### 3. Add logout function:
```javascript
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        isAuthenticated = false;
        showView('login');
        bottomNav.classList.add('hidden');
    } catch (error) {
        console.error('Logout failed:', error);
    }
}
```

### 4. Add account view functions:
```javascript
async function loadAccountView() {
    try {
        // Load user info
        const userResponse = await fetch('/api/auth/me');
        const userData = await userResponse.json();
        
        if (userData.success) {
            const user = userData.user;
            document.getElementById('accountUsername').textContent = user.username;
            document.getElementById('accountRole').textContent = user.role;
            document.getElementById('accountRole').className = `role-badge ${user.role}`;
            document.getElementById('accountExpDate').textContent = user.exp_date_formatted;
            document.getElementById('accountCredits').textContent = user.role === 'admin' ? '∞' : user.request_credits;
            document.getElementById('accountResetDate').textContent = new Date(user.credits_reset_date).toLocaleDateString('de-DE');
        }
        
        // Load logs
        const logsResponse = await fetch('/api/auth/logs');
        const logsData = await logsResponse.json();
        
        const logsList = document.getElementById('accountLogsList');
        
        if (logsData.success && logsData.logs.length > 0) {
            logsList.innerHTML = logsData.logs.map(log => `
                <div class="log-item">
                    <div class="log-info">
                        <div class="log-title">${log.media_title || 'Unknown'}</div>
                        <div class="log-meta">
                            ${log.media_type === 'movie' ? 'Film' : 'Serie'} • 
                            ${new Date(log.created_at).toLocaleString('de-DE')}
                        </div>
                    </div>
                    <span class="log-status ${log.request_status}">${log.request_status}</span>
                </div>
            `).join('');
        } else {
            logsList.innerHTML = '<div class="empty-state"><p>Keine Anfragen vorhanden</p></div>';
        }
    } catch (error) {
        console.error('Failed to load account:', error);
    }
}
```

### 5. Update showView function:
```javascript
function showView(viewName) {
    // Hide all views
    homeView.classList.add('hidden');
    searchView.classList.add('hidden');
    detailView.classList.add('hidden');
    loginView.classList.add('hidden');
    accountView.classList.add('hidden');
    
    // Show requested view
    if (viewName === 'home') {
        homeView.classList.remove('hidden');
    } else if (viewName === 'search') {
        searchView.classList.remove('hidden');
    } else if (viewName === 'detail') {
        detailView.classList.remove('hidden');
    } else if (viewName === 'login') {
        loginView.classList.remove('hidden');
    } else if (viewName === 'account') {
        accountView.classList.remove('hidden');
        loadAccountView();
    }
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (viewName === 'home') {
        document.querySelector('.nav-item:nth-child(1)').classList.add('active');
    } else if (viewName === 'search') {
        document.querySelector('.nav-item:nth-child(2)').classList.add('active');
    } else if (viewName === 'account') {
        document.querySelector('.nav-item:nth-child(3)').classList.add('active');
    }
}
```

### 6. Update requestMediaFromDetail to handle auth errors:
```javascript
// In the catch block, add:
if (error.message.includes('Authentication required') || data.requiresLogin) {
    if (tg) {
        tg.showAlert('Bitte melde dich an um Anfragen zu stellen');
    }
    showView('login');
    return;
}

if (data.creditsRemaining !== undefined) {
    // Update credits display
    if (currentUser) {
        currentUser.request_credits = data.creditsRemaining;
    }
}
```

### 7. Update initialization:
```javascript
// At the end of the file, replace the init code:
if (tg) {
    tg.ready();
    tg.expand();
}

// Check authentication first
checkAuth();
```

## Database Configuration

Add to `.env`:
```
SESSION_SECRET=your-random-secret-key-here
```

## Roles & Credits

- **User**: 5 requests/month
- **Reseller**: 25 requests/month
- **Admin**: Unlimited requests

Credits reset on the 1st of each month automatically.

## Security Features

- External API validation (xfast.online)
- Session-based authentication
- Expiration date checking
- Login attempt logging
- IP address tracking
- Request logging with status

## Testing

1. Install dependencies: `npm install`
2. Start server: `npm start`
3. Login with xfast.online credentials
4. Test request flow with credits
5. Check account page for logs
