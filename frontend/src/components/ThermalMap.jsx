import { useEffect, useState } from "react";
import { useMap, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// Fix marker icon
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl
});

L.Marker.prototype.options.icon = DefaultIcon;

// Sample cities
const cities = [
  { name: "Bhubaneswar", lat: 20.2961, lon: 85.8245, temp: 32 },
  { name: "Delhi", lat: 28.7041, lon: 77.1025, temp: 30 },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777, temp: 31 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707, temp: 33 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639, temp: 29 }
];

const ThermalMap = () => {
  const map = useMap();
  const [heatData, setHeatData] = useState([]);

  // Prepare heat data
  useEffect(() => {
    const data = cities.map((city) => {
      const intensity = Math.min(1.0, city.temp / 40);
      return [city.lat, city.lon, intensity];
    });

    // extra hotspots
    data.push([20.5, 79.0, 1.0]);
    data.push([24.5, 80.5, 0.95]);

    setHeatData(data);
  }, []);

  // Heatmap layer
  useEffect(() => {
    if (!map || heatData.length === 0) return;

    const heatLayer = L.heatLayer(heatData, {
      radius: 55,
      blur: 50,
      maxZoom: 12,
      minOpacity: 0.1,
      gradient: {
        0.0: "#00008b",
        0.15: "#004fff",
        0.30: "#00bfff",
        0.45: "#00ff40",
        0.60: "#ffff00",
        0.75: "#ffa500",
        0.90: "#ff2400",
        1.0: "#ff0000"
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, heatData]);

  return (
    <>
      {/* Markers */}
      {cities.map((city, index) => (
        <Marker key={index} position={[city.lat, city.lon]}>
          <Popup>
            <h3>{city.name}</h3>
            <p>Temperature: {city.temp} °C</p>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default ThermalMap;