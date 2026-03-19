import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import apiService, { API_BASE_URL } from '../api';

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const u = await apiService.getMe();
      setUser(u);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    const unsubscribe = navigation.addListener('focus', fetchProfile);
    return unsubscribe;
  }, [navigation]);

  if (loading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  // Generate full avatar URL if it's a relative path from our upload endpoint
  const avatarUrl = user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL.replace('/api', '')}${user.avatar}`) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user.nickname?.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.nickname}>{user.nickname}</Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.label}>性别:</Text>
        <Text style={styles.value}>{user.gender || '未设置'}</Text>

        <Text style={styles.label}>个人简介:</Text>
        <Text style={styles.value}>{user.bio || '这个人很懒，什么都没留下...'}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user._count?.sent_bottles || 0}</Text>
            <Text style={styles.statLabel}>累积扔瓶</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user._count?.picked_bottles || 0}</Text>
            <Text style={styles.statLabel}>累积捞瓶</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('EditProfile', { user })}
      >
        <Text style={styles.editButtonText}>编辑资料</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196f3',
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#90caf9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  nickname: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    color: '#e3f2fd',
    marginTop: 5,
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  editButton: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  editButtonText: {
    color: '#2196f3',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
