import React from 'react';
import { Layers, CloudLightning, Droplets, Wind, Settings } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activeLayer, setActiveLayer }) => {
  return (
    <div className="sidebar animate-fade-in" style={{ position: 'absolute', top: '80px', left: '20px', bottom: '30px', width: '250px', padding: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', backgroundColor: '#0a1128', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px' }}>
      <h3 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.2rem', textAlign: 'center' }}>Map Layers</h3>
      <div className="sidebar-menu">
        <button 
          className={`sidebar-btn ${activeLayer === 'Anomalies' ? 'active' : ''}`}
          onClick={() => setActiveLayer('Anomalies')}
        >
          <CloudLightning size={18} className="neon-text-red" />
          <span>Temperature</span>
        </button>
        <button 
          className={`sidebar-btn ${activeLayer === 'Precipitation' ? 'active' : ''}`}
          onClick={() => setActiveLayer('Precipitation')}
        >
          <Droplets size={18} className="neon-text-cyan" />
          <span>Precipitation</span>
        </button>
        <button 
          className={`sidebar-btn ${activeLayer === 'Wind Speed' ? 'active' : ''}`}
          onClick={() => setActiveLayer('Wind Speed')}
        >
          <Wind size={18} className="neon-text-cyan" />
          <span>Wind Speed</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
