const getVietnamTime = (addMinutes = 0) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + addMinutes);
    const options = { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(d);
    let out = {};
    parts.forEach(p => out[p.type] = p.value);
    return `${out.year}${out.month}${out.day}${out.hour}${out.minute}${out.second}`;
};
console.log("Current time:", getVietnamTime());
