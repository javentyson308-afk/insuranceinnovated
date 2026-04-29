const accountSid = 'AC3ebbf1c5dfa534586bf604e00a69ced8';
const authToken  = 'baf26523e2843ba1c917ace461b6186b';

// Shared OTP store — must match send-otp.js
// NOTE: In production use Redis or a database for persistence across function instances
const otpStore = {};

exports.handler = async function(event) {
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { phone, code } = JSON.parse(event.body);
    if(!phone || !code) return { statusCode: 400, body: JSON.stringify({ error: 'Phone and code required' }) };

    const cleaned = phone.replace(/\D/g, '');
    const e164 = '+1' + cleaned.slice(-10);

    const record = otpStore[e164];

    if(!record){
      return { statusCode: 400, body: JSON.stringify({ error: 'No OTP found. Please request a new code.' }) };
    }

    if(Date.now() > record.expires){
      delete otpStore[e164];
      return { statusCode: 400, body: JSON.stringify({ error: 'Code expired. Please request a new one.' }) };
    }

    if(record.code !== code.trim()){
      return { statusCode: 400, body: JSON.stringify({ error: 'Incorrect code. Please try again.' }) };
    }

    // Valid — clear the code
    delete otpStore[e164];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, verified: true })
    };

  } catch(err) {
    console.error('Verify error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
