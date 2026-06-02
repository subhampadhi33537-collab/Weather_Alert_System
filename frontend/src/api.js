// API Service for connecting to Flask Backend

const DEFAULT_API_BASE_URL = 'https://weather-alert-system-gvfn.onrender.com';
const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

export const fetchDashboardData = async (location = null) => {
    try {
        const url = location ? apiUrl(`/api/dashboard?location=${encodeURIComponent(location)}`) : apiUrl('/api/dashboard');
        const response = await fetch(url);
        if (!response.ok) {
             throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return { weather_logs: [], alerts: [] };
    }
};

export const fetchCurrentWeather = async (city = 'Dhenkanal') => {
    try {
        const response = await fetch(apiUrl(`/api/weather/current?city=${encodeURIComponent(city)}`));
        if (!response.ok) {
             throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching current weather:', error);
        return null;
    }
};

export const fetchLiveAnomalyData = async (location, userId = null, userEmail = null, limit = 300, forceRefresh = false) => {
    try {
        if (!location) {
            return { anomaly_logs: [] };
        }

        const params = new URLSearchParams({
            location,
            auto_refresh: 'true',
            limit: String(limit)
        });

        if (forceRefresh) {
            params.set('force_refresh', 'true');
        }

        if (userId !== null && userId !== undefined) {
            params.set('user_id', String(userId));
        }

        if (userEmail) {
            params.set('user_email', String(userEmail));
        }

        const response = await fetch(apiUrl(`/api/anomaly/live?${params.toString()}`));
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching live anomaly data:', error);
        return { anomaly_logs: [] };
    }
};

export const fetchAdvisories = async (location) => {
    try {
        const response = await fetch(apiUrl(`/api/advisory?location=${encodeURIComponent(location)}`));
        if (!response.ok) {
             throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching advisories:', error);
        return { advisories: [] };
    }
};

export const fetchReports = async (location = null) => {
    try {
        const url = location ? apiUrl(`/api/reports?location=${encodeURIComponent(location)}`) : apiUrl('/api/reports');
        const response = await fetch(url);
        if (!response.ok) {
             throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching reports data:', error);
        return { summary: {}, weather_logs: [], alerts: [] };
    }
};

export const updateUserProfile = async (userId, location) => {
    const response = await fetch(apiUrl('/api/profile'), {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, location })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
    }
    
    return await response.json();
};

export const loginUser = async (email, password) => {
    const response = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to login');
    }
    
    return await response.json();
};

export const registerUser = async (email, password, location) => {
    const response = await fetch(apiUrl('/api/register'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, location })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to register');
    }
    
    return await response.json();
};

