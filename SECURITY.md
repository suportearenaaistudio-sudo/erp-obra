# Security Configuration

## Environment Variables

The following environment variables must be set for security features:

```bash
# Impersonation JWT Secret (generate with: openssl rand -base64 32)
IMPERSONATION_JWT_SECRET=your-secret-key-here

# Environment (affects security headers)
ENVIRONMENT=production  # or 'development'

# Gemini API Key (for AI chat)
GEMINI_API_KEY=your-gemini-key-here
```

## Setting Secrets in Supabase

```bash
# Set impersonation secret
supabase secrets set IMPERSONATION_JWT_SECRET=your-secret-key-here

# Set environment
supabase secrets set ENVIRONMENT=production

# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your-gemini-key-here
```

## Security Headers

All Edge Functions now include:
- **CSP** (Content Security Policy) - prevents XSS attacks
- **HSTS** (HTTP Strict Transport Security) - enforces HTTPS in production
- **X-Frame-Options: DENY** - prevents clickjacking
- **X-Content-Type-Options: nosniff** - prevents MIME sniffing
- **Referrer-Policy** - controls referrer information
- **Permissions-Policy** - restricts browser features

## Rate Limits

Default rate limits per endpoint:
- **Login**: 5 attempts / 15 minutes
- **AI Chat (Starter)**: 10 messages / minute
- **AI Chat (Pro)**: 50 messages / minute
- **AI Chat (Enterprise)**: 200 messages / minute
- **Impersonation**: 10 actions / minute

## Admin Roles

Dev Admin access is now controlled via database roles in `saas_users`:
- `VIEWER` - Read-only access
- `SUPPORT` - Customer support
- `DEV_ADMIN` - Developer admin (can impersonate)
- `SUPER_ADMIN` - Full access

Run the migration to set up roles:
```bash
supabase migration up
```

## Impersonation JWT

Impersonation sessions use signed JWTs with:
- 15-minute expiration
- HS256 algorithm
- Comprehensive audit logging (IP, user agent, reason)

## CORS Configuration

Currently set to `*` for development. In production, update `allowedOrigins` in:
- `supabase/functions/_shared/security-headers.ts`

Recommended production CORS:
```typescript
const allowedOrigins = [
  'https://app.obra360.com',
  'https://admin.obra360.com'
];
```
