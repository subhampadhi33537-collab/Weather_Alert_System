import React, { useState } from 'react';
import Graph from '../components/Graph';
import { useAnomalyData } from '../context/AnomalyDataContext';

const GraphPage = () => {
  const [anomalyTrendEnabled, setAnomalyTrendEnabled] = useState(false);
  const { chartData, lastUpdated, displayCity } = useAnomalyData();

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem', marginTop: '80px' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="neon-text-cyan" style={{ margin: 0 }}>Anomaly Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Showing historical trends for: <strong style={{color: 'var(--text-primary)'}}>{displayCity}</strong>
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
            Auto updates every 5 seconds{lastUpdated ? ` • Last sync: ${lastUpdated.toLocaleTimeString()}` : ' • Loading data...'}
          </p>
          {chartData.length > 0 && (
            <p style={{ color: 'var(--accent-green)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
              ✓ Displaying {chartData.length} data points
            </p>
          )}
        </div>
        
        <div className="glass-panel flex-center" style={{ padding: '0.5rem', gap: '0.5rem', borderRadius: '50px' }}>
          <button
            onClick={() => setAnomalyTrendEnabled(false)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '50px',
              background: !anomalyTrendEnabled ? 'var(--accent-blue)' : 'transparent',
              color: !anomalyTrendEnabled ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.3s ease'
            }}
          >
            Normal Trend
          </button>
          <button
            onClick={() => setAnomalyTrendEnabled(true)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '50px',
              background: anomalyTrendEnabled ? '#ff3366' : 'transparent',
              color: anomalyTrendEnabled ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.3s ease'
            }}
          >
            Full Anomaly Trend
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        <Graph 
          title="Temperature Trends (°C)" 
          data={chartData} 
          dataKey="temperature" 
          strokeColor="#2f80ed"
          anomalyTrendEnabled={anomalyTrendEnabled}
        />
        <Graph 
          title="Atmospheric Pressure (hPa)" 
          data={chartData} 
          dataKey="rainfall" 
          strokeColor="#2f80ed"
          anomalyTrendEnabled={anomalyTrendEnabled}
        />
        <Graph 
          title="Wind Speed Variations (km/h)" 
          data={chartData} 
          dataKey="wind" 
          strokeColor="#2f80ed"
          anomalyTrendEnabled={anomalyTrendEnabled}
        />
      </div>

      {chartData.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
          Loading real anomaly data for {displayCity}...
        </p>
      )}
      {chartData.length > 0 && (
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.85rem' }}>
          Showing {chartData.some(d => d.isAnomaly) ? 'real data with anomalies' : 'real anomaly history'} - connecting line shows trends over time, red dots indicate anomalies
        </p>
      )}
    </div>
  );
};

export default GraphPage;
