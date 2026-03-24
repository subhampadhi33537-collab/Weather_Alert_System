import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentWeather, fetchLiveAnomalyData } from '../api';
import { useAuth } from './AuthContext';

const TEMP_MIN_C = 10;
const TEMP_MAX_C = 40;
const WIND_MIN_KMH = 1;
const WIND_MAX_KMH = 60;
const PRESSURE_MIN_HPA = 980;
const PRESSURE_MAX_HPA = 1050;
const HUMIDITY_MIN_PCT = 20;
const HUMIDITY_MAX_PCT = 90;

const LIVE_UI_REFRESH_MS = 5 * 1000;
const GRAPH_HISTORY_LIMIT = 300;

const AnomalyDataContext = createContext({
  chartData: [],
  lastUpdated: null,
  displayCity: 'Local Region',
});

const toTs = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    return Date.now();
  }
  return d.getTime();
};

const buildThresholdFlags = (temp, humidity, pressure, windMs) => {
  const windKmh = Number(windMs) * 3.6;
  return {
    temperature: Number(temp) < TEMP_MIN_C || Number(temp) > TEMP_MAX_C,
    wind: windKmh < WIND_MIN_KMH || windKmh > WIND_MAX_KMH,
    pressure: Number(pressure) < PRESSURE_MIN_HPA || Number(pressure) > PRESSURE_MAX_HPA,
    humidity: Number(humidity) < HUMIDITY_MIN_PCT || Number(humidity) > HUMIDITY_MAX_PCT,
  };
};

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
      location,
      input: {
        temp: parseFloat(baseTemp.toFixed(1)),
        humidity: 75 + Math.random() * 15,
        pressure: parseFloat(basePressure.toFixed(1)),
        wind: parseFloat(baseWind.toFixed(2)),
      },
      ml_result: 1,
      anomaly: baseTemp > 40,
      alerts: [],
    });
  }
  return { anomaly_logs: testPoints };
};

const normalizeLocation = (value) => String(value || '').trim().toLowerCase();

const locationBase = (value) => normalizeLocation(value).split(',')[0].trim();

const isSameLocation = (a, b) => {
  const normA = normalizeLocation(a);
  const normB = normalizeLocation(b);
  if (!normA || !normB) {
    return false;
  }
  if (normA === normB) {
    return true;
  }
  return locationBase(normA) === locationBase(normB);
};

const withTimeout = async (promise, timeoutMs, fallbackValue) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timeoutId = window.setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
};

