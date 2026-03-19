const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('--- Starting API Tests ---');

  try {
    // 1. Login User 1
    console.log('\nLogging in User 1...');
    const user1Res = await axios.post(`${API_URL}/login`, { device_id: 'test-device-1' });
    const user1 = user1Res.data;
    console.log('User 1:', user1);

    // 2. Login User 2
    console.log('\nLogging in User 2...');
    const user2Res = await axios.post(`${API_URL}/login`, { device_id: 'test-device-2' });
    const user2 = user2Res.data;
    console.log('User 2:', user2);

    // 3. User 1 Throws a Bottle
    console.log('\nUser 1 throws a bottle...');
    const throwRes = await axios.post(`${API_URL}/bottle/throw`, {
      user_id: user1.id,
      content: 'Hello from User 1!'
    });
    console.log('Throw response:', throwRes.data);
    const bottleId = throwRes.data.bottle.id;

    // 4. User 2 Picks up a Bottle
    console.log('\nUser 2 picks up a bottle...');
    const pickRes = await axios.post(`${API_URL}/bottle/pickup`, {
      user_id: user2.id
    });
    console.log('Pick response:', pickRes.data);
    const pickedBottleId = pickRes.data.bottle?.id;

    if (pickedBottleId) {
       // 5. User 2 Replies to the Bottle
       console.log(`\nUser 2 replies to bottle ${pickedBottleId}...`);
       const replyRes = await axios.post(`${API_URL}/message/reply`, {
         user_id: user2.id,
         bottle_id: pickedBottleId,
         content: 'Hello, I picked your bottle!'
       });
       console.log('Reply response:', replyRes.data);

       // 6. User 2 Reports the Bottle
       console.log(`\nUser 2 reports bottle ${pickedBottleId}...`);
       const reportRes = await axios.post(`${API_URL}/bottle/report`, {
         reporter_id: user2.id,
         bottle_id: pickedBottleId,
         reason: 'Inappropriate content'
       });
       console.log('Report response:', reportRes.data);
    }

    // 7. Get User 1 History
    console.log('\nUser 1 History...');
    const historyRes = await axios.get(`${API_URL}/history?user_id=${user1.id}`);
    console.log('History Thrown:', historyRes.data.thrown.length);
    console.log('History Picked:', historyRes.data.picked.length);
    if (historyRes.data.thrown.length > 0) {
        console.log('First thrown bottle messages:', historyRes.data.thrown[0].messages);
    }

    console.log('\n--- API Tests Completed Successfully ---');
  } catch (error) {
    console.error('\n--- API Tests Failed ---');
    if (error.response) {
      console.error('Response Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

runTests();
