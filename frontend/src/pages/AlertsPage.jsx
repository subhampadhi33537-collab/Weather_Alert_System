import React, { useState, useEffect } from 'react';
import AlertCard from '../components/AlertCard';
import { fetchDashboardData } from '../api';
import { useAuth } from '../context/AuthContext';

const AlertsPage = () => {
  const [filter, setFilter] = useState('All');
  const [alertsData, setAlertsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setAlertsData([]);
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      const resp = await fetchDashboardData(user?.location);

      if (isMounted) {
        const mappedAlerts = (resp?.alerts || []).map((a, idx) => ({
          id: a.id || idx,
          title: `Alert for ${a.location || 'Unknown'}`,
          description: a.message || 'Anomaly condition detected.',
          time: a.timestamp ? new Date(a.timestamp).toLocaleString() : 'Now',
          location: a.location || 'Unknown',
          severity: ['High', 'Medium', 'Low'].includes(a?.severity) ? a.severity : 'High'
        }));
        setAlertsData(mappedAlerts);
        setLoading(false);
      }
    };

    loadData();

    // Keep alert cards in sync with backend anomaly checks.
    const intervalId = window.setInterval(loadData, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user?.location]);

  if (!user) {
    return (
      <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem', marginTop: '80px' }}>
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <h1 className="neon-text-cyan">Active Alerts</h1>
          <div className="glass-panel" style={{ padding: '0.4rem', borderRadius: '50px', display: 'flex' }}>
            {['All', 'High', 'Medium', 'Low'].map(lvl => (
              <button
                key={lvl}
                type="button"
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '50px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'default'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>No data present.</p>
      </div>
    );
  }

  const filteredAlerts = filter === 'All' 
    ? alertsData 
    : alertsData.filter(a => a.severity === filter);

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem', marginTop: '80px' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h1 className="neon-text-cyan">Active Alerts</h1>
        <div className="glass-panel" style={{ padding: '0.4rem', borderRadius: '50px', display: 'flex' }}>
          {['All', 'High', 'Medium', 'Low'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '50px',
                background: filter === lvl ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filter === lvl ? '#fff' : 'var(--text-secondary)'
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
        ) : filteredAlerts.length > 0 ? filteredAlerts.map(alert => (
          <AlertCard 
            key={alert.id}
            {...alert}
          />
        )) : (
          <p style={{ color: 'var(--text-secondary)' }}>No active alerts fetched from backend.</p>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
