// Frontend Integration Example for Stateless Keycloak Authentication
// This example shows how to integrate with the stateless NestJS backend

class AuthService {
  constructor() {
    this.keycloak = null;
    this.authConfig = null;
  }

  // Initialize authentication
  async init() {
    try {
      // Get auth configuration from backend
      this.authConfig = await this.getAuthConfig();
      
      // Initialize Keycloak client
      this.keycloak = new Keycloak({
        url: this.authConfig.authServerUrl,
        realm: this.authConfig.realm,
        clientId: this.authConfig.clientId
      });

      // Initialize with login required
      const authenticated = await this.keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256' // Use PKCE for security
      });

      if (authenticated) {
        console.log('User authenticated successfully');
        this.setupTokenRefresh();
      }

      return authenticated;
    } catch (error) {
      console.error('Authentication initialization failed:', error);
      throw error;
    }
  }

  // Get auth configuration from backend
  async getAuthConfig() {
    const response = await fetch('/api/auth/info');
    if (!response.ok) {
      throw new Error('Failed to get auth configuration');
    }
    return response.json();
  }

  // Setup automatic token refresh
  setupTokenRefresh() {
    // Refresh token 30 seconds before expiration
    setInterval(() => {
      this.keycloak.updateToken(30)
        .then(refreshed => {
          if (refreshed) {
            console.log('Token refreshed');
          }
        })
        .catch(error => {
          console.error('Token refresh failed:', error);
          this.login();
        });
    }, 60000); // Check every minute
  }

  // Login
  async login() {
    return this.keycloak.login({
      redirectUri: window.location.origin
    });
  }

  // Logout
  async logout() {
    return this.keycloak.logout({
      redirectUri: window.location.origin
    });
  }

  // Get current user token
  getToken() {
    return this.keycloak?.token;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.keycloak?.authenticated || false;
  }

  // Get user info from token
  getUserInfo() {
    if (!this.keycloak?.tokenParsed) return null;
    
    return {
      id: this.keycloak.tokenParsed.sub,
      email: this.keycloak.tokenParsed.email,
      name: this.keycloak.tokenParsed.name,
      firstName: this.keycloak.tokenParsed.given_name,
      lastName: this.keycloak.tokenParsed.family_name,
      roles: this.keycloak.tokenParsed.realm_access?.roles || []
    };
  }

  // Check if user has specific role
  hasRole(role) {
    return this.keycloak?.hasRealmRole(role) || false;
  }

  // Make authenticated API request
  async apiRequest(url, options = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token might be expired, try to refresh
      try {
        await this.keycloak.updateToken(5);
        // Retry with new token
        headers.Authorization = `Bearer ${this.getToken()}`;
        return fetch(url, { ...options, headers });
      } catch (error) {
        // Refresh failed, redirect to login
        this.login();
        throw new Error('Authentication required');
      }
    }

    return response;
  }

  // Get user profile from backend
  async getUserProfile() {
    const response = await this.apiRequest('/api/auth/profile');
    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }
    return response.json();
  }

  // Update user preferences
  async updatePreferences(preferences) {
    const response = await this.apiRequest('/api/auth/profile/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }
    return response.json();
  }

  // Update user settings
  async updateSettings(settings) {
    const response = await this.apiRequest('/api/auth/profile/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    return response.json();
  }
}

// Usage example
const authService = new AuthService();

// Initialize authentication when app starts
authService.init()
  .then(() => {
    console.log('Authentication initialized');
    
    // Get user info
    const userInfo = authService.getUserInfo();
    console.log('User:', userInfo);
    
    // Get user profile from backend
    return authService.getUserProfile();
  })
  .then(profile => {
    console.log('User profile:', profile);
  })
  .catch(error => {
    console.error('Authentication error:', error);
  });

// React Hook Example
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.init()
      .then(() => {
        const userInfo = authService.getUserInfo();
        setUser(userInfo);
      })
      .catch(error => {
        console.error('Auth error:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = () => authService.login();
  const logout = () => authService.logout();
  const hasRole = (role) => authService.hasRole(role);
  const apiRequest = (url, options) => authService.apiRequest(url, options);

  return {
    user,
    loading,
    isAuthenticated: authService.isAuthenticated(),
    login,
    logout,
    hasRole,
    apiRequest
  };
}

// Vue Composition API Example
function useAuth() {
  const user = ref(null);
  const loading = ref(true);

  onMounted(async () => {
    try {
      await authService.init();
      user.value = authService.getUserInfo();
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      loading.value = false;
    }
  });

  return {
    user: readonly(user),
    loading: readonly(loading),
    isAuthenticated: computed(() => authService.isAuthenticated()),
    login: () => authService.login(),
    logout: () => authService.logout(),
    hasRole: (role) => authService.hasRole(role),
    apiRequest: (url, options) => authService.apiRequest(url, options)
  };
}

export { AuthService, useAuth };