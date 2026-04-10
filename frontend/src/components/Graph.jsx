import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const getPrecisionForMetric = (dataKey) => {
  if (dataKey === 'wind') return 2;
  if (dataKey === 'rainfall') return 1;
  return 1;
};

const formatMetricValue = (value, dataKey) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return '-';
  }

  const precision = getPrecisionForMetric(dataKey);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
};

const formatScanTime = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return '-';
  }
  return new Date(n).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const CustomTooltip = ({ active, payload, label, dataKey }) => {
  if (active && payload && payload.length) {
    const timeLabel = typeof label === 'number'
      ? formatScanTime(label)
      : `${label}`;
    const area = payload?.[0]?.payload?.area || payload?.[0]?.payload?.location || 'Unknown Area';

    return (
      <div className="glass-panel" style={{ padding: '10px', fontSize: '0.85rem' }}>
        <p className="neon-text-cyan">{timeLabel}</p>
        <p style={{ color: '#a0aec0', margin: '0 0 4px 0' }}>{area}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, margin: 0 }}>
            {`${entry.name}: ${formatMetricValue(entry.value, dataKey)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Customized dot to highlight anomalies
const CustomizedDot = (props) => {
  const { cx, cy, payload, dataKey, stroke } = props;
  
  if (!cx || !cy) return null;

  let isDotAnomaly = false;
  
  if (dataKey === 'temperature') isDotAnomaly = payload?.isTempAnomaly;
  else if (dataKey === 'wind') isDotAnomaly = payload?.isWindAnomaly;
  else if (dataKey === 'rainfall') isDotAnomaly = payload?.isPressureAnomaly;
  else isDotAnomaly = payload?.isAnomaly;

  if (isDotAnomaly) {
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={6} 
        fill="#ff3366" 
        stroke="#050a15" 
        strokeWidth={2} 
        style={{ filter: 'drop-shadow(0 0 6px #ff3366)' }} 
      />
    );
  }

  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={4} 
      fill={stroke || '#00f0ff'} 
      stroke="none" 
      opacity={0.9}
    />
  );
};


const Graph = ({ data, dataKey, title, strokeColor = "#2f80ed", anomalyTrendEnabled = false }) => {
  // Ensure we have valid data and proper styling
  const displayData = Array.isArray(data)
    ? data.filter((row) => Number.isFinite(row?.ts) && Number.isFinite(row?.[dataKey]))
    : [];
  const finalStrokeColor = anomalyTrendEnabled ? '#ff3366' : (strokeColor || '#2f80ed');

  const values = displayData
    .map((row) => Number(row?.[dataKey]))
    .filter((value) => Number.isFinite(value));
  const tsValues = displayData
    .map((row) => Number(row?.ts))
    .filter((value) => Number.isFinite(value));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const spread = Math.max(maxValue - minValue, 1);
  const padding = spread * 0.12;
  const yDomain = [minValue - padding, maxValue + padding];
  const minTs = tsValues.length ? Math.min(...tsValues) : Date.now();
  const maxTs = tsValues.length ? Math.max(...tsValues) : Date.now();
  const tsPadding = minTs === maxTs ? 10 * 1000 : 5 * 1000;
  const xDomain = [minTs - tsPadding, maxTs + tsPadding];
  
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '350px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h3>
      {displayData.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Waiting for data...
        </div>
      ) : (
        <div style={{ flex: 1, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData} margin={{ top: 20, right: 20, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis 
                dataKey="ts"
                type="number"
                domain={xDomain}
                stroke="#a0aec0" 
                tick={{ fill: '#a0aec0', fontSize: 12 }} 
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickFormatter={(value) => formatScanTime(value)}
                minTickGap={20}
              />
              <YAxis 
                domain={yDomain}
                allowDataOverflow={false}
                stroke="#a0aec0" 
                tick={{ fill: '#a0aec0', fontSize: 12 }} 
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickFormatter={(value) => formatMetricValue(value, dataKey)}
              />
              <Tooltip content={<CustomTooltip dataKey={dataKey} />} />
              <Line 
                type="linear" 
                dataKey={dataKey} 
                stroke={finalStrokeColor}
                strokeWidth={3}
                strokeOpacity={1}
                strokeLinecap="round"
                strokeLinejoin="round"
                connectNulls={true}
                isAnimationActive={true}
                animationDuration={700}
                animationEasing="ease-out"
                dot={(dotProps) => <CustomizedDot {...dotProps} dataKey={dataKey} stroke={finalStrokeColor} />}
                activeDot={{ r: 7, fill: finalStrokeColor, stroke: '#050a15', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Graph;
