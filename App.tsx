import * as React from 'react';
import { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ThrowScreen from './src/screens/ThrowScreen';
import PickupScreen from './src/screens/PickupScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import { AuthProvider, AuthContext } from './src/context/AuthContext';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isAuthenticated, loading } = useContext(AuthContext);

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
          <Stack.Group>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: '漂流瓶' }} />
            <Stack.Screen name="Throw" component={ThrowScreen} options={{ title: '写一封信' }} />
            <Stack.Screen name="Pickup" component={PickupScreen} options={{ title: '探索海洋' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: '我的足迹' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '个人中心' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: '编辑资料' }} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ title: '漂流瓶详情' }} />
          </Stack.Group>
        ) : (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
