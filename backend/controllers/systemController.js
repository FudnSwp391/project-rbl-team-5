// System Configuration Controller
// Returns bank info, company info, and other system settings

exports.getSystemInfo = async (req, res) => {
  try {
    const systemInfo = {
      bank: {
        name: process.env.VIA_BANK_NAME || '[Configure VIA_BANK_NAME]',
        accountHolder: process.env.VIA_BANK_ACCOUNT_HOLDER || '[Configure VIA_BANK_ACCOUNT_HOLDER]',
        accountNumber: process.env.VIA_BANK_ACCOUNT_NUMBER || '[Configure VIA_BANK_ACCOUNT_NUMBER]'
      },
      company: {
        name: 'TechCycle Việt Nam',
        address: process.env.SYSTEM_ADDRESS || '[Configure SYSTEM_ADDRESS]',
        hotline: process.env.SYSTEM_HOTLINE || '[Configure SYSTEM_HOTLINE]',
        email: process.env.SYSTEM_EMAIL || 'support@techcycle.vn'
      }
    };

    res.json(systemInfo);
  } catch (err) {
    console.error('Lỗi lấy system info:', err);
    res.status(500).json({ error: err.message });
  }
};
