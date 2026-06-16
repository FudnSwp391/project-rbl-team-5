import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ProfileSettings = () => {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setDescription(user.description || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      setMessage({ text: 'Username và Email không được để trống.', type: 'danger' });
      return;
    }
    
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      await updateProfile(username, email, description, phone);
      setMessage({ text: 'Cập nhật thông tin tài khoản thành công!', type: 'success' });
    } catch (err) {
      setMessage({ text: err.message || 'Cập nhật thất bại. Vui lòng thử lại.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4" style={{ maxWidth: '600px', margin: '0 auto', borderRadius: '16px' }}>
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {message.text && (
          <div className={`alert alert-${message.type} py-2 px-3`} style={{ borderRadius: '8px', fontSize: '0.9rem' }}>
            {message.text}
          </div>
        )}

        <div className="form-group d-flex flex-column gap-1">
          <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--neutral-darkest)' }}>
            Username / Tên đăng nhập
          </label>
          <input
            type="text"
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập..."
            style={{ borderRadius: '8px', padding: '10px 14px' }}
          />
        </div>

        <div className="form-group d-flex flex-column gap-1">
          <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--neutral-darkest)' }}>
            Email / Mails
          </label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập địa chỉ email..."
            style={{ borderRadius: '8px', padding: '10px 14px' }}
          />
        </div>

        <div className="form-group d-flex flex-column gap-1">
          <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--neutral-darkest)' }}>
            Số điện thoại
          </label>
          <input
            type="text"
            className="form-control"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nhập số điện thoại..."
            style={{ borderRadius: '8px', padding: '10px 14px' }}
          />
        </div>

        <div className="form-group d-flex flex-column gap-1">
          <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--neutral-darkest)' }}>
            Mô tả / Tiểu sử
          </label>
          <textarea
            className="form-control"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nhập mô tả giới thiệu bản thân hoặc doanh nghiệp..."
            style={{ borderRadius: '8px', padding: '10px 14px', resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn text-white w-100 mt-2"
          style={{
            backgroundColor: '#F59E0B',
            borderRadius: '8px',
            padding: '12px',
            fontWeight: 700,
            border: 'none',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
        >
          {loading ? 'Đang lưu...' : 'Lưu thông tin'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSettings;
