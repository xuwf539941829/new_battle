import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import apiService, { API_BASE_URL } from '../api';

export default function EditProfileScreen({ navigation, route }: any) {
  const { user } = route.params;

  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState(user.nickname || '');
  const [bio, setBio] = useState(user.bio || '');
  const [gender, setGender] = useState(user.gender || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let finalAvatarUrl = user.avatar;

      // Upload avatar if changed
      if (avatarUri) {
         finalAvatarUrl = await apiService.uploadFile(avatarUri, 'image/jpeg');
      }

      await apiService.updateProfile({
        nickname,
        bio,
        gender,
        avatar: finalAvatarUrl
      });

      Alert.alert('成功', '资料更新成功', [
        { text: '确定', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('失败', error.message || '更新资料失败');
    } finally {
      setLoading(false);
    }
  };

  const currentAvatarUrl = avatarUri || (user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL.replace('/api', '')}${user.avatar}`) : null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
           {currentAvatarUrl ? (
             <Image source={{ uri: currentAvatarUrl }} style={styles.avatar} />
           ) : (
             <View style={styles.avatarPlaceholder}>
               <Text style={styles.avatarText}>+</Text>
             </View>
           )}
           <View style={styles.editBadge}>
             <Text style={styles.editBadgeText}>更换</Text>
           </View>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>昵称</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="请输入昵称"
        />

        <Text style={styles.label}>性别</Text>
        <View style={styles.genderRow}>
           <TouchableOpacity
             style={[styles.genderBtn, gender === '男' && styles.genderActive]}
             onPress={() => setGender('男')}
           >
             <Text style={gender === '男' ? styles.genderTextActive : styles.genderText}>男</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={[styles.genderBtn, gender === '女' && styles.genderActive]}
             onPress={() => setGender('女')}
           >
             <Text style={gender === '女' ? styles.genderTextActive : styles.genderText}>女</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={[styles.genderBtn, gender === '保密' && styles.genderActive]}
             onPress={() => setGender('保密')}
           >
             <Text style={gender === '保密' ? styles.genderTextActive : styles.genderText}>保密</Text>
           </TouchableOpacity>
        </View>

        <Text style={styles.label}>个人简介</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          placeholder="写点什么介绍一下自己吧..."
        />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>保存修改</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#eee',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  avatarText: {
    fontSize: 40,
    color: '#ccc',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    backgroundColor: '#2196f3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  form: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  genderRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  genderActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  genderText: {
    color: '#666',
  },
  genderTextActive: {
    color: '#2196f3',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#4caf50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
