import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Map.css';
import { fetchDashboardData } from '../api';

const getTempColor = (temp) => {
  if (temp < 15) return '#3b82f6'; // blue
  if (temp >= 15 && temp < 25) return '#22c55e'; // green
  if (temp >= 25 && temp < 35) return '#eab308'; // yellow
  if (temp >= 35) return '#ef4444'; // red
  return '#ffffff';
};

const Map = ({ searchedLocationData, activeLayer }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const layerGroup = useRef(null);
  const searchMarkerRef = useRef(null);
  const legendRef = useRef(null);
  
  useEffect(() => {
    // Initialize map only once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapContainer.current, {
        zoomControl: false 
      }).setView([20.3, 85.8], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

      layerGroup.current = L.layerGroup().addTo(mapInstance.current);

    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Handle Dynamic Legend
  useEffect(() => {
    if (!mapInstance.current) return;

    if (legendRef.current) {
        mapInstance.current.removeControl(legendRef.current);
    }

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
      
      // Remove previous search marker if exists
      if (searchMarkerRef.current) {
        mapInstance.current.removeLayer(searchMarkerRef.current);
      }

      let color = getTempColor(temp);
      let fillOpacity = 0.8;
      
      if (activeLayer === 'Humidity') color = '#0ea5e9';
      if (activeLayer === 'Wind Speed') color = '#a855f7'; // purple for wind
      if (activeLayer === 'Atmospheric Pressure') color = '#14b8a6';

      // Create a visually distinct marker or circle for the searched location
      searchMarkerRef.current = L.circle([lat, lon], {
        color: '#ffffff', // White border to stand out
        weight: 3,
        fillColor: color,
        fillOpacity: fillOpacity,
        radius: 40000
      }).addTo(mapInstance.current);

      searchMarkerRef.current.bindPopup(`
         <div style="font-family: 'Inter', sans-serif;">
           <h4 style="margin:0 0 5px 0; color: #333; display: flex; align-items: center; gap: 5px;">
              📍 ${city}
           </h4>
           <p style="margin:0; color: #666;"><b>Temperature:</b> ${temp}°C</p>
           <p style="margin:0; color: #666;"><b>Wind Speed:</b> ${wind} km/h</p>
           <p style="margin:0; color: #666;"><b>Humidity:</b> ${humidity}%</p>
          <p style="margin:0; color: #666;"><b>Atmospheric Pressure:</b> ${pressure} hPa</p>
         </div>
      `).openPopup();
    }
  }, [searchedLocationData, activeLayer]);

  return (
    <div className="map-wrapper animate-fade-in">
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default Map;
