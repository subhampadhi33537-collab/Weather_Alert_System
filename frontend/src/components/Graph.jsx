import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '10px', fontSize: '0.85rem' }}>
        <p className="neon-text-cyan">{`${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, margin: 0 }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Customized dot to highlight anomalies
const CustomizedDot = (props) => {
  const { cx, cy, payload, value } = props;

  // Assuming 'isAnomaly' is a boolean flag in the payload
  if (payload.isAnomaly) {
    return (
      <circle cx={cx} cy={cy} r={6} fill="var(--accent-red)" stroke="var(--bg-primary)" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px var(--accent-red))' }} />
    );
  }

  return <circle cx={cx} cy={cy} r={4} fill="var(--accent-cyan)" stroke="none" />;
};


const Graph = ({ data, dataKey, title, strokeColor = "var(--accent-cyan)" }) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '350px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h3>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="var(--text-secondary)" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis 
              stroke="var(--text-secondary)" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={strokeColor} 
              strokeWidth={3}
              dot={<CustomizedDot />}
              activeDot={{ r: 8, fill: strokeColor, stroke: 'var(--bg-primary)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Graph;
