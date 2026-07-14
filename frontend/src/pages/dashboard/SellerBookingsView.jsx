import { useState } from 'react';

const ORDER_STATUS_LABELS = {
  pending: 'Chờ xem máy',
  confirmed: 'Đã xác nhận',
  completed: 'Khách đã tới (Đã bán)',
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy',
  reserved: 'Đã giữ máy',
  waiting_payment: 'Chờ thanh toán (Đang giữ máy)',
};

const PAYMENT_METHOD_LABELS = {
  cod: 'Thanh toán tại cửa hàng (COD)',
  vnpay: 'VNPay',
};

const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'reserved', 'waiting_payment'];

function OrderStatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {ORDER_STATUS_LABELS[status] || status}
    </span>
  );
}

function OrderActions({ order, editingOrderId, newDate, newTime, setNewDate, setNewTime, setEditingOrderId, onConfirmVisit, onCancel, onSaveReschedule }) {
  if (editingOrderId === order.id) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)', margin: 0 }}>Ngày hẹn mới:</label>
        <input
          type="date"
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
          className="form-control"
          style={{ fontSize: '0.8rem', padding: '4px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
        />
        <label style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)', margin: 0 }}>Giờ hẹn:</label>
        <select
          value={newTime}
          onChange={e => setNewTime(e.target.value)}
          className="form-control"
          style={{ fontSize: '0.8rem', padding: '4px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
        >
          <option value="09:00 AM">09:00 AM</option>
          <option value="10:00 AM">10:00 AM</option>
          <option value="11:00 AM">11:00 AM</option>
          <option value="02:00 PM">02:00 PM</option>
          <option value="03:00 PM">03:00 PM</option>
          <option value="04:00 PM">04:00 PM</option>
          <option value="05:00 PM">05:00 PM</option>
        </select>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => onSaveReschedule(order.id)}>Lưu</button>
          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => setEditingOrderId(null)}>Hủy</button>
        </div>
      </div>
    );
  }

  if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
    return <span style={{ color: 'var(--neutral-medium)', fontSize: '0.85rem' }}>Không có thao tác</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => onConfirmVisit(order.id)}
        style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Xác nhận khách đã tới
      </button>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          className="btn btn-outline-info btn-sm"
          onClick={() => {
            setEditingOrderId(order.id);
            setNewDate(order.appointmentInfo?.appointmentDate || '');
            setNewTime(order.appointmentInfo?.appointmentTime || '09:00 AM');
          }}
          style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1, borderColor: 'var(--primary)', color: 'var(--primary)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
        >
          Đổi lịch
        </button>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={() => onCancel(order.id)}
          style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1, borderColor: 'var(--accent-red)', color: 'var(--accent-red)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPrev, onNext, onGoTo }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination-wrapper">
      <button disabled={currentPage === 1} onClick={onPrev} className="pagination-btn">Trước</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <button key={page} onClick={() => onGoTo(page)} className={`pagination-btn ${currentPage === page ? 'active' : ''}`}>{page}</button>
      ))}
      <button disabled={currentPage === totalPages} onClick={onNext} className="pagination-btn">Sau</button>
    </div>
  );
}

