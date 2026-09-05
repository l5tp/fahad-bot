const { fork } = require('child_process');
const path = require('path');

const bots = [
    'bot1.js', 'bot2.js', 'bot3.js', 'bot4.js', 'bot5.js',
    'bot6.js', 'bot7.js', 'bot8.js', 'bot9.js', 'bot10.js'
];

bots.forEach((botFile, index) => {
    setTimeout(() => {
        const p = fork(path.join(__dirname, botFile));
        console.log(`🚀 تم إطلاق عملية البوت: ${botFile}`);
        
        p.on('exit', (code) => {
            console.log(`⚠️ توقف ${botFile} برمز ${code}, جاري إعادة تشغيله تلقائياً...`);
            setTimeout(() => fork(path.join(__dirname, botFile)), 5000);
        });
    }, index * 3000); // فاصل زمني 3 ثوانٍ بين كل بوت لمنع الضغط وحظر الاستضافة
});
