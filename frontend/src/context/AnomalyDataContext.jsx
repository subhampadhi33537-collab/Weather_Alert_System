import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchLiveAnomalyData } from '../api';
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
const ALWAYS_FORCE_REFRESH = true;

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

const buildScanKey = (row, input, ts) => {
  const location = String(row?.location || input?.location || '').trim().toLowerCase();
  const temp = Number(input?.temp ?? 0).toFixed(2);
  const humidity = Number(input?.humidity ?? 0).toFixed(2);
  const pressure = Number(input?.pressure ?? 0).toFixed(2);
  const wind = Number(input?.wind ?? 0).toFixed(2);
  return `${ts}|${location}|${temp}|${humidity}|${pressure}|${wind}`;
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
  const [sessionStartTs, setSessionStartTs] = useState(() => Date.now());
  const { user } = useAuth();

  const displayCity = useMemo(
    () => searchQuery || user?.location || 'Local Region',
    [searchQuery, user?.location],
  );

  useEffect(() => {
    setSessionStartTs(Date.now());
    setChartData([]);
    setLastUpdated(null);
  }, [user?.id, user?.email, user?.location, searchQuery]);

  useEffect(() => {
    let intervalId;
    let isCancelled = false;
    const targetLocation = searchQuery || user?.location;

    const processAnomalyData = (resp, targetLocation) => {
      if (isCancelled) {
        return;
      }

      const payload = resp || { anomaly_logs: [] };
      const historyRows = Array.isArray(payload?.anomaly_logs) ? payload.anomaly_logs : [];
      const signatureCount = new Map();
      const formattedData = historyRows.map((row) => {
        const input = row?.input || {};
        const timestamp = row?.timestamp || input?.timestamp;
        const date = timestamp ? new Date(timestamp) : null;
        const ts = toTs(date || undefined);
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
        const baseKey = buildScanKey(row, input, ts);
        const seenCount = signatureCount.get(baseKey) || 0;
        signatureCount.set(baseKey, seenCount + 1);

        return {
          id: `${baseKey}#${seenCount}`,
          ts,
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
      })
        .filter((point) => point.ts >= sessionStartTs)
        .sort((a, b) => a.ts - b.ts);

      if (!isCancelled) {
        setChartData((prev) => {
          const currentSeries = Array.isArray(prev) ? prev : [];

          if (formattedData.length === 0) {
            return currentSeries;
          }

          if (currentSeries.length === 0) {
            return [formattedData[0]];
          }

          const existingIds = new Set(currentSeries.map((point) => point.id));
          const nextPoint = formattedData.find((point) => !existingIds.has(point.id));

          if (!nextPoint) {
            return currentSeries.slice(-GRAPH_HISTORY_LIMIT);
          }

          return [...currentSeries, nextPoint].slice(-GRAPH_HISTORY_LIMIT);
        });
        setLastUpdated(new Date());
      }
    };

    const loadData = async () => {
      if (isCancelled) {
        return;
      }

      if (!targetLocation) {
        setChartData([]);
        setLastUpdated(new Date());
        return;
      }

      try {
        const resp = await withTimeout(
          fetchLiveAnomalyData(
            targetLocation,
            user?.id,
            user?.email,
            GRAPH_HISTORY_LIMIT,
            ALWAYS_FORCE_REFRESH,
          ),
          4000,
          null,
        );

        if (isCancelled) {
          return;
        }

        if (!resp) {
          return;
        }

        processAnomalyData(resp, targetLocation);
      } catch (err) {
        if (isCancelled) {
          return;
        }

        console.error('Failed to fetch real data:', err);
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
  }, [displayCity, searchQuery, sessionStartTs, user?.email, user?.id, user?.location]);

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