export const AnomalyDataProvider = ({ children, searchQuery }) => {
  const [chartData, setChartData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { user } = useAuth();

  const displayCity = useMemo(
    () => searchQuery || user?.location || 'Local Region',
    [searchQuery, user?.location],
  );

  useEffect(() => {
    let intervalId;
    let isCancelled = false;
    const targetLocation = searchQuery || user?.location;

    // Reset graph state as soon as location context changes.
    setChartData([]);
    setLastUpdated(null);

    const processAnomalyData = (resp, currentWeather, targetLocation) => {
      if (isCancelled) {
        return;
      }

      let payload = resp;
      if (!payload) {
        payload = generateTestData(displayCity);
      }

      const historyRows = Array.isArray(payload?.anomaly_logs) ? payload.anomaly_logs : [];

      const formattedData = historyRows.map((row, idx) => {
        const input = row?.input || {};
        const timestamp = row?.timestamp || input?.timestamp;
        const date = timestamp ? new Date(timestamp) : null;
        const temp = Number(input?.temp ?? 0);
        const wind = Number(input?.wind ?? 0);
        const pressure = Number(input?.pressure ?? 0);
        const humidity = Number(input?.humidity ?? 0);
        const windKmh = wind * 3.6;

        const backendFlags = row?.metric_flags || {};
        const thresholdFlags = buildThresholdFlags(temp, humidity, pressure, wind);

        const isTempAnomaly = typeof backendFlags.temperature === 'boolean'
          ? backendFlags.temperature
          : thresholdFlags.temperature;
        const isWindAnomaly = typeof backendFlags.wind === 'boolean'
          ? backendFlags.wind
          : thresholdFlags.wind;
        const isPressureAnomaly = typeof backendFlags.pressure === 'boolean'
          ? backendFlags.pressure
          : thresholdFlags.pressure;
        const isHumidityAnomaly = typeof backendFlags.humidity === 'boolean'
          ? backendFlags.humidity
          : thresholdFlags.humidity;
        const backendAnomaly = typeof row?.anomaly === 'boolean' ? row.anomaly : row?.ml_result === -1;

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
          wind: parseFloat(windKmh.toFixed(2)),
          humidity: parseFloat(humidity.toFixed(1)),
          isAnomaly: Boolean(backendAnomaly || isTempAnomaly || isWindAnomaly || isPressureAnomaly || isHumidityAnomaly),
          isTempAnomaly,
          isWindAnomaly,
          isPressureAnomaly,
          isHumidityAnomaly,
        };
      });

      let newLivePoint = null;
      if (currentWeather) {
        const now = new Date();
        const currentTs = toTs(now);
        const temp = Number(currentWeather?.temp ?? 0);
        const wind = Number(currentWeather?.wind ?? 0);
        const pressure = Number(currentWeather?.pressure ?? 0);
        const humidity = Number(currentWeather?.humidity ?? 0);
        const flags = buildThresholdFlags(temp, humidity, pressure, wind);
        const windKmh = wind * 3.6;

        const isTempAnomaly = flags.temperature;
        const isWindAnomaly = flags.wind;
        const isPressureAnomaly = flags.pressure;
        const isHumidityAnomaly = flags.humidity;

        newLivePoint = {
          id: `live-${currentTs}`,
          ts: currentTs,
          area: targetLocation || currentWeather?.city || displayCity,
          isLive: true,
          name: new Date(currentTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temperature: parseFloat(temp.toFixed(1)),
          rainfall: parseFloat(pressure.toFixed(1)),
          wind: parseFloat(windKmh.toFixed(2)),
          humidity: parseFloat(humidity.toFixed(1)),
          isAnomaly: isTempAnomaly || isWindAnomaly || isPressureAnomaly || isHumidityAnomaly,
          isTempAnomaly,
          isWindAnomaly,
          isPressureAnomaly,
          isHumidityAnomaly,
        };
      } else if (formattedData.length > 0) {
        // Keep appending a scan point even if current weather call times out.
        const now = new Date();
        const currentTs = toTs(now);
        const latest = formattedData[formattedData.length - 1];

        newLivePoint = {
          ...latest,
          id: `live-fallback-${currentTs}`,
          ts: currentTs,
          area: targetLocation || latest?.area || displayCity,
          isLive: true,
          name: new Date(currentTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
      }

      if (formattedData.length > 0 || newLivePoint) {
        setChartData((prev) => {
          if (isCancelled) {
            return prev;
          }

          const prevLivePoints = (prev || []).filter(
            (p) => p?.isLive && isSameLocation(p?.area, targetLocation || displayCity),
          );
          const merged = [...formattedData, ...prevLivePoints];

          if (newLivePoint) {
            merged.push(newLivePoint);
          }

          const byTs = new Map();
          merged.forEach((point) => {
            byTs.set(point.ts, point);
          });

          return [...byTs.values()]
            .sort((a, b) => a.ts - b.ts)
            .slice(-GRAPH_HISTORY_LIMIT);
        });

        if (!isCancelled) {
          setLastUpdated(new Date());
        }
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
          const flags = buildThresholdFlags(temp, humidity, pressure, wind);
          const windKmh = wind * 3.6;

          const isTempAnomaly = flags.temperature;
          const isWindAnomaly = flags.wind;
          const isPressureAnomaly = flags.pressure;
          const isHumidityAnomaly = flags.humidity;
          const isThresholdAnomaly = isTempAnomaly || isWindAnomaly || isPressureAnomaly || isHumidityAnomaly;

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
            wind: parseFloat(windKmh.toFixed(2)),
            humidity: parseFloat(humidity.toFixed(1)),
            isAnomaly: isThresholdAnomaly,
            isTempAnomaly,
            isWindAnomaly,
            isPressureAnomaly,
            isHumidityAnomaly,
          };
        });
        if (!isCancelled) {
          setChartData(fallback.sort((a, b) => a.ts - b.ts));
          setLastUpdated(new Date());
        }
      }
    };

    const loadData = async () => {
      if (isCancelled) {
        return;
      }

      if (!targetLocation) {
        const testResp = generateTestData('Demo');
        processAnomalyData(testResp);
        return;
      }

      try {
        const [resp, currentWeather] = await Promise.all([
          withTimeout(
            fetchLiveAnomalyData(targetLocation, user?.id, GRAPH_HISTORY_LIMIT),
            4000,
            { anomaly_logs: [] },
          ),
          withTimeout(
            fetchCurrentWeather(targetLocation),
            4000,
            null,
          ),
        ]);

        if (isCancelled) {
          return;
        }

        processAnomalyData(resp, currentWeather, targetLocation);
      } catch (err) {
        if (isCancelled) {
          return;
        }

        console.error('Failed to fetch real data, using test data:', err);
        const testResp = generateTestData(targetLocation);
        processAnomalyData(testResp, null, targetLocation);
      }
    };

    loadData();

    intervalId = window.setInterval(loadData, LIVE_UI_REFRESH_MS);

    return () => {
      isCancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [displayCity, searchQuery, user?.id, user?.location]);

  return (
    <AnomalyDataContext.Provider
      value={{
        chartData,
        lastUpdated,
        displayCity,
      }}
    >
      {children}
    </AnomalyDataContext.Provider>
  );
};

export const useAnomalyData = () => useContext(AnomalyDataContext);
