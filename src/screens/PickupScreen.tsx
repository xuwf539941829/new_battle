import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import apiService from '../api';

export default function PickupScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [bottle, setBottle] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchBottle();
  }, []);

  const fetchBottle = async () => {
    try {
      const response = await apiService.pickupBottle();
      if (response.bottle) {
        setBottle(response.bottle);
      } else {
        Alert.alert('提示', response.message || '海里空空如也，晚点再来看看吧', [
          { text: '确定', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('失败', error.message || '打捞失败，请重试', [
        { text: '确定', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (replyContent.trim() === '') {
       Alert.alert('提示', '回复内容不能为空');
       return;
    }

    setReplying(true);
    try {
      await apiService.replyToBottle(bottle.id, replyContent);
      Alert.alert('成功', '回复已发送！', [
        { text: '确定', onPress: () => navigation.navigate('History') }
      ]);
    } catch (error: any) {
      Alert.alert('失败', error.message || '发送回复失败');
    } finally {
      setReplying(false);
    }
  };

  const handleReport = () => {
    Alert.prompt(
      '举报内容',
      '请输入举报原因（例如：广告、低俗内容等）',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '提交',
          onPress: async (reason?: string) => {
            if (reason) {
              try {
                await apiService.reportBottle(bottle.id, reason);
                Alert.alert('成功', '举报已提交，我们会尽快处理。', [
                  { text: '确定', onPress: () => navigation.goBack() }
                ]);
              } catch (error: any) {
                Alert.alert('失败', error.message || '举报提交失败');
              }
            }
          }
        }
      ],
      'plain-text'
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196f3" />
        <Text style={styles.loadingText}>正在努力打捞中...</Text>
      </View>
    );
  }

  if (!bottle) {
    return null; // The empty state is handled via Alert on fetch
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sender}>来自：{bottle.sender?.nickname}</Text>
          <Text style={styles.date}>{new Date(bottle.created_at).toLocaleString()}</Text>
          <View style={styles.divider} />
          <Text style={styles.content}>{bottle.content}</Text>

          <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
            <Text style={styles.reportText}>举报该内容</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.replySection}>
          <Text style={styles.replyTitle}>回复留言</Text>
          <TextInput
            style={styles.replyInput}
            multiline
            placeholder="写下你的回复..."
            value={replyContent}
            onChangeText={setReplyContent}
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.button, (replying || replyContent.trim().length === 0) ? styles.buttonDisabled : null]}
            onPress={handleReply}
            disabled={replying || replyContent.trim().length === 0}
          >
             {replying ? (
               <ActivityIndicator color="#fff" />
             ) : (
               <Text style={styles.buttonText}>发送回复</Text>
             )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 30,
  },
  sender: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  content: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333',
    minHeight: 100,
  },
  reportButton: {
    alignSelf: 'flex-end',
    marginTop: 20,
  },
  reportText: {
    fontSize: 12,
    color: '#f44336',
    textDecorationLine: 'underline',
  },
  replySection: {
    flex: 1,
  },
  replyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 10,
  },
  replyInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#90caf9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
