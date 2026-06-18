import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { ArrowRight, Recycle, ShieldCheck, Sparkles, TrendingUp, Cpu, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import './Home.css';


const DEFAULT_SLIDES = [
  {
    badge: '🤖 GREEN TECH DIAGNOSIS SYSTEM',
    title: 'Tái sinh thiết bị của bạn',
    titleHighlight: 'với Trí tuệ Nhân tạo',
    subtitle: 'Hệ thống chẩn đoán lỗi bằng AI tiên tiến giúp phát hiện sự cố nhanh chóng, đưa ra giải pháp sửa chữa tối ưu và định giá chính xác linh kiện cũ của bạn.',
    image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800',
    infoCard: {
      icon: <Sparkles size={28} className="sparkle-icon" />,
      title: 'Chẩn đoán AI trực tuyến',
      desc: 'Phân tích lỗi thiết bị chỉ trong 10 giây qua ảnh chụp và live chat.'
    }
  },
  {
    badge: '♻️ CIRCULAR ECONOMY PIONEER',
    title: 'Chợ Thiết Bị Tái Chế',
    titleHighlight: 'Chất Lượng Đảm Bảo',
    subtitle: 'Mua bán thiết bị điện tử đã qua sử dụng với giá tốt nhất. Tất cả sản phẩm đều được kiểm định kỹ lưỡng và bảo hành chính hãng.',
    image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800',
    infoCard: {
      icon: <ShieldCheck size={28} className="sparkle-icon" />,
      title: '100% Kiểm định chất lượng',
      desc: 'Mỗi sản phẩm đều trải qua 15 bước kiểm tra nghiêm ngặt.'
    }
  },
  {
    badge: '🔧 PROFESSIONAL REPAIR SERVICE',
    title: 'Sửa Chữa Nhanh Chóng',
    titleHighlight: 'Bảo Hành Lâu Dài',
    subtitle: 'Đội ngũ kỹ thuật viên giàu kinh nghiệm, trang thiết bị hiện đại. Cam kết sửa chữa trong 24h và bảo hành lên đến 12 tháng.',
    image: 'https://images.unsplash.com/photo-1581092160607-ee67eb29e7a6?w=800',
    infoCard: {
      icon: <TrendingUp size={28} className="sparkle-icon" />,
      title: '15,000+ Khách hàng hài lòng',
      desc: 'Đánh giá 4.9/5 sao từ cộng đồng người dùng.'
    }
  }
];

const Home = ({ setActivePage, setSelectedProduct }) => {
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(DEFAULT_SLIDES);

  // Auto-advance carousel
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // Change slide every 5 seconds
    
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  useEffect(() => {
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';
    
    // Fetch banners from DB
    fetch(`${API_BASE}/api/banners`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const infoCards = [
            {
              icon: <Sparkles size={28} className="sparkle-icon" />,
              title: 'Chẩn đoán AI trực tuyến',
              desc: 'Phân tích lỗi thiết bị chỉ trong 10 giây qua ảnh chụp và live chat.'
            },
            {
              icon: <ShieldCheck size={28} className="sparkle-icon" />,
              title: '100% Kiểm định chất lượng',
              desc: 'Mỗi sản phẩm đều trải qua 15 bước kiểm tra nghiêm ngặt.'
            },
            {
              icon: <TrendingUp size={28} className="sparkle-icon" />,
              title: '15,000+ Khách hàng hài lòng',
              desc: 'Đánh giá 4.9/5 sao từ cộng đồng người dùng.'
            }
          ];
          
          const mapped = data.map((b, idx) => ({
            badge: b.badge || '🎯 SYSTEM BANNER',
            title: b.title,
            titleHighlight: b.titleHighlight || '',
            subtitle: b.subtitle,
            image: b.image,
            actionLink: b.actionLink,
            infoCard: infoCards[idx % infoCards.length]
          }));
          setHeroSlides(mapped);
        }
      })
      .catch(err => {
        console.error('Lỗi tải banner trang chủ từ API:', err);
      });

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

  const handleActionClick = (link) => {
    if (!link) {
      setActivePage('booking');
      return;
    }
    if (link.startsWith('#/')) {
      setActivePage(link.slice(2));
    } else if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      setActivePage(link);
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setActivePage('shop'); // Detail view is handled inside Shop page
  };

  return (
    <div className="home-page animate-fade container-fluid px-0">
      {/* Hero Section with Carousel - Full Screen */}
      <section className="hero-section-fullscreen position-relative" style={{ height: '85vh', overflow: 'hidden' }}>
        {/* Background Image */}
        <div className="hero-bg-image" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${heroSlides[currentSlide].image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-image 0.8s ease-in-out',
          zIndex: 1
        }}>
          {/* Dark overlay for better text readability */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)',
            zIndex: 2
          }}></div>
        </div>

        {/* Content Overlay */}
        <div className="container h-100" style={{ position: 'relative', zIndex: 3 }}>
          <div className="row h-100 align-items-center">
            <div className="col-lg-7 col-md-8 text-white">
              <span className="hero-badge animate-pulse" key={`badge-${currentSlide}`} style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <Cpu size={14} /> {heroSlides[currentSlide].badge}
              </span>
              <h1 className="hero-title text-white" key={`title-${currentSlide}`} style={{
                fontSize: '4rem',
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: '24px',
                textShadow: '2px 2px 20px rgba(0,0,0,0.8)',
                animation: 'fadeIn 0.8s ease-in-out'
              }}>
                {heroSlides[currentSlide].title}
              </h1>
              <h2 className="text-white" style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                marginBottom: '32px',
                color: '#FFA500',
                textShadow: '2px 2px 15px rgba(0,0,0,0.7)',
                animation: 'fadeIn 1s ease-in-out'
              }}>
                {heroSlides[currentSlide].titleHighlight}
              </h2>
              <p className="hero-subtitle text-white mb-4" key={`subtitle-${currentSlide}`} style={{
                fontSize: '1.15rem',
                lineHeight: 1.6,
                maxWidth: '600px',
                textShadow: '1px 1px 10px rgba(0,0,0,0.8)',
                animation: 'fadeIn 1.2s ease-in-out'
              }}>
                {heroSlides[currentSlide].subtitle}
              </p>
              <div className="hero-actions d-flex gap-3" style={{ animation: 'fadeIn 1.4s ease-in-out' }}>
                <button className="btn btn-primary btn-lg px-4" onClick={() => handleActionClick(heroSlides[currentSlide].actionLink)} style={{
                  background: '#10B981',
                  border: 'none',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.4)'
                }}>
                  Chi tiết dịch vụ
                  <ArrowRight size={18} />
                </button>
                <button className="btn btn-lg px-4" onClick={() => setActivePage('shop')} style={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  Khám phá thêm
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Carousel Controls */}
        <div className="carousel-controls" style={{ zIndex: 4 }}>
          <button 
            className="carousel-btn carousel-prev" 
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            className="carousel-btn carousel-next" 
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        
        {/* Slide Indicators */}
        <div className="carousel-indicators" style={{ zIndex: 4 }}>
          {heroSlides.map((_, index) => (
            <button
              key={index}
              className={`indicator-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
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
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=700";
                }}
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
