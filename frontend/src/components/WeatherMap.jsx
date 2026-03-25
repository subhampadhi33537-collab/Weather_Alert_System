import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet-velocity/dist/leaflet-velocity.js';
import axios from 'axios';

// Fix marker icon
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl
});

L.Marker.prototype.options.icon = DefaultIcon;

// Cities
const cities = [
  { name: 'Bhubaneswar', lat: 20.2961, lon: 85.8245 },
  { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 }
];

const WeatherMap = () => {
  const map = useMap();

  const [tempData, setTempData] = useState([]);
  const [windData, setWindData] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWind, setShowWind] = useState(true);
  const [cityWeather, setCityWeather] = useState({});

  const apiKey = 'YOUR_API_KEY'; // 🔴 put your key

  // Fetch data
  useEffect(() => {
    const fetchTemp = async () => {
      const data = [];
      const weather = {};

      for (const city of cities) {
        try {
          const res = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${apiKey}`
          );

          const tempC = (res.data.main.temp - 273.15).toFixed(1);
          const windSpeed = res.data.wind.speed;

          data.push([city.lat, city.lon, tempC / 50]);
          weather[city.name] = { temp: tempC, wind: windSpeed };

        } catch (err) {
          console.error(err);
        }
      }

      setTempData(data);
      setCityWeather(weather);
    };

    const fetchWind = async () => {
      try {
        const res = await axios.get(
          'https://raw.githubusercontent.com/danwild/leaflet-velocity/master/demo/wind-global.json'
        );
        setWindData(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchTemp();
    fetchWind();
  }, []);

  // Click event
  const ClickHandler = () => {
    useMapEvents({
      click: (e) => {
        alert(`Lat: ${e.latlng.lat}, Lng: ${e.latlng.lng}`);
      }
    });
    return null;
  };

  // Heatmap
  useEffect(() => {
    if (showHeatmap && tempData.length > 0) {
      const heat = L.heatLayer(tempData, {
        radius: 30,
        blur: 20,
        gradient: {
          0.1: "blue",
          0.3: "cyan",
          0.5: "lime",
          0.7: "yellow",
          1: "red"
        }
      }).addTo(map);

      return () => map.removeLayer(heat);
    }
  }, [map, tempData, showHeatmap]);

  // Wind
  useEffect(() => {
    if (showWind && windData) {
      const velocityLayer = L.velocityLayer({
        data: windData,
        velocityScale: 0.005,
        particleAge: 120,
        lineWidth: 2,
        particleMultiplier: 1 / 300,
        frameRate: 20
      });

      velocityLayer.addTo(map);

      return () => map.removeLayer(velocityLayer);
    }
  }, [map, windData, showWind]);

  return (
    <>
      {/* Toggle buttons */}
      <div style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 1000
      }}>
        <button onClick={() => setShowHeatmap(!showHeatmap)}>
          Toggle Heat
        </button>

        <button onClick={() => setShowWind(!showWind)}>
          Toggle Wind
        </button>
      </div>

      <ClickHandler />

      {/* Markers */}
      {cities.map((city, i) => (
        <Marker key={i} position={[city.lat, city.lon]}>
          <Popup>
            <b>{city.name}</b><br />
            Temp: {cityWeather[city.name]?.temp || '...'} °C<br />
            Wind: {cityWeather[city.name]?.wind || '...'} m/s
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default WeatherMap;