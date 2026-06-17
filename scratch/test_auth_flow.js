const API_URL = 'http://localhost:5000/api';

async function testAuthFlow() {
  try {
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'mySecurePassword123';
    const newPassword = 'myNewSecurePassword456';
    const testUsername = `user_${Date.now()}`;
    const testFullName = `Security Test User ${Date.now()}`;
    const testPhone = '098' + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    console.log(`--- Auth Flow Test ---`);
    console.log(`1. Testing existing plain-text user login (compatibility)...`);
    const loginCompatRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@techcycle.vn', password: 'admin123' })
    });
    console.log(`Login status for admin@techcycle.vn: ${loginCompatRes.status}`);
    const loginCompatData = await loginCompatRes.json();
    if (loginCompatRes.ok && loginCompatData.token) {
      console.log(`Success: Plain-text login working and backwards compatible!`);
    } else {
      console.error(`Fail: Plain-text login compatibility failed!`, loginCompatData);
    }

    console.log(`\n2. Registering a new user (with bcrypt hashing)...`);
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: testPassword,
        full_name: testFullName,
        phone: testPhone,
        role: 'customer'
      })
    });
    console.log(`Registration status: ${regRes.status}`);
    const regData = await regRes.json();
    if (!regRes.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    console.log(`Success: Registered user: ${regData.user.email}`);

    console.log(`\n3. Logging in with new bcrypt-hashed user...`);
    const loginRes1 = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    console.log(`Login status (correct credentials): ${loginRes1.status}`);
    const loginData1 = await loginRes1.json();
    if (!loginRes1.ok || !loginData1.token) {
      throw new Error(`Login failed with correct credentials: ${JSON.stringify(loginData1)}`);
    }
    console.log(`Success: Hashed user login working! Token acquired.`);

    console.log(`\n4. Testing login with wrong credentials (should fail)...`);
    const loginFailRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'wrongPassword' })
    });
    console.log(`Login status (wrong credentials): ${loginFailRes.status}`);
    const loginFailData = await loginFailRes.json();
    if (loginFailRes.status === 400) {
      console.log(`Success: Correctly rejected with 400. Msg: ${loginFailData.message}`);
    } else {
      console.error(`Fail: Expected status 400, got ${loginFailRes.status}`);
    }

    console.log(`\n5. Requesting password recovery OTP for ${testEmail}...`);
    const forgotRes = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    console.log(`Forgot password status: ${forgotRes.status}`);
    const forgotData = await forgotRes.json();
    if (!forgotRes.ok) {
      throw new Error(`Forgot password request failed: ${JSON.stringify(forgotData)}`);
    }
    console.log(`Message from server: ${forgotData.message}`);
    const otp = forgotData.otp_dev;
    console.log(`OTP (otp_dev): ${otp}`);
    if (!otp) {
      throw new Error('No OTP returned in development response/failed email response.');
    }

    console.log(`\n6. Resetting password using OTP: ${otp} to new password: ${newPassword}...`);
    const resetRes = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: otp,
        newPassword: newPassword
      })
    });
    console.log(`Reset password status: ${resetRes.status}`);
    const resetData = await resetRes.json();
    if (!resetRes.ok) {
      throw new Error(`Reset password failed: ${JSON.stringify(resetData)}`);
    }
    console.log(`Success: Password reset message: ${resetData.message}`);

    console.log(`\n7. Logging in with NEW password...`);
    const loginRes2 = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: newPassword })
    });
    console.log(`Login status with new password: ${loginRes2.status}`);
    const loginData2 = await loginRes2.json();
    if (!loginRes2.ok || !loginData2.token) {
      throw new Error(`Login with new password failed: ${JSON.stringify(loginData2)}`);
    }
    console.log(`Success: Logged in using new password!`);

    console.log(`\n8. Testing logout endpoint...`);
    const logoutRes = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData2.token}`
      }
    });
    console.log(`Logout status: ${logoutRes.status}`);
    const logoutData = await logoutRes.json();
    if (logoutRes.ok) {
      console.log(`Success: Logout message: ${logoutData.message}`);
    } else {
      console.error(`Fail: Logout failed!`, logoutData);
    }

    console.log(`\n--- Auth Flow Test Completed Successfully! ---`);
  } catch (err) {
    console.error(`Test execution failed with error:`, err);
  }
}

testAuthFlow();
