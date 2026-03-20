import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import apiService from '../api';
import socketService from '../socket';
import { AuthContext } from '../context/AuthContext';

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const { logout } = useContext(AuthContext);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const u = await apiService.getMe();
        setUser(u);
      } catch (error) {
        Alert.alert('获取用户信息失败', '请重新登录');
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    // Refresh user when screen is focused (optional, but good for limit updates)
    const unsubscribe = navigation.addListener('focus', () => {
      if (apiService.currentUser) {
         setUser(apiService.currentUser);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    await logout();
  };

  const handleResetLimits = async () => {
    try {
      const res = await apiService.resetLimits();
      setUser(res.user);
      Alert.alert('成功', '次数已重置！');
    } catch (error: any) {
      Alert.alert('重置失败', error.message || '请重试');
    }
  };

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.welcomeText}>你好，{user?.nickname}</Text>
        <Text style={styles.statsText}>
          今日扔瓶：{user?.daily_throws} | 今日捞瓶：{user?.daily_picks}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.profileButton]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.buttonText}>个人中心</Text>
        </TouchableOpacity>

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

      <TouchableOpacity style={styles.debugButton} onPress={handleResetLimits}>
         <Text style={styles.debugText}>【调试：重置使用次数】</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    backgroundColor: '#ff9800',
    marginBottom: 20,
  },
  header: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  logoutButton: {
    padding: 10,
  },
  logoutText: {
    color: '#e53935',
    fontWeight: 'bold',
  },
  debugButton: {
    marginTop: 40,
    alignItems: 'center',
    padding: 10,
  },
  debugText: {
    color: '#9e9e9e',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
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
