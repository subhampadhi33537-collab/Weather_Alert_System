import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = ({ onSearch }) => {
  const [inputValue, setInputValue] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch(inputValue);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h2 className="logo neon-text-cyan">WEATHER ALERT SYSTEM</h2>
        <ul className="nav-links">
          <li>
            <NavLink to="/map" className={({ isActive }) => (isActive ? 'active' : '')}>
              Live Map
            </NavLink>
          </li>
          <li>
            <NavLink to="/graphs" className={({ isActive }) => (isActive ? 'active' : '')}>
              Anomaly Graph
            </NavLink>
          </li>
          <li>
            <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'active' : '')}>
              Alerts
            </NavLink>
          </li>
          <li>
            <NavLink to="/advisory" className={({ isActive }) => (isActive ? 'active' : '')}>
              Advisory
            </NavLink>
          </li>
          {user ? (
            <li>
              <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
                Profile
              </NavLink>
            </li>
          ) : (
            <>
              <li>
                <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
                  Login
                </NavLink>
              </li>
              <li>
                <NavLink to="/signup" className={({ isActive }) => (isActive ? 'active' : '')}>
                  Sign Up
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="navbar-right">
        <div className="search-box glass-panel flex-center">
          <Search size={18} className="icon" />
          <input 
            type="text" 
            placeholder="Search location..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="icon-btn" onClick={() => navigate('/alerts')}>
          <Bell size={20} />
        </button>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="icon-btn user-avatar glass-panel flex-center" onClick={() => navigate('/profile')} title="Profile">
              <User size={20} />
            </button>
            <button className="icon-btn flex-center" onClick={handleLogout} title="Logout" style={{ color: '#ff4444' }}>
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <button className="icon-btn user-avatar glass-panel flex-center" onClick={() => navigate('/login')} title="Login">
            <User size={20} />
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
