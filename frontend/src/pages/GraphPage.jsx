import React, { useState, useEffect } from 'react';
import Graph from '../components/Graph';
import { fetchDashboardData } from '../api';
import { useAuth } from '../context/AuthContext';

const generateMockHistory = (cityName) => {
  const data = [];
  const baseTemp = 28 + (cityName.length % 5);
  const baseRain = 1010 + (cityName.length % 10);
  const baseWind = 15 + (cityName.length % 5);

  const now = new Date();
  // generate 10 recent historical data points
  for (let i = 9; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000); 
      data.push({
          name: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: parseFloat((baseTemp + (Math.random() * 8 - 4)).toFixed(1)),
          rainfall: parseFloat((baseRain + (Math.random() * 6 - 3)).toFixed(1)), 
          wind: parseFloat((baseWind + (Math.random() * 15 - 5)).toFixed(1)),
          isAnomaly: Math.random() > 0.85
      });
  }
  return data;
};

const GraphPage = ({ searchQuery }) => {
  const [filter, setFilter] = useState('All');
  const [chartData, setChartData] = useState([]);
  const { user } = useAuth();
  
  const displayCity = searchQuery || user?.location || 'Local Region';

  useEffect(() => {
    const loadData = async () => {
      // Use user's location if no search query
      const targetLocation = searchQuery || user?.location;
      const resp = await fetchDashboardData(targetLocation);
      let formattedData = [];

      if (resp && resp.weather_logs && resp.weather_logs.length > 0) {
        let logs = resp.weather_logs;

        formattedData = logs.map(log => {
          const temp = log.temp || 0;
          const humidity = log.humidity || 0;
          const wind = log.wind || 0;
          const pressure = log.pressure || 0;
          
          const isAnomaly = temp > 35 || temp < 15 || humidity > 85 || humidity < 40 || wind > 15 || pressure < 1000;

          return {
            name: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temperature: temp,
            rainfall: pressure, 
            wind: wind,
            isAnomaly: isAnomaly
          };
        }).reverse();
      }

      if (formattedData.length === 0) {
        formattedData = generateMockHistory(displayCity);
      }

      setChartData(formattedData);
    };
    
    loadData();
  }, [searchQuery, user?.location, displayCity]);

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem', marginTop: '80px' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="neon-text-cyan" style={{ margin: 0 }}>Anomaly Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Showing historical trends for: <strong style={{color: 'var(--text-primary)'}}>{displayCity}</strong>
          </p>
        </div>
        
        <div className="glass-panel flex-center" style={{ padding: '0.5rem', gap: '0.5rem', borderRadius: '50px' }}>
          {['All'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '50px',
                background: filter === f ? 'var(--accent-blue)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.3s ease'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        <Graph 
          title="Temperature Trends (°C)" 
          data={chartData} 
          dataKey="temperature" 
          strokeColor="var(--accent-orange)"
        />
        <Graph 
          title="Atmospheric Pressure (hPa)" 
          data={chartData} 
          dataKey="rainfall" 
          strokeColor="var(--accent-cyan)"
        />
        <Graph 
          title="Wind Speed Variations (km/h)" 
          data={chartData} 
          dataKey="wind" 
          strokeColor="var(--accent-green)"
        />
      </div>
    </div>
  );
};

export default GraphPage;
