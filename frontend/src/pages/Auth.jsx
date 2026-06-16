import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Recycle, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
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
  const [rememberMe, setRememberMe] = useState(false);

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
          window.location.hash = '#/dashboard';
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
        // Send default phone '0900000000' to satisfy API schema
        await register(username, email, password, '0900000000', 'customer');
        setActivePage('home');
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
                  <a href="#forgot" className="forgot-password" onClick={e => { e.preventDefault(); alert('Chức năng quên mật khẩu đang được phát triển. Bạn vui lòng sử dụng tài khoản mẫu customer@gmail.com / mật khẩu 123456 để đăng nhập.'); }}>
                    Quên mật khẩu?
                  </a>
                )}
              </div>
              <div className="auth-input-wrapper">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isLogin && (
              /* Confirm Password field for Register */
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
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
        </div>
      </div>
    </div>
  );
};

export default Auth;
