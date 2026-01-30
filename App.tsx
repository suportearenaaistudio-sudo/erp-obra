import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FeatureProtectedRoute } from './components/FeatureProtectedRoute';
import { FeatureKeys } from './lib/constants/features';
import { Layout } from './components/Layout';

// Auth pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// App pages
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Inventory } from './pages/Inventory';
import { Finance } from './pages/Finance';
import { AIAssistant } from './pages/AIAssistant';
import { CRM } from './pages/CRM';
import { Procurement } from './pages/Procurement';
import { Contractors } from './pages/Contractors';

// Sentry
import * as Sentry from '@sentry/react';
import { initMonitoring } from './lib/monitoring';
import { Loader2 } from 'lucide-react';

// Initialize Sentry
initMonitoring();

// Admin pages (Lazy Loaded)
const DevAdmin = React.lazy(() => import('./pages/DevAdmin').then(module => ({ default: module.DevAdmin })));
const TenantAdmin = React.lazy(() => import('./pages/TenantAdmin').then(module => ({ default: module.TenantAdmin }))); // Also lazy load TenantAdmin if possible? No, sticking to plan. Wait, plan said DevAdmin.
// The user asked for "Lazy Loading / Code splitting: páginas grandes: DevAdmin e TestMultiTenantPage"
// I will lazy load DevAdmin and TestMultiTenantPage. 
// Note: I will checking TenantAdmin export type if I were to lazy load it, but I won't touch it to stick to specific request.
// Wait, I should also see if DevAdmin import was named. Yes { DevAdmin }.
// And TestMultiTenantPage was default.

// Test page (Lazy Loaded)
const TestMultiTenantPage = React.lazy(() => import('./pages/TestMultiTenantPage'));

// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<div className="p-4 text-red-500">Something went wrong. Please refresh.</div>}>
      <AuthProvider>
        <Router>
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="projects" element={
                    <FeatureProtectedRoute feature={FeatureKeys.PROJECTS}>
                      <Projects />
                    </FeatureProtectedRoute>
                  } />

                  <Route path="crm" element={
                    <FeatureProtectedRoute feature={FeatureKeys.CRM}>
                      <CRM />
                    </FeatureProtectedRoute>
                  } />

                  <Route path="inventory" element={
                    <FeatureProtectedRoute feature={FeatureKeys.INVENTORY}>
                      <Inventory />
                    </FeatureProtectedRoute>
                  } />

                  <Route path="procurement" element={
                    <FeatureProtectedRoute feature={FeatureKeys.PROCUREMENT}>
                      <Procurement />
                    </FeatureProtectedRoute>
                  } />

                  <Route path="contractors" element={
                    <FeatureProtectedRoute feature={FeatureKeys.CONTRACTORS}>
                      <Contractors />
                    </FeatureProtectedRoute>
                  } />

                  <Route path="finance" element={
                    <FeatureProtectedRoute feature={FeatureKeys.FINANCE}>
                      <Finance />
                    </FeatureProtectedRoute>
                  } />

                  <Route path="ai-assistant" element={
                    <FeatureProtectedRoute feature={FeatureKeys.AI_CHAT}>
                      <AIAssistant />
                    </FeatureProtectedRoute>
                  } />

                  {/* Admin routes */}
                  <Route path="dev-admin" element={<DevAdmin />} />
                  <Route path="admin" element={<TenantAdmin />} />

                  {/* Test route */}
                  <Route path="test-multitenant" element={<TestMultiTenantPage />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </React.Suspense>
        </Router>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}
export default App;