import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SharedLinkView from './pages/SharedLinkView';
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('nua_user')));

  const handleLogin = (userData) => {
    localStorage.setItem('nua_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('nua_user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register onLogin={handleLogin} /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/shared/:token" element={<SharedLinkView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;