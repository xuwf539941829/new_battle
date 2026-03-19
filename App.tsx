import * as React from 'react';
import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ThrowScreen from './src/screens/ThrowScreen';
import PickupScreen from './src/screens/PickupScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import apiService from './src/api';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Try to fetch user info to ensure token is valid
        await apiService.getMe();
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn("Auth check failed, user needs to login", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated ? (
          // Main App Stack
          <Stack.Group>
            <Stack.Screen
               name="Home"
               component={HomeScreen}
               options={{ title: '漂流瓶' }}
               initialParams={{ onLogout: () => setIsAuthenticated(false) }}
            />
            <Stack.Screen name="Throw" component={ThrowScreen} options={{ title: '写一封信' }} />
            <Stack.Screen name="Pickup" component={PickupScreen} options={{ title: '探索海洋' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: '我的足迹' }} />
          </Stack.Group>
        ) : (
          // Auth Stack
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              initialParams={{ onLogin: () => setIsAuthenticated(true) }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              initialParams={{ onLogin: () => setIsAuthenticated(true) }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
