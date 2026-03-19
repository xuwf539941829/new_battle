import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import apiService from '../api';

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loginUser = async () => {
      try {
        const u = await apiService.login();
        setUser(u);
      } catch (error) {
        Alert.alert('登录失败', '请检查网络连接');
      } finally {
        setLoading(false);
      }
    };
    loginUser();

    // Refresh user when screen is focused (optional, but good for limit updates)
    const unsubscribe = navigation.addListener('focus', () => {
      if (apiService.currentUser) {
         setUser(apiService.currentUser);
      }
    });
    return unsubscribe;
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>正在进入漂流瓶世界...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <Text style={styles.welcomeText}>你好，{user?.nickname}</Text>
        <Text style={styles.statsText}>
          今日扔瓶：{user?.daily_throws}/3 | 今日捞瓶：{user?.daily_picks}/5
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.throwButton]}
          onPress={() => navigation.navigate('Throw')}
        >
          <Text style={styles.buttonText}>写一封信（扔）</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.pickupButton]}
          onPress={() => navigation.navigate('Pickup')}
        >
          <Text style={styles.buttonText}>探索海洋（捞）</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.historyButton]}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.buttonText}>我的足迹</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#e6f7ff',
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 16,
    color: '#555',
  },
  actions: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  throwButton: {
    backgroundColor: '#4caf50',
  },
  pickupButton: {
    backgroundColor: '#2196f3',
  },
  historyButton: {
    backgroundColor: '#9c27b0',
    marginTop: 20,
  }
});
