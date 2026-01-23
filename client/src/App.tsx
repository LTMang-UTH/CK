import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import MainMenu from './pages/MainMenu';
import HostRoom from './pages/HostRoom';
import WaitingRoom from './pages/WaitingRoom';
import GameRoom from './pages/GameRoom';
import PlayerProfile from './pages/PlayerProfile';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [hasChecked, setHasChecked] = React.useState(false);

  useEffect(() => {
    // Only check auth once when component mounts
    // Don't auto-login on reload - user must explicitly login in each tab
    const verifyAuth = async () => {
      if (!hasChecked) {
        await checkAuth();
        setHasChecked(true);
      }
      setLoading(false);
    };
    verifyAuth();
  }, [checkAuth, hasChecked]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Đang tải...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainMenu />
            </PrivateRoute>
          }
        />
        <Route
          path="/host-room"
          element={
            <PrivateRoute>
              <HostRoom />
            </PrivateRoute>
          }
        />
        <Route
          path="/waiting-room"
          element={
            <PrivateRoute>
              <WaitingRoom />
            </PrivateRoute>
          }
        />
        <Route
          path="/game-room"
          element={
            <PrivateRoute>
              <GameRoom />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <PlayerProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <PrivateRoute>
              <ChangePassword />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

