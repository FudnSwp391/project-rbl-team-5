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
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : ''   // App Password 16 ký tự từ Google (bỏ khoảng trắng)
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

/**
 * Gửi email thông báo sửa chữa hoàn tất
 * @param {string} toEmail - Email người nhận
 * @param {object} bookingDetails - Chi tiết lịch hẹn
 */
const sendRepairCompletionEmail = async (toEmail, bookingDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `TechCycle <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🛠️ Thiết bị của bạn đã sửa chữa xong - TechCycle',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9f9f9; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">⚡ TechCycle</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Chợ Thiết Bị Điện Tử & Sửa Chữa</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; background: white;">
          <h2 style="color: #333; margin: 0 0 12px; font-size: 20px;">Sửa chữa hoàn tất!</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 24px;">
            Chào bạn, thiết bị của bạn gửi sửa chữa tại TechCycle đã hoàn tất quá trình sửa chữa và kiểm tra chất lượng. 
            Dưới đây là thông tin chi tiết:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; color: #333;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold;">Thiết bị:</td>
              <td style="padding: 8px 0; text-align: right;">${bookingDetails.deviceType || 'Thiết bị gửi sửa'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold;">Báo lỗi chi tiết:</td>
              <td style="padding: 8px 0; text-align: right;">${bookingDetails.faultReport || 'Không phát hiện thêm lỗi'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold;">Linh kiện thay thế:</td>
              <td style="padding: 8px 0; text-align: right;">${bookingDetails.replacedParts || 'Không thay thế'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold;">Chi phí sửa chữa:</td>
              <td style="padding: 8px 0; text-align: right; color: #e74c3c; font-weight: bold;">${(bookingDetails.cost || 0).toLocaleString('vi-VN')} VND</td>
            </tr>
            ${bookingDetails.pickupDate ? `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold;">Hẹn ngày nhận máy:</td>
              <td style="padding: 8px 0; text-align: right;">${new Date(bookingDetails.pickupDate).toLocaleDateString('vi-VN')}</td>
            </tr>
            ` : ''}
          </table>

          <p style="color: #555; line-height: 1.6; margin: 0 0 24px;">
            Vui lòng đến cửa hàng của chúng tôi để nhận lại máy. Khi đi mang theo hóa đơn hoặc tin nhắn xác nhận.
          </p>

          <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 0;">
            Cảm ơn bạn đã sử dụng dịch vụ của TechCycle!
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 24px; background: #f0f0f0; text-align: center;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">
            © 2026 TechCycle. 123 Đường Ba Tháng Hai, Quận 10, TP. HCM.
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`[EMAIL] Email hoàn tất sửa chữa đã gửi tới ${toEmail}`);
};

module.exports = { sendOtpEmail, sendRepairCompletionEmail };

