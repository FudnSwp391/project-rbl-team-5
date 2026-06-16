const nodemailer = require('nodemailer');

// Tạo transporter Gmail - force IPv4, dùng port 587 (TLS) thay vì 465 (SSL/IPv6)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,        // false = STARTTLS (port 587), true = SSL (port 465)
  requireTLS: true,
  family: 4,            // Force IPv4, tránh lỗi ECONNREFUSED IPv6
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // App Password 16 ký tự từ Google
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Gửi OTP về email để đặt lại mật khẩu
 * @param {string} toEmail - Email người nhận
 * @param {string} otp - Mã OTP 6 chữ số
 */
const sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `TechCycle <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 Mã xác nhận đặt lại mật khẩu TechCycle',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9f9f9; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">⚡ TechCycle</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Chợ Thiết Bị Điện Tử Cũ</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; background: white;">
          <h2 style="color: #333; margin: 0 0 12px; font-size: 20px;">Đặt lại mật khẩu</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 24px;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${toEmail}</strong>.
            Sử dụng mã OTP bên dưới để tiếp tục:
          </p>

          <!-- OTP Box -->
          <div style="background: #f0f4ff; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 24px;">
            <p style="color: #888; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Mã xác nhận OTP</p>
            <div style="font-size: 40px; font-weight: bold; color: #667eea; letter-spacing: 10px; font-family: monospace;">
              ${otp}
            </div>
            <p style="color: #e74c3c; font-size: 13px; margin: 12px 0 0;">
              ⏱ Mã có hiệu lực trong <strong>10 phút</strong>
            </p>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 0;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. 
            Tài khoản của bạn vẫn an toàn.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 24px; background: #f0f0f0; text-align: center;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">
            © 2026 TechCycle. Không trả lời email này.
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`[EMAIL] OTP đã gửi tới ${toEmail}`);
};

module.exports = { sendOtpEmail };
