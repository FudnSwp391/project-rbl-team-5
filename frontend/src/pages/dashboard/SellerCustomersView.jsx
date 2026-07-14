import { MapPin, CreditCard, Users, MessageSquare } from 'lucide-react';

const STATUS_LABELS = {
  pending: 'pending',
  completed: 'completed',
  canceled: 'canceled',
  cancelled: 'cancelled',
  reserved: 'reserved',
  active: 'active',
  sold_out: 'sold_out',
  waiting_payment: 'waiting_payment',
  assigned: 'assigned',
  inspecting: 'inspecting',
  repairing: 'repairing',
  confirmed: 'confirmed',
};

function getStatusLabel(st) {
  const map = {
    pending: 'Đang chờ',
    assigned: 'Đã phân công',
    inspecting: 'Đang kiểm tra',
    repairing: 'Đang sửa chữa',
    completed: 'Hoàn thành',
    canceled: 'Đã hủy',
    cancelled: 'Đã hủy',
    reserved: 'Đã giữ chỗ',
    active: 'Đang hiển thị',
    sold_out: 'Đã bán',
    waiting_payment: 'Chờ thanh toán',
  };
  return map[st] || st || 'Không rõ';
}

function CustomerDetail({ customer, safeOrdersList, getAvatarUrl, onBack, onStartChat }) {
  const customerOrders = safeOrdersList.filter(o => o && o.customerId === customer.id);
  const shippingAddress = customerOrders[0]?.shippingInfo?.address || '103 Eco Tower, District 1, Ho Chi Minh City, 70000, Vietnam';
  const billingAddress = customerOrders[0]?.shippingInfo?.address || '45 Green Lane, Ward 5, District 3, Ho Chi Minh City, 70000, Vietnam';

  return (
    <div className="customer-detail-view animate-fade">
      <div className="detail-header-row">
        <button className="back-to-list-btn" onClick={onBack}>
          ← Quay lại danh sách
        </button>
        <h2>Chi tiết Khách hàng</h2>
      </div>

      <div className="row g-4 mb-4 profile-info-row">
        <div className="col-lg-7">
          <div className="profile-card-widget glass-panel h-100">
            <div className="profile-card-body">
              <div className="profile-avatar-container">
                <img
                  src={getAvatarUrl(customer.avatar, customer.username)}
                  alt={customer.username}
                  className="detail-avatar"
                />
                <span className="member-badge">🌟 THÀNH VIÊN VÀNG</span>
              </div>
              <div className="profile-meta-info">
                <h3>{customer.username}</h3>
                <span className="role-pill">Khách hàng</span>
                <span className="status-text">{customer.gender === 'female' ? 'Nữ' : 'Nam'} • ID: #{customer.id}</span>
              </div>
            </div>
            <hr className="widget-divider" />
            <div className="profile-card-actions">
              <button className="btn btn-outline btn-sm btn-send-message" onClick={() => onStartChat(customer.id)}>
                <MessageSquare size={14} /> Gửi tin nhắn
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="personal-info-card-widget glass-panel h-100">
            <div className="card-header d-flex align-items-center gap-2 mb-3">
              <Users size={16} className="header-icon" />
              <h3 className="m-0">THÔNG TIN CÁ NHÂN</h3>
            </div>
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">MÃ TÀI KHOẢN</span>
                <span className="info-value value-id">{customer.id}</span>
              </div>
              <div className="info-row">
                <span className="info-label">ĐỊA CHỈ EMAIL</span>
                <span className="info-value">{customer.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">SỐ ĐIỆN THOẠI</span>
                <span className="info-value">{customer.phone || 'Chưa cung cấp'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">NGÀY ĐĂNG KÝ</span>
                <span className="info-value">
                  {customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Không rõ'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4 addresses-row">
        <div className="col-md-6">
          <div className="address-card glass-panel h-100 shipping-address-card">
            <div className="address-card-header d-flex justify-content-between align-items-center mb-3">
              <div className="header-title-wrap d-flex align-items-center gap-2">
                <MapPin size={16} className="green-text" />
                <h3 className="m-0">Địa chỉ giao hàng</h3>
              </div>
              <span className="badge badge-default-address">MẶC ĐỊNH</span>
            </div>
            <p className="address-text">{shippingAddress}</p>
          </div>
        </div>

        <div className="col-md-6">
          <div className="address-card glass-panel h-100 billing-address-card">
            <div className="address-card-header d-flex justify-content-between align-items-center mb-3">
              <div className="header-title-wrap d-flex align-items-center gap-2">
                <CreditCard size={16} className="orange-text" />
                <h3 className="m-0">Địa chỉ thanh toán</h3>
              </div>
            </div>
            <p className="address-text">{billingAddress}</p>
          </div>
        </div>
      </div>

      <div className="recent-orders-card-widget glass-panel mb-4">
        <div className="recent-orders-header d-flex justify-content-between align-items-center mb-3">
          <h3 className="m-0">Lịch sử đơn hàng gần đây</h3>
          <span className="view-all-link" onClick={() => alert('Chuyển hướng đến tất cả đơn hàng...')}>Xem tất cả</span>
        </div>
        <div className="table-responsive">
          <table className="dashboard-table table">
            <thead>
              <tr>
                <th>MÃ ĐƠN HÀNG</th>
                <th>TÊN SẢN PHẨM</th>
                <th>NGÀY</th>
                <th>SỐ TIỀN</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {customerOrders.length > 0 ? (
                customerOrders.map(o => (
                  <tr key={o.id}>
                    <td className="green-text font-bold">#{o.id || 'N/A'}</td>
                    <td>{Array.isArray(o.items) && o.items.length > 0 ? o.items.map(it => it?.name || 'Sản phẩm').join(', ') : 'Không có sản phẩm'}</td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                    <td>
                      <span className="price-vnd-formatted">
                        {(o.totalAmount || 0).toLocaleString('vi-VN')}
                        <span className="price-vnd-label"> VND</span>
                      </span>
                    </td>
                    <td>
                      <span className={`status-delivery-tag ${o.status || 'pending'}`}>
                        {getStatusLabel(o.status || 'pending').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="green-text font-bold">#ORD-5521</td>
                  <td>Solar-Powered Power Bank X1</td>
                  <td>12 Tháng 5, 2024</td>
                  <td>5,450,000 VND</td>
                  <td><span className="status-delivery-tag completed">ĐÃ GIAO THÀNH CÔNG</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomerList({ usersList, safeOrdersList, safeBookingsList, getAvatarUrl, onSelectUser }) {
  const customers = usersList.filter(u => u && u.role === 'customer');

  return (
    <div className="customers-view animate-fade">
      <h2>Sổ Khách Hàng</h2>
      <p className="view-desc">Danh sách khách hàng đăng ký. Hiển thị phiếu sửa chữa và đơn hàng.</p>

      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Địa chỉ email</th>
              <th>Số điện thoại</th>
              <th>Ngày tham gia</th>
              <th>Yêu cầu sửa chữa</th>
              <th>Đơn hàng đã đặt</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--neutral-medium)' }}>Chưa có khách hàng nào.</td>
              </tr>
            ) : (
              customers.map(c => {
                const bookingsCount = safeBookingsList.filter(b => b && b.customerId === c.id).length;
                const ordersCount = safeOrdersList.filter(o => o && o.customerId === c.id).length;
                return (
                  <tr key={c.id} onClick={() => onSelectUser(c)} style={{ cursor: 'pointer' }} className="customer-row-hover">
                    <td>
                      <div className="tbl-user-cell">
                        <img src={getAvatarUrl(c.avatar, c.username)} alt={c.username} className="tbl-avatar-circle" />
                        <strong>{c.username}</strong>
                      </div>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone || 'N/A'}</td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                    <td><span className="count-badge green">{bookingsCount} lịch hẹn</span></td>
                    <td><span className="count-badge blue">{ordersCount} đơn hàng</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SellerCustomersView({
  viewingUser, setViewingUser,
  usersList, safeOrdersList, safeBookingsList,
  getAvatarUrl, onStartChat,
}) {
  if (viewingUser) {
    return (
      <CustomerDetail
        customer={viewingUser}
        safeOrdersList={safeOrdersList}
        getAvatarUrl={getAvatarUrl}
        onBack={() => setViewingUser(null)}
        onStartChat={onStartChat}
      />
    );
  }

  return (
    <CustomerList
      usersList={usersList}
      safeOrdersList={safeOrdersList}
      safeBookingsList={safeBookingsList}
      getAvatarUrl={getAvatarUrl}
      onSelectUser={setViewingUser}
    />
  );
}
