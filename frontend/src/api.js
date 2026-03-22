// API Service for connecting to Flask Backend

export const fetchDashboardData = async (location = null) => {
    try {
        const url = location ? `/api/dashboard?location=${encodeURIComponent(location)}` : '/api/dashboard';
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
        const response = await fetch(`/api/weather/current?city=${encodeURIComponent(city)}`);
        if (!response.ok) {
             throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching current weather:', error);
        return null;
    }
};

export const fetchAdvisories = async (location) => {
    try {
        const response = await fetch(`/api/advisory?location=${encodeURIComponent(location)}`);
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
        const url = location ? `/api/reports?location=${encodeURIComponent(location)}` : '/api/reports';
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
    const response = await fetch('/api/profile', {
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
    const response = await fetch('/api/login', {
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
    const response = await fetch('/api/register', {
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

