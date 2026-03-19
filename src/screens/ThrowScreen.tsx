import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import apiService from '../api';

export default function ThrowScreen({ navigation }: any) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const MAX_CHARS = 300;

  const handleThrow = async () => {
    if (content.trim() === '') {
      Alert.alert('提示', '内容不能为空哦！');
      return;
    }

    setLoading(true);
    try {
      await apiService.throwBottle(content);
      Alert.alert('成功', '你的瓶子已经扔进大海啦！', [
        { text: '确定', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('失败', error.message || '扔瓶子失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>写下你想说的话，让它随着波浪漂流...</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={10}
          maxLength={MAX_CHARS}
          placeholder="分享你的心情、故事..."
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {content.length}/{MAX_CHARS}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, (loading || content.length === 0) ? styles.buttonDisabled : null]}
        onPress={handleThrow}
        disabled={loading || content.length === 0}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>把瓶子扔出去</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  prompt: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#fafafa',
    marginBottom: 30,
    minHeight: 250,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    marginTop: 10,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
