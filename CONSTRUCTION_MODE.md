# Under Construction Mode

This document explains how to manage the "Under Construction" feature for Ray AI Shopper.

## Overview

The Under Construction mode allows you to temporarily block public access to the application while still maintaining the ability to demo and test the app yourself.

## Configuration

The construction mode is controlled in `src/config/app.ts`:

```typescript
export const APP_CONFIG = {
  UNDER_CONSTRUCTION: true,  // Set to false to enable normal access
  // ... other config
}
```

## How to Use

### 1. Enable Construction Mode (Block Public Access)
```typescript
// In src/config/app.ts
UNDER_CONSTRUCTION: true
```

When enabled, visitors will see a professional "Under Construction" page instead of the main application.

### 2. Admin Bypass for Development/Demo
Even when construction mode is enabled, you can still access the full application by adding the admin parameter to the URL:

```
http://localhost:5173/?admin=ray_admin_2025
```

This allows you to:
- Test the application during development
- Demo the app to stakeholders
- Perform final checks before going live

### 3. Disable Construction Mode (Go Live)
```typescript
// In src/config/app.ts
UNDER_CONSTRUCTION: false
```

This makes the application publicly accessible to all users.

## URLs for Demo

- **Public URL** (shows construction page): `http://localhost:5173/`
- **Admin Access** (full app): `http://localhost:5173/?admin=ray_admin_2025`

## Security Notes

- The admin bypass key is currently visible in the source code
- For production deployments, consider using environment variables
- The bypass hint is shown on the construction page for development convenience
- Remove or hide the bypass hint before public deployment

## Customization

You can customize the construction page by editing `src/components/ui/UnderConstruction.tsx`:
- Change the message text
- Update the branding
- Modify the styling
- Add contact information
- Include estimated launch date

## Quick Actions

```bash
# Enable construction mode
# Edit src/config/app.ts and set UNDER_CONSTRUCTION: true

# Build and test
npm run build
npm run preview

# Demo access
# Visit: http://localhost:5173/?admin=ray_admin_2025
```