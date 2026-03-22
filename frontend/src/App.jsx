import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import MapPage from './pages/MapPage';
import GraphPage from './pages/GraphPage';
import AlertsPage from './pages/AlertsPage';
import AdvisoryPage from './pages/AdvisoryPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Router>
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar onSearch={setSearchQuery} />
        <main style={{ flex: 1, position: 'relative' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/map" replace />} />
            
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Application Routes - can be made protected if needed, 
                for now leaving them accessible to match previous behavior, 
                but using Profile conditionally in Navbar */}
            <Route path="/map" element={<MapPage searchQuery={searchQuery} />} />
            <Route path="/graphs" element={<GraphPage searchQuery={searchQuery} />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/advisory" element={<AdvisoryPage />} />
            
            {/* Protected Route */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
