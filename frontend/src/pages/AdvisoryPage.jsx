import React, { useEffect, useState } from 'react';
import { fetchAdvisories } from '../api';
import { useAuth } from '../context/AuthContext';

const AdvisoryCard = ({ title, description, icon, severity }) => {
  const colorMap = {
    high: 'var(--accent-orange)',
    medium: 'var(--accent-cyan)',
    low: '#a855f7',
    success: 'var(--accent-green)'
  };
  const color = colorMap[severity?.toLowerCase()] || 'var(--accent-blue)';
  
  return (
    <div className="glass-panel glass-panel-hover animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: `4px solid ${color}` }}>
      <div className="flex-between">
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{title}</h3>
        <div style={{ padding: '0.5rem', background: 'var(--glass-bg)', borderRadius: '50%', fontSize: '1.5rem' }}>
          {icon}
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>{description}</p>
    </div>
  );
};

const AdvisoryPage = () => {
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.location) return;
    const loadAdvisories = async () => {
      setLoading(true);
      const data = await fetchAdvisories(user.location);
      if (data && data.advisories) {
        setAdvisories(data.advisories);
      }
      setLoading(false);
    };
    loadAdvisories();
  }, [user?.location]);

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem', marginTop: '80px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="neon-text-cyan">Weather Advisory & Recommendations</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', marginTop: '0.5rem' }}>
          Live recommendations based on current weather conditions at {user?.location || 'your location'}.
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading live advisories...</p>
      ) : advisories.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {advisories.map((adv, idx) => (
            <AdvisoryCard key={idx} {...adv} />
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>No advisories currently available for your location.</p>
      )}
    </div>
  );
};

export default AdvisoryPage;
