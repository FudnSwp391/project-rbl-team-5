const couponService = require('../services/couponService');

const couponController = {
    applyCoupon: async (req, res) => {
        try {
            const { code, order_total } = req.body;
            
            if (!code || order_total === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu thông tin mã giảm giá hoặc tổng giá trị đơn hàng.'
                });
            }

            const result = await couponService.applyCoupon(code, Number(order_total));
            
            return res.status(200).json({
                success: true,
                message: 'Áp dụng mã giảm giá thành công!',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = couponController;
