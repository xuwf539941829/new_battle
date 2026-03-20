import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Video, Audio, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import apiService, { API_BASE_URL } from '../api';
import socketService from '../socket';

// Helper component for Audio playback
const AudioPlayer = ({ uri }: { uri: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function playSound() {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      setIsLoading(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newSound.setPositionAsync(0);
        }
      });
    } catch (e) {
      console.error('Audio playback error', e);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <TouchableOpacity style={styles.audioPlayer} onPress={playSound}>
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.audioText}>{isPlaying ? '⏸ 暂停' : '▶️ 播放语音'}</Text>
      )}
    </TouchableOpacity>
  );
};

// Helper component for Video playback with loading state
const VideoPlayer = ({ uri }: { uri: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={styles.videoContainer}>
      {isLoading && (
        <View style={styles.mediaLoadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <Video
        source={{ uri }}
        style={styles.mediaVideo}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        onLoadStart={() => setIsLoading(true)}
        onReadyForDisplay={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
    </View>
  );
};

export default function ChatDetailScreen({ navigation, route }: any) {
  const { bottle_id, itemData } = route.params;

  const [messages, setMessages] = useState<any[]>(itemData.messages || []);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Audio Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const isPreparingRef = useRef(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Determine the base state
    setMessages(itemData.messages || []);
    setLoading(false);

    // Mark as read
    apiService.markMessagesRead(bottle_id).catch(e => console.error("Failed to mark read", e));

    // Socket listener for real-time messages
    socketService.onNewMessage((data) => {
      if (data.bottle_id === bottle_id) {
        setMessages((prev) => [...prev, data.message]);
        apiService.markMessagesRead(bottle_id);
      }
    });

    return () => {
      // Cleanup if necessary
    };
  }, [bottle_id]);

  const handleSend = async (type: string = 'TEXT', mediaUrl?: string) => {
    if (type === 'TEXT' && content.trim() === '') return;

    setSending(true);
    try {
      const newMsg = await apiService.replyToBottle(bottle_id, type === 'TEXT' ? content : '[Media]', type, mediaUrl);
      setMessages((prev) => [...prev, newMsg]);
      setContent('');
    } catch (error: any) {
      Alert.alert('发送失败', error.message || '请重试');
    } finally {
      setSending(false);
    }
  };

  const handlePickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSending(true);
      try {
        const type = asset.type === 'video' ? 'VIDEO' : 'IMAGE';
        const url = await apiService.uploadFile(asset.uri, type === 'VIDEO' ? 'video/mp4' : 'image/jpeg');
        await handleSend(type, url);
      } catch (e: any) {
        Alert.alert('上传失败', e.message);
        setSending(false);
      }
    }
  };

  // Audio Recording Functions
  async function startRecording() {
    if (isPreparingRef.current) return;

    try {
      isPreparingRef.current = true;
      if (recording) {
        console.warn('Recording already in progress or not cleaned up. Unloading previous.');
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      // Since prepare is async, the user might have released the button already
      // Checking local state or ref isn't perfect, but at least we've secured the creation phase.
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
      setRecording(null);
    } finally {
      isPreparingRef.current = false;
    }
  }

  async function stopRecording() {
    setIsRecording(false);

    // If the user released the button while prepare was still running,
    // we wait briefly or simply rely on the fact that recording might be null.
    // In a real production app, you might want to await isPreparingRef.current === false
    // For now, if recording is null, we just exit, which prevents crashing but abandons the recording.
    if (!recording) {
       return;
    }

    setSending(true);

    const activeRecording = recording;
    setRecording(null); // Clear state immediately so subsequent presses don't grab the same object

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();

      // Reset Audio Mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri) {
         const url = await apiService.uploadFile(uri, 'audio/m4a');
         await handleSend('VOICE', url);
      }
    } catch (error: any) {
       console.error('Recording stop error', error);
       Alert.alert('发送语音失败', error.message);
    } finally {
       setSending(false);
    }
  }

  const renderMedia = (msg: any) => {
    if (!msg.media_url) return null;
    const fullUrl = msg.media_url.startsWith('http') ? msg.media_url : `${API_BASE_URL.replace('/api', '')}${msg.media_url}`;

    if (msg.content_type === 'IMAGE') {
      return <Image source={{ uri: fullUrl }} style={styles.mediaImage} resizeMode="cover" />;
    } else if (msg.content_type === 'VIDEO') {
      return <VideoPlayer uri={fullUrl} />;
    } else if (msg.content_type === 'VOICE') {
      return <AudioPlayer uri={fullUrl} />;
    }
    return <Text style={styles.unsupportedText}>[不支持的媒体类型]</Text>;
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === apiService.currentUser?.id;

    return (
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
        {item.content_type === 'TEXT' ? (
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
            {item.content}
          </Text>
        ) : (
          renderMedia(item)
        )}
        <Text style={[styles.time, isMe ? styles.myTime : styles.theirTime]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn} onPress={handlePickMedia} disabled={sending || isRecording}>
          <Text style={styles.attachText}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
           style={[styles.attachBtn, isRecording && styles.recordingBtn]}
           onPressIn={startRecording}
           onPressOut={stopRecording}
           disabled={sending}
        >
          <Text style={styles.attachText}>🎤</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={isRecording ? "正在录音...松开发送" : "输入回复..."}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={300}
          editable={!isRecording && !sending}
        />

        <TouchableOpacity
          style={[styles.sendBtn, (!content.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => handleSend('TEXT')}
          disabled={!content.trim() || sending || isRecording}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>发送</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  listContent: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196f3',
    borderBottomRightRadius: 0,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#333',
  },
  time: {
    fontSize: 10,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  myTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirTime: {
    color: '#999',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 5,
  },
  attachText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 28,
  },
  recordingBtn: {
    backgroundColor: '#ffcdd2',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  sendBtnDisabled: {
    backgroundColor: '#b0bec5',
  },
  sendText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
  },
  mediaVideo: {
    width: 200,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: 200,
    height: 150,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  mediaLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  audioPlayer: {
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  audioText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  unsupportedText: {
    color: '#f44336',
    fontStyle: 'italic',
  }
});
