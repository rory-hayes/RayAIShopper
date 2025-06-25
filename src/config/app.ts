// App Configuration
export const APP_CONFIG = {
  // Set to true to show "Under Construction" page
  // Set to false to allow normal access to the application
  UNDER_CONSTRUCTION: true,
  
  // Demo mode settings
  DEMO_MODE: false,
  
  // App metadata
  APP_NAME: 'Ray AI Shopper',
  APP_VERSION: '1.0.0',
  
  // Feature flags
  FEATURES: {
    CHAT_ENABLED: true,
    VIRTUAL_TRYON_ENABLED: true,
    ANALYTICS_ENABLED: false
  },
  
  // Admin bypass settings
  ADMIN_BYPASS_KEY: 'ray_admin_2025'
} as const

// Helper function to check if admin bypass is active
export const hasAdminBypass = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  const bypassKey = urlParams.get('admin')
  
  return bypassKey === APP_CONFIG.ADMIN_BYPASS_KEY
}

// Helper function to check if app is under construction (with bypass)
export const isUnderConstruction = (): boolean => {
  // If admin bypass is active, always allow access
  if (hasAdminBypass()) {
    return false
  }
  
  return APP_CONFIG.UNDER_CONSTRUCTION
}

// Helper function to check if in demo mode
export const isDemoMode = (): boolean => {
  return APP_CONFIG.DEMO_MODE
}

// Helper function to get admin access URL
export const getAdminAccessUrl = (): string => {
  if (typeof window === 'undefined') return ''
  
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}?admin=${APP_CONFIG.ADMIN_BYPASS_KEY}`
} 