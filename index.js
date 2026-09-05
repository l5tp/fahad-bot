const { fork } = require('child_process');
const path = require('path');

// قائمة أسماء ملفات البوتات العشرة
const bots = [
    'bot1.js',
    'bot2.js',
    'bot3.js',
    'bot4.js',
    'bot5.js',
    'bot6.js',
    'bot7.js',
    'bot8.js',
    'bot9.js',
    'bot10.js'
];

function startBot(file, index) {
    const botPath = path.join(__dirname, file);
    console.log(`🚀 تم إطلاق عملية البوت: ${file}`);
    
    const child = fork(botPath);

    // إذا توقف البوت لأي سبب، يتم إعادة تشغيله تلقائياً بعد 5 ثوانٍ
    child.on('exit', (code) => {
        console.log(`⚠️ توقف ${file} برمز الخروج ${code}, جاري إعادة تشغيله تلقائياً...`);
        setTimeout(() => {
            startBot(file, index);
        }, 5000);
    });

    child.on('error', (err) => {
        console.error(`❌ خطأ في تشغيل ${file}:`, err);
    });
}

// تشغيل البوتات بفارق زمني بسيط (فصل بينهم) عشان ما يصير ضغط على الموارد أو الـ Rate Limit
bots.forEach((bot, index) => {
    setTimeout(() => {
        startBot(bot, index + 1);
    }, index * 2000); // يفصل بين كل بوت وبوت ثاني ثانيتين
});
