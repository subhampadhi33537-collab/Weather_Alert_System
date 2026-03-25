import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import 'leaflet-velocity/dist/leaflet-velocity.js';
import './Map.css';
import axios from 'axios';

// 🎨 Temperature color
const getTempColor = (temp) => {
  if (temp < 15) return '#3b82f6';
  if (temp < 25) return '#22c55e';
  if (temp < 35) return '#eab308';
  return '#ef4444';
};

const Map = ({ searchedLocationData, activeLayer }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  const heatLayerRef = useRef(null);
  const windLayerRef = useRef(null);
  const searchMarkerRef = useRef(null);

  const [heatData, setHeatData] = useState([]);
  const [windData, setWindData] = useState(null);

  // 🚀 INIT MAP
  useEffect(() => {
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapContainer.current, {
        preferCanvas: true
      }).setView([20.3, 85.8], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);
    }
  }, []);

  // 🚀 FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🔥 Heat data
        const tempPoints = [
          [20.3, 85.8, 1.0],
          [21.5, 83.0, 0.9],
          [22.0, 86.0, 0.8],
          [19.0, 84.0, 0.7],
          [23.0, 88.0, 0.9],
          [25.0, 80.0, 0.8],
          [18.0, 78.0, 0.7],
          [26.0, 82.0, 1.0],
          [24.0, 85.0, 0.95]
        ];
        setHeatData(tempPoints);

        // 🌬️ Wind data
        const res = await axios.get(
          'https://raw.githubusercontent.com/danwild/leaflet-velocity/master/demo/wind-global.json'
        );
        setWindData(res.data);

