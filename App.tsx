import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Inventory } from './pages/Inventory';
import { Finance } from './pages/Finance';
import { AIAssistant } from './pages/AIAssistant';
import { CRM } from './pages/CRM';
import { Procurement } from './pages/Procurement';
import { Contractors } from './pages/Contractors';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="crm" element={<CRM />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="contractors" element={<Contractors />} />
          <Route path="finance" element={<Finance />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;