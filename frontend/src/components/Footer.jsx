import { Recycle, Mail, Phone, MapPin } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container container">
        <div className="footer-section brand">
          <div className="footer-logo">
            <Recycle className="logo-icon" />
            <span className="logo-text">Tech<span>Cycle</span></span>
          </div>
          <p className="footer-desc">
            Nền tảng mua bán và sửa chữa thiết bị công nghệ cũ hàng đầu, góp phần bảo vệ môi trường, giảm thiểu rác thải điện tử tại Việt Nam.
          </p>
          <div className="environmental-impact-ticker">
            <span className="impact-pulse"></span>
            <strong>2.4 Tấn</strong> rác thải điện tử đã được giảm thiểu!
          </div>
        </div>

        <div className="footer-section links">
          <h3>Dịch Vụ</h3>
          <ul>
            <li><a href="#shop">Mua bán đồ công nghệ cũ</a></li>
            <li><a href="#repair">Đặt lịch sửa chữa lấy ngay</a></li>
            <li><a href="#recycle">Chương trình thu gom rác điện tử</a></li>
            <li><a href="#pricing">Bảng giá linh kiện tham khảo</a></li>
          </ul>
        </div>

        <div className="footer-section links">
          <h3>Hỗ Trợ</h3>
          <ul>
            <li><a href="#about">Về chúng tôi</a></li>
            <li><a href="#terms">Điều khoản sử dụng</a></li>
            <li><a href="#privacy">Chính sách bảo mật</a></li>
            <li><a href="#faq">Câu hỏi thường gặp (FAQ)</a></li>
          </ul>
        </div>

        <div className="footer-section contact">
          <h3>Liên Hệ</h3>
          <ul className="contact-list">
            <li>
              <MapPin size={18} />
              <span>Khu đô thị công nghệ FPT Đà Nẵng, Phường Ngũ Hành Sơn, TP. Đà Nẵng
              </span>
            </li>
            <li>
              <Phone size={18} />
              <span>0335928283 (8:00 - 20:00)</span>
            </li>
            <li>
              <Mail size={18} />
              <span>support@techcycle.vn</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container bottom-content">
          <p>&copy; {new Date().getFullYear()} TechCycle VN. Bảo lưu mọi quyền.</p>
          <p className="green-slogan">Công nghệ tuần hoàn - Tương lai bền vững</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
