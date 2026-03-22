import React from 'react';
import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import './AlertCard.css';

const AlertCard = ({ title, description, time, location, severity }) => {
  const severityClass = `severity-${severity.toLowerCase()}`;
  
  return (
    <div className={`alert-card glass-panel glass-panel-hover ${severityClass}`}>
      <div className="alert-header">
        <div className="alert-title flex-center">
          <AlertTriangle size={20} className="alert-icon" />
          <h3>{title}</h3>
        </div>
        <span className={`badge-severity ${severityClass}`}>{severity}</span>
      </div>
      
      <p className="alert-desc">{description}</p>
      
      <div className="alert-footer">
        <div className="alert-meta flex-center">
          <MapPin size={14} />
          <span>{location}</span>
        </div>
        <div className="alert-meta flex-center">
          <Clock size={14} />
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
