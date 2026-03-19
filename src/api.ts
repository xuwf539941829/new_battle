import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Assuming the API will be tested locally using the host's IP address.
const API_BASE_URL = 'http://127.0.0.1:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Setup Axios Interceptor to attach JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

class ApiService {
  public currentUser: any = null;

  async register(username: string, password: string) {
    try {
      const response = await api.post('/auth/register', { username, password });
      return response.data;
    } catch (error: any) {
      console.error('Register error', error);
      throw new Error(error.response?.data?.error || 'Failed to register');
    }
  }

  async login(username: string, password: string) {
    try {
      const response = await api.post('/auth/login', { username, password });
      this.currentUser = response.data.user;
      await AsyncStorage.setItem('userToken', response.data.token);
      return response.data;
    } catch (error: any) {
      console.error('Login error', error);
      throw new Error(error.response?.data?.error || 'Failed to login');
    }
  }

  async logout() {
    this.currentUser = null;
    await AsyncStorage.removeItem('userToken');
  }

  async getMe() {
    try {
      const response = await api.get('/user/me');
      this.currentUser = response.data;
      return this.currentUser;
    } catch (error: any) {
       console.error('Get me error', error);
       throw new Error(error.response?.data?.error || 'Failed to get user details');
    }
  }

  async throwBottle(content: string) {
    try {
      const response = await api.post('/bottle/throw', { content });
      this.currentUser = response.data.user;
      return response.data;
    } catch (error: any) {
      console.error('Throw bottle error', error);
      throw new Error(error.response?.data?.error || 'Failed to throw bottle');
    }
  }

  async pickupBottle() {
    try {
      const response = await api.post('/bottle/pickup');
      this.currentUser = response.data.user;
      return response.data;
    } catch (error: any) {
      console.error('Pickup bottle error', error);
      throw new Error(error.response?.data?.error || 'Failed to pick up bottle');
    }
  }

  async replyToBottle(bottleId: number, content: string) {
    try {
      const response = await api.post('/message/reply', {
        bottle_id: bottleId,
        content
      });
      return response.data;
    } catch (error: any) {
      console.error('Reply error', error);
      throw new Error(error.response?.data?.error || 'Failed to reply');
    }
  }

  async reportBottle(bottleId: number, reason: string) {
    try {
      const response = await api.post('/bottle/report', {
        bottle_id: bottleId,
        reason
      });
      return response.data;
    } catch (error: any) {
      console.error('Report error', error);
      throw new Error(error.response?.data?.error || 'Failed to report');
    }
  }

  async getHistory() {
    try {
      const response = await api.get(`/history`);
      return response.data;
    } catch (error: any) {
      console.error('History error', error);
      throw new Error(error.response?.data?.error || 'Failed to get history');
    }
  }

  async resetLimits() {
    try {
      const response = await api.post('/debug/reset-limits');
      this.currentUser = response.data.user;
      return response.data;
    } catch (error: any) {
       console.error('Debug reset error', error);
       throw new Error(error.response?.data?.error || 'Failed to reset limits');
    }
  }
}

const apiService = new ApiService();
export { apiService, api };
export default apiService;
