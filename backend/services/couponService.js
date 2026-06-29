const couponRepository = require('../repositories/couponRepository');

const couponService = {
    applyCoupon: async (code, orderTotal) => {
        const coupon = await couponRepository.findByCode(code);
        
        if (!coupon) {
            throw new Error('Mã giảm giá không hợp lệ hoặc không tồn tại.');
        }

        const now = new Date();
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            throw new Error('Mã giảm giá chưa đến ngày áp dụng.');
        }
        
        if (coupon.end_date && new Date(coupon.end_date) < now) {
            throw new Error('Mã giảm giá đã hết hạn.');
        }

        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
            throw new Error('Mã giảm giá đã hết lượt sử dụng.');
        }

        if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
            throw new Error(`Đơn hàng phải từ ${coupon.min_order_value} để áp dụng mã này.`);
        }

        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
            discountAmount = (orderTotal * coupon.discount_value) / 100;
            if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
                discountAmount = coupon.max_discount_amount;
            }
        } else if (coupon.discount_type === 'fixed_amount') {
            discountAmount = coupon.discount_value;
        }

        // Đảm bảo không giảm quá giá trị đơn hàng
        if (discountAmount > orderTotal) {
            discountAmount = orderTotal;
        }

        return {
            coupon_id: coupon.id,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            discount_amount: discountAmount,
            final_total: orderTotal - discountAmount
        };
    }
};

module.exports = couponService;
