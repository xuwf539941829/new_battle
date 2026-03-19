const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { io } = require('socket.io-client');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('--- Starting Stage 3 Backend Tests ---');
  let token1, token2;

  try {
    // Register & Login users
    await axios.post(`${API_URL}/auth/register`, { username: 'test3_user1', password: 'password123' }).catch(e=>e.response?.status!==409&&console.error(e));
    await axios.post(`${API_URL}/auth/register`, { username: 'test3_user2', password: 'password123' }).catch(e=>e.response?.status!==409&&console.error(e));

    const loginRes1 = await axios.post(`${API_URL}/auth/login`, { username: 'test3_user1', password: 'password123' });
    token1 = loginRes1.data.token;
    const userId1 = loginRes1.data.user.id;

    const loginRes2 = await axios.post(`${API_URL}/auth/login`, { username: 'test3_user2', password: 'password123' });
    token2 = loginRes2.data.token;
    const userId2 = loginRes2.data.user.id;

    const headers1 = { Authorization: `Bearer ${token1}` };
    const headers2 = { Authorization: `Bearer ${token2}` };

    // Update Profile
    console.log('\nUpdating Profile for User 1...');
    const profileRes = await axios.put(`${API_URL}/user/profile`, {
      nickname: 'Cool Surfer',
      bio: 'Riding the waves',
      gender: 'male',
      avatar: 'http://example.com/avatar.jpg'
    }, { headers: headers1 });
    console.log('Profile Updated:', profileRes.data.user.nickname, profileRes.data.user.bio);

    // Socket Setup
    console.log('\nSetting up Socket for User 1...');
    const socket = io('http://localhost:3000');
    socket.emit('register_user', userId1);

    socket.on('new_message', (data) => {
       console.log('>>> [Socket Event received on User 1]', data.message.content);
    });

    // Test Throw with Media
    console.log('\nUser 1 throwing bottle with media...');
    const throwRes = await axios.post(`${API_URL}/bottle/throw`, {
      content_type: 'IMAGE',
      media_url: 'http://example.com/image.jpg'
    }, { headers: headers1 });
    const bottleId = throwRes.data.bottle.id;
    console.log('Thrown bottle media_url:', throwRes.data.bottle.media_url);

    // Pick Bottle
    console.log('\nUser 2 picks a bottle...');
    const pickRes = await axios.post(`${API_URL}/bottle/pickup`, {}, { headers: headers2 });
    console.log('Picked bottle ID:', pickRes.data.bottle?.id);

    if (pickRes.data.bottle) {
       // Reply
       console.log(`\nUser 2 replies to bottle ${pickRes.data.bottle.id}...`);
       const replyRes = await axios.post(`${API_URL}/message/reply`, {
         bottle_id: pickRes.data.bottle.id,
         content: 'Hey nice pic!',
         content_type: 'TEXT'
       }, { headers: headers2 });
       console.log('Reply sent.');

       // Unread counts
       console.log('\nFetching unread counts for User 1...');
       // Wait a sec for the DB insert
       await new Promise(r => setTimeout(r, 500));
       const unreadRes = await axios.get(`${API_URL}/bottles/unread-count`, { headers: headers1 });
       console.log('Unread counts:', unreadRes.data);

       // Mark as Read
       console.log('\nMarking messages as read for User 1...');
       const readRes = await axios.patch(`${API_URL}/messages/read`, { bottle_id: pickRes.data.bottle.id }, { headers: headers1 });
       console.log('Messages marked as read count:', readRes.data.count);

       const unreadResAfter = await axios.get(`${API_URL}/bottles/unread-count`, { headers: headers1 });
       console.log('Unread counts after:', unreadResAfter.data);
    }

    // File Upload Dummy Test (Using a text file temporarily just to test multer logic)
    console.log('\nTesting file upload...');
    fs.writeFileSync('dummy.txt', 'Hello world');
    const form = new FormData();
    form.append('file', fs.createReadStream('dummy.txt'));
    const uploadRes = await axios.post(`${API_URL}/upload`, form, {
      headers: { ...headers1, ...form.getHeaders() }
    });
    console.log('Upload Response:', uploadRes.data.media_url);
    fs.unlinkSync('dummy.txt');

    console.log('\n--- Stage 3 Backend Tests Completed Successfully ---');
    socket.disconnect();
  } catch (error) {
    console.error('\n--- Stage 3 Backend Tests Failed ---');
    if (error.response) {
      console.error('Response Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

runTests();
