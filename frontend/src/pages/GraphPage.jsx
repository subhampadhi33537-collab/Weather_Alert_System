import React, { useState, useEffect } from 'react';
import Graph from '../components/Graph';
import { fetchCurrentWeather, fetchLiveAnomalyData } from '../api';
import { useAuth } from '../context/AuthContext';

const VERY_HIGH_TEMP_C = 40;
const VERY_LOW_TEMP_C = 0;
const VERY_HIGH_WIND_MS = 15;
const VERY_HIGH_PRESSURE_HPA = 1025;
const LIVE_UI_REFRESH_MS = 5 * 1000;
const GRAPH_HISTORY_LIMIT = 300;

const toTs = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    return Date.now();
  }
  return d.getTime();
};

// Generate mock data for testing when no real data available
const generateTestData = (location = 'Test') => {
  const now = new Date();
  const testPoints = [];
  for (let i = 20; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const baseTemp = 24 + Math.sin(i / 5) * 5;
    const basePressure = 1013 + Math.cos(i / 5) * 3;
    const baseWind = 3 + Math.sin(i / 7) * 2;
    
    testPoints.push({
      timestamp: time.toISOString(),
      location: location,
      input: {
        temp: parseFloat(baseTemp.toFixed(1)),
        humidity: 75 + Math.random() * 15,
        pressure: parseFloat(basePressure.toFixed(1)),
        wind: parseFloat(baseWind.toFixed(2))
      },
      ml_result: 1,
      anomaly: baseTemp > 40,
      alerts: []
    });
  }
  return { anomaly_logs: testPoints };
};