<<<<<<< HEAD
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend glass-panel');
        div.style.padding = '10px 15px';
        div.style.background = 'rgba(10, 17, 40, 0.95)';
        div.style.color = '#fff';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid rgba(0,240,255,0.3)';
        
        if (activeLayer === 'Anomalies') {
            div.innerHTML += '<h4 style="margin: 0 0 8px 0; font-size:14px; color: var(--accent-cyan);">Temperature</h4>';
            const grades = [0, 15, 25, 35];
            const labels = ['Cold', 'Moderate', 'Warm', 'Hot'];
            const colors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444'];
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">' +
                    '<span style="background:' + colors[i] + '; width: 12px; height: 12px; display: inline-block; border-radius: 50%;"></span> ' +
                    '<span style="font-size: 12px;">' + labels[i] + '</span>' +
                    '</div>';
            }
        } else if (activeLayer === 'Humidity') {
          div.innerHTML += '<h4 style="margin: 0 0 8px 0; font-size:14px; color: var(--accent-cyan);">Humidity</h4>';
          div.innerHTML += '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span style="background:#0ea5e9; width: 12px; height: 12px; display: inline-block; border-radius: 50%;"></span> <span style="font-size: 12px;">Humidity Level</span></div>';
        } else if (activeLayer === 'Wind Speed') {
            div.innerHTML += '<h4 style="margin: 0 0 8px 0; font-size:14px; color: var(--accent-cyan);">Wind Speed</h4>';
            div.innerHTML += '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span style="background:#a855f7; width: 12px; height: 12px; display: inline-block; border-radius: 50%;"></span> <span style="font-size: 12px;">Wind Intensity</span></div>';
        } else if (activeLayer === 'Atmospheric Pressure') {
          div.innerHTML += '<h4 style="margin: 0 0 8px 0; font-size:14px; color: var(--accent-cyan);">Atmospheric Pressure</h4>';
          div.innerHTML += '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span style="background:#14b8a6; width: 12px; height: 12px; display: inline-block; border-radius: 50%;"></span> <span style="font-size: 12px;">Pressure Level</span></div>';
        }

        return div;
    };
    legend.addTo(mapInstance.current);
    legendRef.current = legend;

  }, [activeLayer]);

  // Handle Map Panning on Search
  useEffect(() => {
    if (searchedLocationData && mapInstance.current && searchedLocationData.lat && searchedLocationData.lon) {
      const { lat, lon } = searchedLocationData;
      mapInstance.current.flyTo([lat, lon], 7, { animate: true, duration: 1.5 });
    }
  }, [searchedLocationData]);

  // Handle Search Result Data plotting and Layer Coloring
  useEffect(() => {
    if (searchedLocationData && mapInstance.current && searchedLocationData.lat && searchedLocationData.lon) {
      const { lat, lon, temp, wind, humidity, pressure, city } = searchedLocationData;
      const windKmh = Number(wind) * 3.6;
      
      // Remove previous search marker if exists
      if (searchMarkerRef.current) {
        mapInstance.current.removeLayer(searchMarkerRef.current);
=======
      } catch (err) {
        console.error(err);
>>>>>>> adding_UI1
      }
    };

    fetchData();
  }, []);

  // 🌡️ HEATMAP LAYER
 useEffect(() => {
  if (!mapInstance.current || heatData.length === 0) return;

<<<<<<< HEAD
      searchMarkerRef.current.bindPopup(`
         <div style="font-family: 'Inter', sans-serif;">
           <h4 style="margin:0 0 5px 0; color: #333; display: flex; align-items: center; gap: 5px;">
              📍 ${city}
           </h4>
           <p style="margin:0; color: #666;"><b>Temperature:</b> ${temp}°C</p>
           <p style="margin:0; color: #666;"><b>Wind Speed:</b> ${Number.isFinite(windKmh) ? windKmh.toFixed(2) : '-'} km/h</p>
           <p style="margin:0; color: #666;"><b>Humidity:</b> ${humidity}%</p>
          <p style="margin:0; color: #666;"><b>Atmospheric Pressure:</b> ${pressure} hPa</p>
         </div>
      `).openPopup();
=======
  // Create only once
  if (!heatLayerRef.current) {
    heatLayerRef.current = L.heatLayer(heatData, {
      radius: 80,
      blur: 50,
      maxZoom: 10,
      minOpacity: 0.6,
      gradient: {
        0.1: "#0000ff",
        0.3: "#00ffff",
        0.5: "#00ff00",
        0.7: "#ffff00",
        1.0: "#ff0000"
      }
    }).addTo(mapInstance.current);
  }

  // Toggle visibility
  if (activeLayer?.toLowerCase().includes("temp")) {
    heatLayerRef.current.addTo(mapInstance.current);
  } else {
    mapInstance.current.removeLayer(heatLayerRef.current);
  }

}, [heatData, activeLayer]);

  // 🌬️ WIND LAYER
  useEffect(() => {
    if (!mapInstance.current || !windData) return;

    if (windLayerRef.current) {
      mapInstance.current.removeLayer(windLayerRef.current);
      windLayerRef.current = null;
>>>>>>> adding_UI1
    }

    if (activeLayer && activeLayer.toLowerCase().includes("wind")) {
      windLayerRef.current = L.velocityLayer({
        data: windData,
        velocityScale: 0.005,
        particleAge: 120,
        lineWidth: 2,
        particleMultiplier: 1 / 300,
        frameRate: 20
      });

      windLayerRef.current.addTo(mapInstance.current);
    }

  }, [windData, activeLayer]);

  // 📍 SEARCH LOCATION (RESTORED FEATURE)
  useEffect(() => {
    if (!searchedLocationData || !mapInstance.current) return;

    const { lat, lon, temp, wind, humidity, pressure, city } = searchedLocationData;

    // 🔥 Zoom to location
    mapInstance.current.flyTo([lat, lon], 7, {
      animate: true,
      duration: 1.5
    });

    // Remove old marker
    if (searchMarkerRef.current) {
      mapInstance.current.removeLayer(searchMarkerRef.current);
    }

    // 🎨 Color based on active layer
    let color = getTempColor(temp);
    if (activeLayer?.toLowerCase().includes("humidity")) color = '#0ea5e9';
    if (activeLayer?.toLowerCase().includes("wind")) color = '#a855f7';
    if (activeLayer?.toLowerCase().includes("pressure")) color = '#14b8a6';

    // 🔴 Circle marker
    searchMarkerRef.current = L.circle([lat, lon], {
      color: '#ffffff',
      weight: 2,
      fillColor: color,
      fillOpacity: 0.8,
      radius: 40000
    }).addTo(mapInstance.current);

    // 📊 Popup
    searchMarkerRef.current.bindPopup(`
      <b>${city}</b><br/>
      Temp: ${temp}°C<br/>
      Wind: ${wind} km/h<br/>
      Humidity: ${humidity}%<br/>
      Pressure: ${pressure} hPa
    `).openPopup();

  }, [searchedLocationData, activeLayer]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default Map;