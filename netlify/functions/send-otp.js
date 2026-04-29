const accountSid = 'AC3ebbf1c5dfa534586bf604e00a69ced8';
const authToken  = 'baf26523e2843ba1c917ace461b6186b';
const fromNumber = '+18445426851';

// In-memory OTP store (resets on function cold start — fine for short-lived codes)
const otpStore = {};

exports.handler = async function(event) {
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { phone } = JSON.parse(event.body);
    if(!phone) return { statusCode: 400, body: JSON.stringify({ error: 'Phone number required' }) };

    // Clean phone number
    const cleaned = phone.replace(/\D/g, '');
    if(cleaned.length < 10) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid phone number' }) };
    const e164 = '+1' + cleaned.slice(-10);

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP with 5 minute expiry
    otpStore[e164] = { code: otp, expires: Date.now() + 5 * 60 * 1000 };

    // Send via Twilio
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = new URLSearchParams({
      To: e164,
      From: fromNumber,
      Body: `Your Insurance Innovated verification code is: ${otp}. This code expires in 5 minutes.`
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      }
    );

    const result = await response.json();

    if(result.sid){
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'OTP sent successfully' })
      };
    } else {
      console.error('Twilio error:', result);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: result.message || 'Failed to send OTP' })
      };
    }

  } catch(err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
