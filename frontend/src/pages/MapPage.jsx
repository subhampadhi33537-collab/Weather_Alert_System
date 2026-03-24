import React, { useEffect, useState } from 'react';
import Map from '../components/Map';
import Sidebar from '../components/Sidebar';
import { fetchCurrentWeather } from '../api';
import { Thermometer, Wind, Droplets, Gauge } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MapPage = ({ searchQuery }) => {
  const [searchedData, setSearchedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState('Anomalies');
  const { user } = useAuth();
  
  const effectiveQuery = searchQuery || user?.location;
  const windKmh = searchedData ? (Number(searchedData.wind) * 3.6) : null;

  useEffect(() => {
    if (!effectiveQuery) return;

    const loadCityData = async () => {
      setLoading(true);
      
      const weather = await fetchCurrentWeather(effectiveQuery);
      
      if (weather) {
        try {
          const res = await fetch(`/api/geocode?city=${encodeURIComponent(effectiveQuery)}`);
          if (res.ok) {
             const geo = await res.json();
             if (geo.lat && geo.lon) {
                 weather.lat = geo.lat;
                 weather.lon = geo.lon;
             }
          }
        } catch (e) {
          console.warn("Backend geocoding fallback failed, using weather API coords instead", e);
        }
        
        setSearchedData(weather);
      } else {
        setSearchedData(null);
      }
      setLoading(false);
    };

    loadCityData();
  }, [effectiveQuery]);

  return (
    <div className="page-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Map searchedLocationData={searchedData} activeLayer={activeLayer} />
      <Sidebar activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
      
      {/* Right Hand Side Label / Panel */}
      {searchQuery && (
        <div style={{
          position: 'absolute',
          right: '20px',
          top: '100px',
          width: '320px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
            {loading ? (
               <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Gathering live data for {searchQuery}...</p>
            ) : searchedData ? (
               <>
                 <h2 className="neon-text-cyan" style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   {searchedData.city}
                   <span style={{ fontSize: '0.8rem', background: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '12px', color: 'white' }}>Live</span>
                 </h2>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                       <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Thermometer size={14} /> Temp</span>
                       <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{searchedData.temp}°C</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                       <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Wind size={14} /> Wind</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Number.isFinite(windKmh) ? windKmh.toFixed(2) : '-'} km/h</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                       <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Droplets size={14} /> Humidity</span>
                       <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{searchedData.humidity}%</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                       <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Gauge size={14} /> Pressure</span>
                       <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{searchedData.pressure} mb</span>
                    </div>
                 </div>
               </>
            ) : (
               <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No live data found for "{searchQuery}".</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default MapPage;
