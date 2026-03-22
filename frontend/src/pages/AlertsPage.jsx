import React, { useState, useEffect } from 'react';
import AlertCard from '../components/AlertCard';
import { fetchDashboardData } from '../api';
import { useAuth } from '../context/AuthContext';

const AlertsPage = () => {
  const [filter, setFilter] = useState('All');
  const [alertsData, setAlertsData] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      let resp = await fetchDashboardData(user?.location);
      
      // If user has no location-specific alerts to display, 
      // fetch global alerts so the page doesn't look broken.
      if (!resp?.alerts || resp.alerts.length === 0) {
          resp = await fetchDashboardData(); 
      }

      if (resp && resp.alerts) {
        const mappedAlerts = resp.alerts.map((a, idx) => ({
          id: a.id || idx,
          title: `Alert for ${a.location}`,
          description: a.message,
          time: new Date(a.timestamp).toLocaleString(),
          location: a.location,
          severity: 'High' 
        }));
        setAlertsData(mappedAlerts);
      }
    };
    loadData();
  }, [user?.location]);

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
        {filteredAlerts.length > 0 ? filteredAlerts.map(alert => (
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
