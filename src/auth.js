// Authentication middleware and helpers

// External API authentication
export async function authenticateWithExternalAPI(username, password) {
  try {
    const apiUrl = `http://xfast.online:8080/panel_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    console.log('Authenticating with external API:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('API request failed with status:', response.status);
      return { success: false, error: 'API request failed' };
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    // Check if user_info exists
    if (!data.user_info) {
      console.error('No user_info in API response');
      return { success: false, error: 'Invalid credentials' };
    }
    
    const userInfo = data.user_info;
    console.log('User Info:', userInfo);
    
    // Check if status is Active
    if (userInfo.status !== 'Active') {
      return { success: false, error: 'Account is not active' };
    }
    
    // Check if exp_date is not expired (exp_date is Unix timestamp)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expDate = parseInt(userInfo.exp_date);
    
    if (expDate < currentTimestamp) {
      return { success: false, error: 'Account has expired' };
    }
    
    // Authentication successful
    return {
      success: true,
      userInfo: {
        username: userInfo.username,
        password: userInfo.password,
        status: userInfo.status,
        exp_date: expDate,
        is_trial: userInfo.is_trial,
        created_at: userInfo.created_at,
        max_connections: userInfo.max_connections
      }
    };
  } catch (error) {
    console.error('External API authentication error:', error);
    return { success: false, error: 'Authentication service unavailable' };
  }
}

// Middleware to check if user is authenticated
export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  res.status(401).json({ 
    success: false, 
    error: 'Authentication required',
    requiresLogin: true 
  });
}

// Middleware to check if user has credits
export function requireCredits(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      requiresLogin: true 
    });
  }
  
  const user = req.session.user;
  
  // Admin has unlimited credits
  if (user.role === 'admin') {
    return next();
  }
  
  // Check if user has credits
  if (user.request_credits <= 0) {
    return res.status(403).json({ 
      success: false, 
      error: 'No request credits available',
      creditsRemaining: 0,
      resetDate: user.credits_reset_date
    });
  }
  
  next();
}

// Get user role credits limit
export function getRoleCredits(role) {
  switch (role) {
    case 'admin':
      return 999999;
    case 'reseller':
      return 25;
    case 'user':
    default:
      return 5;
  }
}

// Format expiration date
export function formatExpDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Check if account is expired
export function isAccountExpired(expDate) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return parseInt(expDate) < currentTimestamp;
}
