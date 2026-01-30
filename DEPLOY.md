# Obra360 - Deployment Guide

## 🚀 Overview

This guide details the deployment process for the refactored Obra360 application. The system consists of a Frontend (Vite/React), Edge Functions (Deno), and a PostgreSQL Database (Supabase).

## 📦 Components

1.  **Database**: Supabase PostgreSQL
2.  **Auth**: Supabase Auth
3.  **Backend API**: Supabase Edge Functions
4.  **Frontend**: React SPA (Single Page Application)

## 🛠 Prerequisites

-   Supabase CLI installed
-   Node.js & NPM installed
-   Git repository access
-   Production Project Reference (Supabase)

## 📲 Deployment Steps

### 1. Database Migrations

Deploy database changes safely.

```bash
# Login to Supabase
supabase login

# Link to production project
supabase link --project-ref <prod-project-ref>

# Push migrations
supabase db push
```

**Rollback Plan:**
If migrations fail, use `supabase db reset` locally to debug, or restore from nightly backup in production dashboard.

### 2. Edge Functions

Deploy all server-side logic.

```bash
# Deploy all functions
supabase functions deploy --no-verify-jwt
```

*Note: We handle JWT verification internally via `SecurityPipeline`.*

**Environment Variables:**
Ensure these are set in the Supabase Dashboard > Edge Functions > Secrets:
-   `SUPABASE_URL`
-   `SUPABASE_SERVICE_ROLE_KEY`
-   `SUPABASE_ANON_KEY`
-   `APP_CORS_ORIGIN`

### 3. Frontend Application

Build and deploy the React application.

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Output directory: ./dist
```

**Deploy to Vercel/Netlify/Amplify:**
1.  Connect Git repository.
2.  Build settings:
    -   Framework: Vite
    -   Build command: `npm run build`
    -   Output dir: `dist`
3.  Environment Variables:
    -   `VITE_SUPABASE_URL`
    -   `VITE_SUPABASE_ANON_KEY`

## 🔄 Incremental Rollout Strategy

To avoid breaking existing users:

1.  **Database**: Migrations are additive. Old columns/tables preserved where possible.
2.  **API**: New Edge Functions deployed alongside old ones (if any).
3.  **Feature Flags**: Use `saas-admin` to disable new features (`CRM`, `FINANCE`) initially.
4.  **Canary**: Enable features for internal tenant "Obra360 Admin" first.

## 📊 Monitoring & Alerts

1.  **Sentry**: Configured for Frontend & Backend error tracking.
2.  **LogSafe**: Internal security monitoring (Phase 6).
    -   Check `/saas/audit-logs` for suspicious activity.
3.  **Supabase Dashboard**: Check "Database Health" and "Edge Function Invocations".

## 🚨 Emergency Rollback

In case of critical failure:

1.  **Frontend**: Revert Git commit and redeploy in Vercel/Netlify.
2.  **Database**: Restore PITR (Point-in-Time Recovery) backup from Supabase dashboard.
3.  **Functions**: Redeploy previous version of functions locally.

---
**Status:** Ready for Production 🟢
