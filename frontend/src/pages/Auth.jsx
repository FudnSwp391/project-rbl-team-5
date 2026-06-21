import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Recycle, Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, Phone } from 'lucide-react';
import './Auth.css';

const Auth = ({ setActivePage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, error: authError } = useAuth();
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Các state cho chức năng Quên mật khẩu
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Nhập email gửi OTP, 2: Nhập OTP đặt lại mật khẩu
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

  // Gửi API yêu cầu mã OTP khôi phục mật khẩu
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setFormError('');
    setForgotSuccessMessage('');
    setLoading(true);

    if (!email) {
      setFormError('Vui lòng nhập địa chỉ Email.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gửi mã OTP thất bại.');
      }
      setForgotSuccessMessage(data.message);
      setForgotStep(2);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gửi API đặt lại mật khẩu mới bằng OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');
    setForgotSuccessMessage('');
    setLoading(true);

    if (!otp || !newPassword || !confirmNewPassword) {
      setFormError('Vui lòng điền đầy đủ mã OTP và mật khẩu mới.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setFormError('Mật khẩu mới không khớp.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Đặt lại mật khẩu thất bại.');
      }
      alert('Khôi phục mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.');
      setIsForgotPassword(false);
      setForgotStep(1);
      setPassword('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    if (!email || !password) {
      setFormError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const loggedInUser = await login(email, password);
        const role = loggedInUser?.role?.toLowerCase();
        if (role === 'admin' || role === 'technician' || role === 'seller') {
          // Add 50ms delay to allow React state propagation before navigation
          setTimeout(() => {
            window.location.hash = '#/dashboard';
          }, 50);
        } else {
          window.location.hash = '#/home';
        }
      } else {
        if (!username) {
          setFormError('Vui lòng nhập họ và tên của bạn.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setFormError('Mật khẩu xác nhận không khớp.');
          setLoading(false);
          return;
        }
        if (!phoneNumber || !phoneNumber.trim()) {
          setFormError('Vui lòng nhập số điện thoại.');
          setLoading(false);
          return;
        }
        const phoneRegex = /^0\d{9,10}$/;
        if (!phoneRegex.test(phoneNumber.trim())) {
          setFormError('Số điện thoại không hợp lệ. Vui lòng nhập 10-11 số bắt đầu bằng 0.');
          setLoading(false);
          return;
        }
        await register(username, email, password, phoneNumber.trim(), 'customer');
        window.location.hash = '#/home';
      }
    } catch (err) {
      console.error('Authentication Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container animate-fade">
      <div className="auth-card-container glass-panel">
        {/* Left Side: Professional Motherboard & Stats Panel */}
        <div className="auth-brand-panel">
          <div className="brand-logo" onClick={() => setActivePage('home')}>
            <Recycle size={32} className="logo-pulse" />
            <span>TechCycle</span>
          </div>
          
          <div className="brand-slogan-wrap">
            <h2>Gia nhập cuộc cách mạng xanh</h2>
            <p>Sử dụng công nghệ để đóng góp bảo vệ hành tinh của chúng ta cho thế hệ sau.</p>
          </div>

          {/* Stats counters */}
          <div className="auth-stats-box">
            <div className="auth-stat-item">
              <span className="auth-stat-num">2.5k kg</span>
              <span className="auth-stat-label">Rác thải điện tử giảm thiểu</span>
            </div>
            <div className="auth-stat-item">
              <span className="auth-stat-num">15k+</span>
              <span className="auth-stat-label">Khách hàng tin tưởng</span>
            </div>
          </div>
          
          {/* Decorative motherboard layout pattern */}
          <div className="motherboard-graphics">
            <div className="circuit-line cl-1"></div>
            <div className="circuit-line cl-2"></div>
            <div className="circuit-node cn-1"></div>
            <div className="circuit-node cn-2"></div>
            <div className="circuit-chip">ECO</div>
          </div>
        </div>

        {/* Right Side: Professional Refined Forms */}
        <div className="auth-form-panel">
          {isForgotPassword ? (
            <div className="auth-form-forgot-pass">
              <div className="auth-tabs">
                <button className="auth-tab active" type="button">Quên mật khẩu</button>
              </div>

              <form onSubmit={forgotStep === 1 ? handleRequestOtp : handleResetPassword} className="auth-form">
                {/* Success message */}
                {forgotSuccessMessage && (
                  <div className="auth-success-box animate-fade" style={{ backgroundColor: 'rgba(52, 168, 83, 0.12)', color: '#2e7d32', border: '1px solid rgba(52, 168, 83, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
                    <span>{forgotSuccessMessage}</span>
                  </div>
                )}

                {/* Errors */}
                {formError && (
                  <div className="auth-error-box animate-fade">
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {forgotStep === 1 ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email tài khoản</label>
                      <div className="auth-input-wrapper">
                        <Mail size={18} className="input-icon" />
                        <input 
                          type="email" 
                          className="form-control" 
                          placeholder="name@example.com" 
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                      {loading ? 'Đang xử lý...' : 'Gửi mã OTP khôi phục'}
                      <ArrowRight size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Mã OTP (xem log console server)</label>
                      <div className="auth-input-wrapper">
                        <Lock size={18} className="input-icon" />
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Nhập 6 chữ số" 
                          value={otp}
                          onChange={e => setOtp(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Mật khẩu mới</label>
                      <div className="auth-input-wrapper">
                        <Lock size={18} className="input-icon" />
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          className="form-control password-input" 
                          placeholder="••••••••" 
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                        />
                        <button 
                          type="button" 
                          className="password-toggle-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Xác nhận mật khẩu mới</label>
                      <div className="auth-input-wrapper">
                        <Lock size={18} className="input-icon" />
                        <input 
                          type={showConfirmNewPassword ? "text" : "password"} 
                          className="form-control password-input" 
                          placeholder="••••••••" 
                          value={confirmNewPassword}
                          onChange={e => setConfirmNewPassword(e.target.value)}
                          required
                        />
                        <button 
                          type="button" 
                          className="password-toggle-btn"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        >
                          {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                      {loading ? 'Đang cập nhật...' : 'Xác nhận đặt lại mật khẩu'}
                      <ArrowRight size={18} />
                    </button>
                  </>
                )}

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <a href="#login" className="forgot-password" onClick={e => { e.preventDefault(); setIsForgotPassword(false); setFormError(''); setForgotSuccessMessage(''); }}>
                    Quay lại trang Đăng nhập
                  </a>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Tab Selection */}
              <div className="auth-tabs">
                <button 
                  className={`auth-tab ${isLogin ? 'active' : ''}`}
                  onClick={() => { setIsLogin(true); setFormError(''); }}
                >
                  Đăng nhập
                </button>
                <button 
                  className={`auth-tab ${!isLogin ? 'active' : ''}`}
                  onClick={() => { setIsLogin(false); setFormError(''); }}
                >
                  Đăng ký
                </button>
              </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Errors */}
            {(formError || authError) && (
              <div className="auth-error-box animate-fade">
                <AlertCircle size={18} />
                <span>{formError || authError}</span>
              </div>
            )}

            {!isLogin && (
              /* Name field for Register */
              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <div className="auth-input-wrapper">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Họ và tên của bạn" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email / Username Field */}
            <div className="form-group">
              <label className="form-label">{isLogin ? 'Tên đăng nhập hoặc Email' : 'Địa chỉ Email'}</label>
              <div className="auth-input-wrapper">
                {isLogin ? <User size={18} className="input-icon" /> : <Mail size={18} className="input-icon" />}
                <input 
                  type={isLogin ? 'text' : 'email'} 
                  className="form-control" 
                  placeholder={isLogin ? "username hoặc name@example.com" : "name@example.com"} 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <div className="password-label-row">
                <label className="form-label">Mật khẩu</label>
                {isLogin && (
                  <a href="#forgot" className="forgot-password" onClick={e => { e.preventDefault(); setIsForgotPassword(true); setFormError(''); setForgotSuccessMessage(''); setForgotStep(1); }}>
                    Quên mật khẩu?
                  </a>
                )}
              </div>
              <div className="auth-input-wrapper">
                <Lock size={18} className="input-icon" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-control password-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              /* Confirm Password field for Register */
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className="form-control password-input" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {!isLogin && (
              /* Phone field for Register */
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <div className="auth-input-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="0901234567" 
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Remember Me Checkbox (Login only) */}
            {isLogin && (
              <div className="form-group remember-me-group">
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  <span>Ghi nhớ đăng nhập</span>
                </label>
              </div>
            )}

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Social Sign-in option */}
          <div className="google-auth-separator">
            <span>Hoặc tiếp tục với</span>
          </div>

          <button 
            type="button" 
            className="btn btn-outline google-auth-btn" 
            onClick={() => alert('Đăng nhập Google hiện chưa khả dụng. Vui lòng sử dụng tài khoản dùng thử nhanh bên dưới.')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="google-svg">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.99 1 12 1 7.35 1 3.37 3.68 1.41 7.56l3.85 2.99c.9-2.69 3.42-4.51 6.74-4.51z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.45h6.46c-.28 1.46-1.1 2.69-2.33 3.51l3.6 2.79c2.1-1.94 3.76-4.8 3.76-8.42z"/>
              <path fill="#FBBC05" d="M5.26 14.87c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.41 7.48C.51 9.29 0 11.29 0 13.4s.51 4.11 1.41 5.92l3.85-2.99c-.23-.69-.36-1.43-.36-2.2z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.6-2.79c-.99.66-2.26 1.06-4.36 1.06-3.32 0-5.84-1.82-6.74-4.51L1.41 16.83C3.37 20.71 7.35 23 12 23z"/>
            </svg>
            Đăng nhập với Google
          </button>

          {/* Test Users Quick Panel */}
          {isLogin && (
            <div className="quick-test-accounts">
              <h4>Tài khoản dùng thử:</h4>
              <div className="test-acc-grid">
                <button 
                  className="test-acc-btn"
                  onClick={() => { setEmail('customer@gmail.com'); setPassword('123456'); }}
                >
                  Khách hàng
                </button>
                <button 
                  className="test-acc-btn"
                  onClick={() => { setEmail('seller@techcycle.vn'); setPassword('123456'); }}
                >
                  Người bán
                </button>
                <button 
                  className="test-acc-btn"
                  onClick={() => { setEmail('minh.tech@techcycle.vn'); setPassword('123456'); }}
                >
                  Kỹ thuật
                </button>
                <button 
                  className="test-acc-btn"
                  onClick={() => { setEmail('admin@techcycle.vn'); setPassword('123456'); }}
                >
                  Quản trị
                </button>
              </div>
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
