const { db } = require('../db');

const couponRepository = {
    findByCode: async (code) => {
        const query = `
            SELECT * FROM coupons 
            WHERE code = @param0 
            AND status = 'active'
        `;
        const result = await db.query(query, [{ name: 'param0', value: code }]);
        return result.recordset[0];
    },
    
    incrementUsage: async (id) => {
        const query = `
            UPDATE coupons 
            SET usage_count = usage_count + 1 
            WHERE id = @param0
        `;
        await db.query(query, [{ name: 'param0', value: id }]);
    }
};

module.exports = couponRepository;