export default function SellerBookingsView({
  safeOrdersList, safeBookingsList,
  currentOrders, currentBookings,
  totalOrderPages, totalBookingPages,
  activeOrdersPage, activeBookingsPage,
  setOrdersPage, setBookingsPage,
  totalPurchased, totalPending, totalCanceled,
  techsList,
  onConfirmOrderVisit, onCancelOrder, onSaveReschedule, onUpdateBookingDetails,
}) {
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00 AM');

  return (
    <div className="bookings-view animate-fade">
      {/* Section 1: Lịch Hẹn Xem Máy */}
      <div className="section-block-wrapper" style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px dashed var(--border-color)' }}>
        <h2>Lịch Hẹn Xem Máy (Mua Thiết Bị)</h2>
        <p className="view-desc">Quản lý danh sách khách hàng đặt lịch hẹn tới xem và kiểm tra máy trực tiếp tại cửa hàng.</p>

        <div className="stats-summary-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)' }}>Tổng khách đã mua</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{totalPurchased}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)' }}>Đang chờ xem/Thanh toán</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{totalPending}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)' }}>Đã hủy lịch/đơn</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{totalCanceled}</div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Ngày & Giờ hẹn</th>
                <th>Tổng thanh toán</th>
                <th>Hình thức</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {safeOrdersList.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--neutral-medium)' }}>Chưa có lịch hẹn xem máy nào.</td></tr>
              ) : (
                currentOrders.filter(o => o && o.id).map(o => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.appointmentInfo?.fullName || o.shippingInfo?.fullName || 'Khách hàng'}</strong>
                      <div className="tbl-subtext">{o.appointmentInfo?.phone || o.shippingInfo?.phone || ''}</div>
                    </td>
                    <td>
                      {Array.isArray(o.items) && o.items.length > 0
                        ? o.items.map((item, idx) => <div key={idx} style={{ fontSize: '0.85rem' }}>• {item?.name || 'Sản phẩm'}</div>)
                        : <div style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)' }}>Không có sản phẩm</div>}
                    </td>
                    <td>
                      <strong>{o.appointmentInfo?.appointmentDate || o.shippingInfo?.appointmentDate || 'Chưa hẹn ngày'}</strong>
                      <div className="tbl-subtext" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>{o.appointmentInfo?.appointmentTime || o.shippingInfo?.appointmentTime || ''}</div>
                    </td>
                    <td><strong>{(o.totalAmount || 0).toLocaleString('vi-VN')} VND</strong></td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {PAYMENT_METHOD_LABELS[o.paymentMethod] || 'Chuyển khoản QR'}
                      </span>
                    </td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td>
                      <OrderActions
                        order={o}
                        editingOrderId={editingOrderId}
                        newDate={newDate}
                        newTime={newTime}
                        setNewDate={setNewDate}
                        setNewTime={setNewTime}
                        setEditingOrderId={setEditingOrderId}
                        onConfirmVisit={onConfirmOrderVisit}
                        onCancel={onCancelOrder}
                        onSaveReschedule={onSaveReschedule}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={activeOrdersPage}
          totalPages={totalOrderPages}
          onPrev={() => setOrdersPage(activeOrdersPage - 1)}
          onNext={() => setOrdersPage(activeOrdersPage + 1)}
          onGoTo={setOrdersPage}
        />
      </div>

      {/* Section 2: Phiếu Hẹn Sửa Chữa */}
      <div>
        <h2>Phiếu Hẹn Sửa Chữa (Dịch Vụ)</h2>
        <p className="view-desc">Danh sách tiếp nhận sửa chữa phần cứng thiết bị, gán kỹ thuật viên, chốt ngày hẹn trả máy và điền thông tin lỗi.</p>

        <div className="table-responsive">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Thiết bị & Lỗi</th>
                <th>Ngày hẹn giao máy</th>
                <th>Phân công thợ</th>
                <th>Trạng thái</th>
                <th>Chi phí & Ghi chú</th>
                <th>Linh kiện & Báo lỗi</th>
              </tr>
            </thead>
            <tbody>
              {safeBookingsList.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--neutral-medium)' }}>Chưa có phiếu hẹn sửa chữa nào.</td></tr>
              ) : (
                currentBookings.filter(bk => bk && bk.id).map(bk => (
                  <tr key={bk.id}>
                    <td>
                      <strong>{bk.customerName}</strong>
                      <div className="tbl-subtext">{bk.customerPhone}</div>
                    </td>
                    <td>
                      <strong>{bk.deviceType || 'Thiết bị điện tử'}</strong>
                      <p className="tbl-desc" title={bk.issueDescription} style={{ fontSize: '0.8rem', color: 'var(--neutral-medium)', marginTop: '4px' }}>{bk.issueDescription}</p>
                    </td>
                    <td>
                      <strong>{bk.preferred_date || 'Chưa hẹn ngày'}</strong>
                      <div className="tbl-subtext">{typeof bk.notes === 'string' && bk.notes.includes('Khung giờ:') ? bk.notes : 'Khung giờ: Sáng'}</div>
                    </td>
                    <td>
                      <select
                        className="form-control"
                        value={bk.technicianId || ''}
                        onChange={e => onUpdateBookingDetails(bk.id, { technicianId: e.target.value ? Number(e.target.value) : null })}
                        style={{ padding: '6px', fontSize: '0.85rem', width: '100%', minWidth: '120px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      >
                        <option value="">Chưa phân công</option>
                        {Array.isArray(techsList) && techsList.filter(t => t && t.id).map(t => (
                          <option key={t.id} value={t.id}>{t.full_name || t.username || 'Kỹ thuật viên'}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-control"
                        value={bk.status || 'pending'}
                        onChange={e => onUpdateBookingDetails(bk.id, { status: e.target.value })}
                        style={{ padding: '6px', fontSize: '0.85rem', width: '100%', minWidth: '120px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      >
                        <option value="pending">Chờ xử lý</option>
                        <option value="assigned">Đã phân công</option>
                        <option value="inspecting">Đang kiểm tra</option>
                        <option value="repairing">Đang sửa chữa</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="canceled">Đã hủy</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                        <input
                          type="number"
                          className="form-control"
                          defaultValue={bk.cost || 0}
                          onBlur={e => onUpdateBookingDetails(bk.id, { cost: Number(e.target.value) })}
                          placeholder="Chi phí (VND)"
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        />
                        <input
                          type="text"
                          className="form-control"
                          defaultValue={typeof bk.notes === 'string' && !bk.notes.includes('Khung giờ:') ? bk.notes : ''}
                          onBlur={e => onUpdateBookingDetails(bk.id, { notes: e.target.value })}
                          placeholder="Ghi chú kỹ thuật..."
                          style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-medium)' }}>Chốt ngày nhận máy:</label>
                          <input
                            type="date"
                            className="form-control"
                            defaultValue={typeof bk.pickup_date === 'string' ? bk.pickup_date.split('T')[0] : ''}
                            onChange={e => onUpdateBookingDetails(bk.id, { pickupDate: e.target.value })}
                            style={{ padding: '4px', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                        <textarea
                          className="form-control"
                          defaultValue={bk.replaced_parts || ''}
                          onBlur={e => onUpdateBookingDetails(bk.id, { replacedParts: e.target.value })}
                          placeholder="Linh kiện thay thế..."
                          rows="2"
                          style={{ fontSize: '0.8rem', padding: '4px 8px', resize: 'vertical' }}
                        />
                        <textarea
                          className="form-control"
                          defaultValue={bk.fault_report || ''}
                          onBlur={e => onUpdateBookingDetails(bk.id, { faultReport: e.target.value })}
                          placeholder="Báo lỗi chi tiết..."
                          rows="2"
                          style={{ fontSize: '0.8rem', padding: '4px 8px', resize: 'vertical' }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={activeBookingsPage}
          totalPages={totalBookingPages}
          onPrev={() => setBookingsPage(activeBookingsPage - 1)}
          onNext={() => setBookingsPage(activeBookingsPage + 1)}
          onGoTo={setBookingsPage}
        />
      </div>
    </div>
  );
}
