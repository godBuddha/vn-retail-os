const axios = require('axios');
async function run() {
  try {
    const res = await axios.post('http://localhost:3001/api/v1/auth/login', { email: 'admin@retail.vn', password: 'password123' });
    if (!res.data.accessToken) {
      const res2 = await axios.post('http://localhost:3001/api/v1/auth/login', { email: 'admin@retail.vn', password: 'Admin@123' });
      token = res2.data.accessToken;
    } else {
      token = res.data.accessToken;
    }
    console.log('Logged in successfully');
    
    console.log('Sending email...');
    const mailRes = await axios.post('http://localhost:3001/api/v1/mail/compose', 
      { to: ['leduclongmaster@gmail.com'], subject: '[Test] API up', bodyHtml: '<p>Backend is fully operational now!</p>' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Email sent:', mailRes.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
run();
