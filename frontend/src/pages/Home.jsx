import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { ArrowRight, Recycle, ShieldCheck, Sparkles, TrendingUp, Cpu, Check, AlertCircle } from 'lucide-react';
import './Home.css';

const Home = ({ setActivePage, setSelectedProduct }) => {
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(data => {
        // DB dùng status = 'active'
        const available = data.filter(p => p.status && ['active', 'available'].includes(p.status.toLowerCase()));
        // Map các field cho ProductCard
        const mapped = available.slice(0, 4).map(p => ({
          ...p,
          name: p.name || p.title,
          price: p.price || p.listed_price,
          image: p.image || p.image_url
        }));
        setRecentProducts(mapped);
        setLoading(false);
      })
      .catch(err => {
        console.error('Lỗi tải sản phẩm trang chủ:', err);
        setLoading(false);
      });
  }, []);

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setActivePage('shop'); // Detail view is handled inside Shop page
  };

  return (
    <div className="home-page animate-fade container-fluid px-0">
      {/* Hero Section */}
      <section className="hero-section py-5">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6 d-flex flex-column align-items-start text-start">
              <span className="hero-badge animate-pulse">
                <Cpu size={14} /> 🤖 GREEN TECH DIAGNOSIS SYSTEM
              </span>
              <h1 className="hero-title">
                Tái sinh thiết bị của bạn <br />
                <span>với Trí tuệ Nhân tạo</span>
              </h1>
              <p className="hero-subtitle mb-4">
                Hệ thống chẩn đoán lỗi bằng AI tiên tiến giúp phát hiện sự cố nhanh chóng, đưa ra giải pháp sửa chữa tối ưu và định giá chính xác linh kiện cũ của bạn.
              </p>
              <div className="hero-actions d-flex gap-3">
                <button className="btn btn-primary btn-lg px-4" onClick={() => setActivePage('booking')}>
                  Chi tiết dịch vụ sửa chữa...
                  <ArrowRight size={18} />
                </button>
                <button className="btn btn-outline btn-lg px-4" onClick={() => setActivePage('shop')}>
                  Khám phá chợ Eco
                </button>
              </div>
            </div>
            
            <div className="col-lg-6 position-relative d-flex justify-content-center align-items-center">
              <div className="glass-card hero-info-card card position-absolute p-3 shadow-lg">
                <div className="hero-info-header d-flex align-items-center gap-2">
                  <Sparkles size={28} className="sparkle-icon" />
                  <div>
                    <h4 className="m-0">Chẩn đoán AI trực tuyến</h4>
                    <p className="m-0 text-muted" style={{ fontSize: '0.75rem' }}>Phân tích lỗi thiết bị chỉ trong 10 giây qua ảnh chụp và live chat.</p>
                  </div>
                </div>
              </div>
              <div className="hero-image-backdrop"></div>
              <img 
                src="https://images.unsplash.com/photo-16219051189-08b45d6a269e?w=800" 
                alt="Air Conditioner Diagnostics" 
                className="hero-main-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="stats-section container my-5">
        <div className="row g-4 justify-content-center">
          <div className="col-md-4">
            <div className="stat-card glass-panel h-100 d-flex flex-column align-items-center text-center p-4">
              <TrendingUp className="stat-icon mb-3" />
              <h2 className="stat-number fw-bold">15k+</h2>
              <p className="stat-label text-muted m-0">Khách hàng tin tưởng</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card glass-panel h-100 d-flex flex-column align-items-center text-center p-4">
              <Recycle className="stat-icon green mb-3" />
              <h2 className="stat-number fw-bold">2.5k kg</h2>
              <p className="stat-label text-muted m-0">Rác thải điện tử đã xử lý</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card glass-panel h-100 d-flex flex-column align-items-center text-center p-4">
              <ShieldCheck className="stat-icon orange mb-3" />
              <h2 className="stat-number fw-bold">100%</h2>
              <p className="stat-label text-muted m-0">Kiểm định chất lượng đầu vào</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Services Section */}
      <section className="services-section container my-5">
        <div className="section-header text-center mb-5">
          <span className="section-subtitle">Dịch vụ sửa chữa chuyên sâu</span>
          <h2 className="section-title fw-bold">Hỗ Trợ Kỹ Thuật Đạt Chuẩn Figma</h2>
          <p className="section-desc text-muted">Chúng tôi cung cấp giải pháp bảo dưỡng sửa chữa hàng đầu cho các thiết bị điện lạnh và gia dụng với quy trình hiện đại.</p>
        </div>

        <div className="row g-4">
          {/* Service 1: Máy lạnh */}
          <div className="col-lg-4">
            <div className="service-card glass-panel h-100 d-flex flex-column align-items-start p-4">
              <div className="service-card-header d-flex align-items-center gap-3 mb-3">
                <div className="service-icon-wrapper">
                  <Cpu size={24} />
                </div>
                <h3 className="m-0 fw-bold">Dịch vụ Máy lạnh</h3>
              </div>
              <p className="service-summary text-secondary fw-semibold">Khắc phục triệt để sự cố kém lạnh, rò gas, tiếng ồn lớn.</p>
              <ul className="service-checklist list-unstyled d-flex flex-column gap-2 mb-4 flex-grow-1">
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Vệ sinh & Bảo dưỡng định kỳ</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Nạp gas & Kiểm tra rò rỉ rơ le</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Sửa chữa bo mạch & block lạnh</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Bảo hành linh kiện 6 - 12 tháng</li>
              </ul>
              <button className="btn btn-text-link mt-auto" onClick={() => setActivePage('booking')}>
                Đặt lịch Máy lạnh <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Service 2: Máy giặt */}
          <div className="col-lg-4">
            <div className="service-card glass-panel h-100 d-flex flex-column align-items-start p-4">
              <div className="service-card-header d-flex align-items-center gap-3 mb-3">
                <div className="service-icon-wrapper secondary">
                  <Recycle size={24} />
                </div>
                <h3 className="m-0 fw-bold">Dịch vụ Máy giặt</h3>
              </div>
              <p className="service-summary text-secondary fw-semibold">Xử lý các lỗi rung lắc mạnh, không thoát nước, hư mạch điều khiển.</p>
              <ul className="service-checklist list-unstyled d-flex flex-column gap-2 mb-4 flex-grow-1">
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Vệ sinh lồng giặt chuyên sâu</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Sửa lỗi vắt rung lắc, không xả</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Thay thế dây curoa, trục quay</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Bảo dưỡng chống gỉ sét vỏ máy</li>
              </ul>
              <button className="btn btn-text-link mt-auto" onClick={() => setActivePage('booking')}>
                Đặt lịch Máy giặt <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Service 3: Tủ lạnh */}
          <div className="col-lg-4">
            <div className="service-card glass-panel h-100 d-flex flex-column align-items-start p-4">
              <div className="service-card-header d-flex align-items-center gap-3 mb-3">
                <div className="service-icon-wrapper accent">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="m-0 fw-bold">Dịch vụ Tủ lạnh</h3>
              </div>
              <p className="service-summary text-secondary fw-semibold">Sửa chữa tủ không lạnh, đóng tuyết dày, hư block ngắt nghỉ.</p>
              <ul className="service-checklist list-unstyled d-flex flex-column gap-2 mb-4 flex-grow-1">
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Kiểm tra rơ le nhiệt, gas & block</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Khắc phục lỗi đóng đá, chảy nước</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Thay gioăng cao su cánh cửa</li>
                <li className="d-flex align-items-center gap-2"><Check size={16} className="check-icon" /> Khử mùi hôi & diệt khuẩn khoang</li>
              </ul>
              <button className="btn btn-text-link mt-auto" onClick={() => setActivePage('booking')}>
                Đặt lịch Tủ lạnh <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Store Section: TechCycle Certified - Cửa hàng Eco */}
      <section className="certified-store-section container my-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-end mb-4">
          <div>
            <span className="section-subtitle">TechCycle Certified</span>
            <h2 className="section-title fw-bold">Cửa Hàng Thiết Bị Eco</h2>
            <p className="section-desc-inline text-muted">Các thiết bị đã qua sử dụng được thu mua, xử lý kỹ thuật nghiêm ngặt và bán lại với chứng nhận bảo hành chất lượng xanh.</p>
          </div>
          <button className="btn btn-outline mt-3 mt-md-0" onClick={() => setActivePage('shop')}>
            Xem toàn bộ cửa hàng
            <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">Đang tải thiết bị xanh...</div>
        ) : (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
            {recentProducts.map(product => (
              <div className="col" key={product.id}>
                <ProductCard 
                  product={product} 
                  onViewDetails={handleViewProduct}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Features Section: Vì sao chọn TechCycle */}
      <section className="features-section container my-5">
        <div className="features-container glass-panel p-4 p-md-5">
          <div className="row align-items-center g-5">
            <div className="col-lg-7 features-info">
              <span className="section-subtitle">Lựa chọn bền vững</span>
              <h2 className="section-title fw-bold">Vì sao TechCycle là lựa chọn hàng đầu?</h2>
              <p className="section-desc-left text-muted mb-4">Chúng tôi hướng đến xây dựng vòng đời công nghệ tuần hoàn bằng sự minh bạch và chuyên nghiệp hàng đầu.</p>
              
              <div className="feature-bullets d-flex flex-column gap-4">
                <div className="feature-bullet-item d-flex gap-3">
                  <div className="bullet-icon-box">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h4 className="fw-bold">Hệ thống chẩn đoán AI</h4>
                    <p className="text-muted m-0">Dự báo hư hỏng linh kiện chính xác và dự toán giá cả sửa chữa minh bạch, không phát sinh phụ phí.</p>
                  </div>
                </div>

                <div className="feature-bullet-item d-flex gap-3">
                  <div className="bullet-icon-box green">
                    <Recycle size={20} />
                  </div>
                  <div>
                    <h4 className="fw-bold">Linh kiện chuẩn Eco</h4>
                    <p className="text-muted m-0">Ưu tiên sử dụng linh kiện tái chế chất lượng cao, linh kiện bóc máy chính hãng giúp giảm thiểu tác động carbon.</p>
                  </div>
                </div>

                <div className="feature-bullet-item d-flex gap-3">
                  <div className="bullet-icon-box orange">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="fw-bold">Cam kết độ bền xanh</h4>
                    <p className="text-muted m-0">100% thiết bị bán ra tại Cửa hàng Eco đều trải qua quy trình kiểm thử 24 bước nghiêm ngặt trước khi xuất xưởng.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-5 features-visual position-relative d-flex justify-content-center align-items-center">
              <img 
                src="https://images.unsplash.com/photo-1604754742629-3e5728249d73?w=700" 
                alt="Environmental electronic diagnostics" 
                className="features-img w-100"
              />
              <div className="features-overlay-card card position-absolute p-3 shadow-lg d-flex flex-row align-items-center gap-2">
                <AlertCircle size={24} className="alert-icon" />
                <div>
                  <h5 className="m-0 fw-bold">Chứng nhận Eco-Shield</h5>
                  <p className="m-0 text-muted" style={{ fontSize: '0.75rem' }}>Mỗi lượt sửa chữa tiết kiệm trung bình 8.5 kg CO2 thải ra môi trường.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
