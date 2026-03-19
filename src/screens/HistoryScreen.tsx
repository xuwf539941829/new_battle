import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import apiService from '../api';

export default function HistoryScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'thrown' | 'picked'>('thrown');
  const [history, setHistory] = useState<{ thrown: any[], picked: any[] }>({ thrown: [], picked: [] });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await apiService.getHistory();
      setHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isThrown = activeTab === 'thrown';
    const otherUser = isThrown ? (item.picker_id ? '已被人捞起' : '还在漂流中') : `来自: ${item.sender?.nickname}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.status}>{otherUser}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <Text style={styles.content} numberOfLines={3}>{item.content}</Text>

        {item.messages && item.messages.length > 0 && (
          <View style={styles.messagesContainer}>
            <Text style={styles.messageTitle}>留言互动：</Text>
            {item.messages.map((msg: any) => {
               const isMe = msg.sender_id === apiService.currentUser.id;
               return (
                 <Text key={msg.id} style={isMe ? styles.myMsg : styles.theirMsg}>
                   {isMe ? '我: ' : '对方: '}{msg.content}
                 </Text>
               );
            })}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9c27b0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'thrown' && styles.activeTab]}
          onPress={() => setActiveTab('thrown')}
        >
          <Text style={[styles.tabText, activeTab === 'thrown' && styles.activeTabText]}>我扔出的 ({history.thrown.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'picked' && styles.activeTab]}
          onPress={() => setActiveTab('picked')}
        >
          <Text style={[styles.tabText, activeTab === 'picked' && styles.activeTabText]}>我捞到的 ({history.picked.length})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'thrown' ? history.thrown : history.picked}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>这里空空如也~</Text>
          </View>
        }
      />
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
    backgroundColor: '#f9f9f9',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#9c27b0',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#9c27b0',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9c27b0',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  messagesContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  messageTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  myMsg: {
    fontSize: 14,
    color: '#1976d2',
    marginTop: 4,
  },
  theirMsg: {
    fontSize: 14,
    color: '#e64a19',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  }
});
