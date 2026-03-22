import React, { useState, useEffect } from 'react';
import { User, MapPin, Save, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../api';

const ProfilePage = () => {
  const { user, login } = useAuth();
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user?.location) {
      setLocation(user.location);
    }
  }, [user]);

  const handleSave = async () => {
    if (!location.trim()) {
      setMessage({ text: 'Location cannot be empty', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const updatedUserRes = await updateUserProfile(user.id, location);
      if (updatedUserRes && updatedUserRes.user) {
         login({ ...user, location: updatedUserRes.user.location });
         setMessage({ text: 'Profile updated successfully!', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem', marginTop: '80px', maxWidth: '600px' }}>
      <h1 className="neon-text-cyan" style={{ marginBottom: '2rem' }}>Profile Settings</h1>
      
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        
        {/* Profile Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--glass-bg)', border: '2px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={40} className="neon-text-cyan" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>User Profile</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={16} /> {user?.location || 'Unknown'}
            </p>
          </div>
        </div>

        {message.text && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            borderRadius: '8px', 
            background: message.type === 'error' ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,136,0.1)',
            color: message.type === 'error' ? '#ff4444' : '#00ff88',
            textAlign: 'center'
          }}>
            {message.text}
          </div>
        )}

        {/* User Details Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Email Address (Read-only)</label>
            <div className="search-box glass-panel" style={{ display: 'flex', alignItems: 'center', borderRadius: '8px', padding: '0.8rem 1rem', opacity: 0.7 }}>
              <Mail size={18} style={{ color: 'var(--text-secondary)', marginRight: '10px' }} />
              <input type="text" value={user?.email || ''} readOnly style={{ width: '100%', cursor: 'not-allowed' }} />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Location (City)</label>
            <div className="search-box glass-panel" style={{ display: 'flex', alignItems: 'center', borderRadius: '8px', padding: '0.8rem 1rem' }}>
              <MapPin size={18} style={{ color: 'var(--text-secondary)', marginRight: '10px' }} />
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="Enter city name..."
                style={{ width: '100%' }} 
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              This location will be used to fetch live weather data, anomalies, and advisories.
            </span>
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          className="glass-panel" 
          style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-blue)', color: 'white', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.3s ease', opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
        >
          <Save size={20} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>

      </div>
    </div>
  );
};

export default ProfilePage;
