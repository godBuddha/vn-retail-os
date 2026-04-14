const http = require('http');

const data = JSON.stringify({
  email: 'admin@retail.vn',
  password: 'password123'
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const auth = JSON.parse(body);
      let token = auth.accessToken;
      if (!token && auth.message) {
         console.log('Login failed with password123, trying Admin@123...');
         const req2 = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
         }, res2 => {
            let b = '';
            res2.on('data', d => b += d);
            res2.on('end', () => {
                const a2 = JSON.parse(b);
                 if (a2.accessToken) { sendMail(a2.accessToken); }
                 else { console.error('Login also failed with Admin@123', a2); }
            });
         });
         req2.write(JSON.stringify({email: 'admin@retail.vn', password: 'Admin@123'}));
         req2.end();
      } else if (token) {
        sendMail(token);
      }
    } catch(e) { console.error(e) }
  });
});
req.on('error', console.error);
req.write(data);
req.end();

function sendMail(token) {
   const mailData = JSON.stringify({
      to: ['leduclongmaster@gmail.com'],
      subject: '[Auto Test] Hệ thống Mail',
      bodyHtml: '<p>Xin chào, hệ thống mail đã hoàn thành sau khi sửa lỗi phần <b>Mail Center</b> và <b>Thông báo</b>.</p>'
   });
   const mReq = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/mail/compose',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
   }, mRes => {
      let b = '';
      mRes.on('data', d => b += d);
      mRes.on('end', () => console.log('Mail sent response:', b));
   });
   mReq.write(mailData);
   mReq.end();
}