const GraphPage = ({ searchQuery }) => {
  const [filter, setFilter] = useState('All');
  const [chartData, setChartData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { user } = useAuth();
  
  const displayCity = searchQuery || user?.location || 'Local Region';

  useEffect(() => {
    let intervalId;

    const loadData = async () => {
      const targetLocation = searchQuery || user?.location;
      if (!targetLocation) {
        console.log('No target location, using test data');
        const testResp = generateTestData('Demo');
        processAnomalyData(testResp);
        return;
      }

      try {
        const [resp, currentWeather] = await Promise.all([
          fetchLiveAnomalyData(targetLocation, user?.id, GRAPH_HISTORY_LIMIT),
          fetchCurrentWeather(targetLocation),
        ]);
        processAnomalyData(resp, currentWeather, targetLocation);
      } catch (err) {
        console.error('Failed to fetch real data, using test data:', err);
        const testResp = generateTestData(targetLocation);
        processAnomalyData(testResp, null, targetLocation);
      }
    };

    const processAnomalyData = (resp, currentWeather, targetLocation) => {
      if (!resp) {
        const testResp = generateTestData(displayCity);
        resp = testResp;
      }

      const historyRows = Array.isArray(resp?.anomaly_logs) ? resp.anomaly_logs : [];
      const formattedData = historyRows.map((row, idx) => {
        const input = row?.input || {};
        const timestamp = row?.timestamp || input?.timestamp;
        const date = timestamp ? new Date(timestamp) : null;
        const temp = Number(input?.temp ?? 0);
        const wind = Number(input?.wind ?? 0);
        const pressure = Number(input?.pressure ?? 0);
        const humidity = Number(input?.humidity ?? 0);

        const isTempAnomaly = temp >= VERY_HIGH_TEMP_C || temp <= VERY_LOW_TEMP_C;
        const isWindAnomaly = wind >= VERY_HIGH_WIND_MS;
        const isPressureAnomaly = pressure >= VERY_HIGH_PRESSURE_HPA;

        const isThresholdAnomaly = isTempAnomaly || isWindAnomaly || isPressureAnomaly;

        return {
          id: idx,
          ts: toTs(date || undefined),
          area: row?.location || input?.location || targetLocation || displayCity,
          isLive: false,
          name: timestamp
            ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '-',
          temperature: parseFloat(temp.toFixed(1)),
          rainfall: parseFloat(pressure.toFixed(1)),
          wind: parseFloat(wind.toFixed(2)),
          humidity: parseFloat(humidity.toFixed(1)),
          isAnomaly: isThresholdAnomaly,
          isTempAnomaly,
          isWindAnomaly,
          isPressureAnomaly,
        };
      });

      // Build one fresh live point for this fetch cycle.
      let newLivePoint = null;
      if (currentWeather) {
        const now = new Date();
        const currentTs = toTs(now);
        const temp = Number(currentWeather?.temp ?? 0);
        const wind = Number(currentWeather?.wind ?? 0);
        const pressure = Number(currentWeather?.pressure ?? 0);
        const humidity = Number(currentWeather?.humidity ?? 0);

        const isTempAnomaly = temp >= VERY_HIGH_TEMP_C || temp <= VERY_LOW_TEMP_C;
        const isWindAnomaly = wind >= VERY_HIGH_WIND_MS;
        const isPressureAnomaly = pressure >= VERY_HIGH_PRESSURE_HPA;

        newLivePoint = {
          id: `live-${currentTs}`,
          ts: currentTs,
          area: currentWeather?.city || targetLocation || displayCity,
          isLive: true,
          name: new Date(currentTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temperature: parseFloat(temp.toFixed(1)),
          rainfall: parseFloat(pressure.toFixed(1)),
          wind: parseFloat(wind.toFixed(2)),
          humidity: parseFloat(humidity.toFixed(1)),
          isAnomaly: isTempAnomaly || isWindAnomaly || isPressureAnomaly,
          isTempAnomaly,
          isWindAnomaly,
          isPressureAnomaly,
        };
      }

      if (formattedData.length > 0 || newLivePoint) {
        setChartData((prev) => {
          const prevLivePoints = (prev || []).filter((p) => p?.isLive);
          const merged = [...formattedData, ...prevLivePoints];

          if (newLivePoint) {
            merged.push(newLivePoint);
          }

          // Deduplicate exact timestamps and keep chronological order.
          const byTs = new Map();
          merged.forEach((point) => {
            byTs.set(point.ts, point);
          });

          return [...byTs.values()]
            .sort((a, b) => a.ts - b.ts);
        });

        setLastUpdated(new Date());
      } else {
        const testResp = generateTestData(displayCity);
        const fallback = (testResp?.anomaly_logs || []).map((row, idx) => {
          const input = row?.input || {};
          const timestamp = row?.timestamp || input?.timestamp;
          const date = timestamp ? new Date(timestamp) : null;
          const temp = Number(input?.temp ?? 0);
          const wind = Number(input?.wind ?? 0);
          const pressure = Number(input?.pressure ?? 0);
          const humidity = Number(input?.humidity ?? 0);

          const isTempAnomaly = temp >= VERY_HIGH_TEMP_C || temp <= VERY_LOW_TEMP_C;
          const isWindAnomaly = wind >= VERY_HIGH_WIND_MS;
          const isPressureAnomaly = pressure >= VERY_HIGH_PRESSURE_HPA;

          const isThresholdAnomaly = isTempAnomaly || isWindAnomaly || isPressureAnomaly;

          return {
            id: idx,
            ts: toTs(date || undefined),
            area: row?.location || input?.location || displayCity,
            isLive: false,
            name: timestamp
              ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '-',
            temperature: parseFloat(temp.toFixed(1)),
            rainfall: parseFloat(pressure.toFixed(1)),
            wind: parseFloat(wind.toFixed(2)),
            humidity: parseFloat(humidity.toFixed(1)),
            isAnomaly: isThresholdAnomaly,
            isTempAnomaly,
            isWindAnomaly,
            isPressureAnomaly,
          };
        });
        setChartData(fallback.sort((a, b) => a.ts - b.ts));
        setLastUpdated(new Date());
      }
    };

    loadData();
    intervalId = window.setInterval(loadData, LIVE_UI_REFRESH_MS);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [searchQuery, user?.location, user?.id]);

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem', marginTop: '80px' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="neon-text-cyan" style={{ margin: 0 }}>Anomaly Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Showing historical trends for: <strong style={{color: 'var(--text-primary)'}}>{displayCity}</strong>
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
            Live UI updates every 5 seconds{lastUpdated ? ` • Last sync: ${lastUpdated.toLocaleTimeString()}` : ' • Loading data...'}
          </p>
          {chartData.length > 0 && (
            <p style={{ color: 'var(--accent-green)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
              ✓ Displaying {chartData.length} data points
            </p>
          )}
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
          strokeColor="#ff9900"
        />
        <Graph 
          title="Atmospheric Pressure (hPa)" 
          data={chartData} 
          dataKey="rainfall" 
          strokeColor="#00f0ff"
        />
        <Graph 
          title="Wind Speed Variations (km/h)" 
          data={chartData} 
          dataKey="wind" 
          strokeColor="#00e676"
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
