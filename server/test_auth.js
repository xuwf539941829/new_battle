const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('--- Starting Auth API Tests ---');

  let token1, token2;

  try {
    // 1. Register User 1
    console.log('\nRegistering User 1...');
    try {
      await axios.post(`${API_URL}/auth/register`, { username: 'testuser1', password: 'password123' });
    } catch (e) {
      if(e.response && e.response.status !== 409) throw e;
    }

    // 2. Login User 1
    console.log('Logging in User 1...');
    const loginRes1 = await axios.post(`${API_URL}/auth/login`, { username: 'testuser1', password: 'password123' });
    token1 = loginRes1.data.token;
    console.log('User 1 Token:', token1.substring(0, 10) + '...');

    const headers1 = { Authorization: `Bearer ${token1}` };

    // 3. Register User 2
    console.log('\nRegistering User 2...');
    try {
      await axios.post(`${API_URL}/auth/register`, { username: 'testuser2', password: 'password123' });
    } catch(e) {
      if(e.response && e.response.status !== 409) throw e;
    }

    // 4. Login User 2
    console.log('Logging in User 2...');
    const loginRes2 = await axios.post(`${API_URL}/auth/login`, { username: 'testuser2', password: 'password123' });
    token2 = loginRes2.data.token;
    console.log('User 2 Token:', token2.substring(0, 10) + '...');
    const headers2 = { Authorization: `Bearer ${token2}` };

    // 5. User 1 Get Me
    console.log('\nFetching User 1 Info (GET /api/user/me)...');
    const meRes = await axios.get(`${API_URL}/user/me`, { headers: headers1 });
    console.log('User 1 Info:', meRes.data.nickname);

    // 6. User 1 Throws a Bottle
    console.log('\nUser 1 throws a bottle...');
    const throwRes = await axios.post(`${API_URL}/bottle/throw`, { content: 'Auth test bottle!' }, { headers: headers1 });
    console.log('Throw response bottle status:', throwRes.data.bottle.status);

    // 7. Debug Reset Limits User 1
    console.log('\nResetting limits for User 1...');
    const resetRes = await axios.post(`${API_URL}/debug/reset-limits`, {}, { headers: headers1 });
    console.log('Limits reset:', resetRes.data.user.daily_throws, resetRes.data.user.daily_picks);

    console.log('\n--- Auth API Tests Completed Successfully ---');
  } catch (error) {
    console.error('\n--- Auth API Tests Failed ---');
    if (error.response) {
      console.error('Response Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

runTests();
