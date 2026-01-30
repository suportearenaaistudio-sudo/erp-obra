import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
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

// Admin pages
import { DevAdmin } from './pages/DevAdmin';
import { TenantAdmin } from './pages/TenantAdmin';

// Test page
import TestMultiTenantPage from './pages/TestMultiTenantPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="crm" element={<CRM />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="procurement" element={<Procurement />} />
              <Route path="contractors" element={<Contractors />} />
              <Route path="finance" element={<Finance />} />
              <Route path="ai-assistant" element={<AIAssistant />} />

              {/* Admin routes */}
              <Route path="dev-admin" element={<DevAdmin />} />
              <Route path="admin" element={<TenantAdmin />} />

              {/* Test route */}
              <Route path="test-multitenant" element={<TestMultiTenantPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;