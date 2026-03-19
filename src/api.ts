import axios from 'axios';
import { Platform } from 'react-native';

// Simple device ID generation for the scope of this project.
// In a real app, you'd use something like expo-application or expo-device,
// and store it securely using AsyncStorage or SecureStore.
const generateDeviceId = () => {
  return `device-${Platform.OS}-${Math.random().toString(36).substring(2, 15)}`;
};

// Assuming the API will be tested locally using the host's IP address.
// If using Android Emulator, 10.0.2.2 points to host's localhost.
// Using a generic network local IP or localhost for now. In Expo with physical device, you often need the local network IP.
const API_BASE_URL = 'http://127.0.0.1:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

class ApiService {
  private deviceId: string;
  public currentUser: any = null;

  constructor() {
    this.deviceId = generateDeviceId();
  }

  async login() {
    try {
      const response = await api.post('/login', { device_id: this.deviceId });
      this.currentUser = response.data;
      return this.currentUser;
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  }

  async throwBottle(content: string) {
    if (!this.currentUser) throw new Error('Not logged in');
    try {
      const response = await api.post('/bottle/throw', {
        user_id: this.currentUser.id,
        content
      });
      // Update limits based on response
      this.currentUser = response.data.user;
      return response.data;
    } catch (error: any) {
      console.error('Throw bottle error', error);
      throw new Error(error.response?.data?.error || 'Failed to throw bottle');
    }
  }

  async pickupBottle() {
    if (!this.currentUser) throw new Error('Not logged in');
    try {
      const response = await api.post('/bottle/pickup', {
        user_id: this.currentUser.id
      });
      this.currentUser = response.data.user;
      return response.data;
    } catch (error: any) {
      console.error('Pickup bottle error', error);
      throw new Error(error.response?.data?.error || 'Failed to pick up bottle');
    }
  }

  async replyToBottle(bottleId: number, content: string) {
    if (!this.currentUser) throw new Error('Not logged in');
    try {
      const response = await api.post('/message/reply', {
        user_id: this.currentUser.id,
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
    if (!this.currentUser) throw new Error('Not logged in');
    try {
      const response = await api.post('/bottle/report', {
        reporter_id: this.currentUser.id,
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
    if (!this.currentUser) throw new Error('Not logged in');
    try {
      const response = await api.get(`/history?user_id=${this.currentUser.id}`);
      return response.data;
    } catch (error: any) {
      console.error('History error', error);
      throw new Error(error.response?.data?.error || 'Failed to get history');
    }
  }
}

const apiService = new ApiService();
export default apiService;
