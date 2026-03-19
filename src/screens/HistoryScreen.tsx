import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import apiService from '../api';

export default function HistoryScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'thrown' | 'picked'>('thrown');
  const [history, setHistory] = useState<{ thrown: any[], picked: any[] }>({ thrown: [], picked: [] });
  const [unreadCounts, setUnreadCounts] = useState<{ [key: number]: number }>({});

  const fetchHistoryAndUnread = async () => {
    try {
      const [historyData, unreadData] = await Promise.all([
        apiService.getHistory(),
        apiService.getUnreadCount()
      ]);
      setHistory(historyData);
      setUnreadCounts(unreadData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndUnread();
    const unsubscribe = navigation.addListener('focus', fetchHistoryAndUnread);
    return unsubscribe;
  }, [navigation]);

  const handlePressCard = (item: any) => {
    navigation.navigate('ChatDetail', { bottle_id: item.id, itemData: item });
  };

  const renderItem = ({ item }: { item: any }) => {
    const isThrown = activeTab === 'thrown';
    const otherUser = isThrown ? (item.picker_id ? '已被人捞起' : '还在漂流中') : `来自: ${item.sender?.nickname}`;
    const unread = unreadCounts[item.id] || 0;

    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePressCard(item)} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          <Text style={styles.status}>{otherUser}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>

        {unread > 0 && (
           <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
           </View>
        )}

        {item.content_type === 'TEXT' ? (
           <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
        ) : (
           <Text style={[styles.content, styles.mediaPlaceholder]}>[媒体内容]</Text>
        )}

        {item.messages && item.messages.length > 0 && (
          <View style={styles.messagesContainer}>
            <Text style={styles.messageTitle}>最新回复：</Text>
            {item.messages.slice(-1).map((msg: any) => {
               const isMe = msg.sender_id === apiService.currentUser.id;
               return (
                 <Text key={msg.id} style={isMe ? styles.myMsg : styles.theirMsg} numberOfLines={1}>
                   {isMe ? '我: ' : '对方: '}{msg.content_type === 'TEXT' ? msg.content : '[多媒体消息]'}
                 </Text>
               );
            })}
          </View>
        )}
      </TouchableOpacity>
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
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e53935',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaPlaceholder: {
    fontStyle: 'italic',
    color: '#888',
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
