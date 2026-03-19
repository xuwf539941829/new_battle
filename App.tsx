import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ThrowScreen from './src/screens/ThrowScreen';
import PickupScreen from './src/screens/PickupScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '漂流瓶' }} />
        <Stack.Screen name="Throw" component={ThrowScreen} options={{ title: '写一封信' }} />
        <Stack.Screen name="Pickup" component={PickupScreen} options={{ title: '探索海洋' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: '我的足迹' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
