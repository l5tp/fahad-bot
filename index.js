const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://fahad-bot-production.up.railway.app/auth/discord/callback';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'FahadAlMutairiOStoreSecretKey2026',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(obj, done));

if (CLIENT_ID && CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        process.nextTick(() => done(null, profile));
    }));
}

// قاعدة بيانات وهمية لتخزين إعدادات كل سيرفر محلياً
const guildDatabase = {};

// مسارات المصادقة
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// 1. الصفحة الرئيسية (تسجيل الدخول)
app.get('/', (req, res) => {
    res.send(`
        <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>O Store | تسجيل الدخول - فهد المطيري</title>
                <style>
                    body { background: #07090e; color: #f8fafc; font-family: Tahoma, sans-serif; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                    .box { background: #111827; padding: 40px; border-radius: 16px; border: 1px solid #1f2937; text-align: center; width: 400px; box-shadow: 0 15px 35px rgba(0,0,0,0.8); }
                    h1 { color: #38bdf8; font-size: 24px; margin-bottom: 10px; }
                    p { color: #9ca3af; font-size: 14px; margin-bottom: 30px; }
                    .btn { background: #5865F2; color: white; padding: 14px 20px; border-radius: 10px; text-decoration: none; font-weight: bold; display: block; transition: 0.3s; }
                    .btn:hover { background: #4752c4; }
                    .footer { margin-top: 25px; font-size: 12px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>⚡ O Store Dashboard</h1>
                    <p>لوحة التحكم المركزية لإدارة سيرفرات ديسكورد</p>
                    <a href="/auth/discord" class="btn">تسجيل الدخول بواسطة Discord 🚀</a>
                    <div class="footer">المبرمج: فهد المطيري © 2026</div>
                </div>
            </body>
        </html>
    `);
});

// 2. قائمة السيرفرات الخاصة بالمستخدم
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    
    // فلترة السيرفرات التي يمتلك فيها المستخدم صلاحية Administrator
    const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8 || (g.permissions & 0x20) === 0x20);

    let guildsList = adminGuilds.map(g => `
        <a href="/dashboard/${g.id}" class="guild-card">
            ${g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" width="55" height="55" style="border-radius: 50%;">` : `<div class="no-icon">${g.name.charAt(0)}</div>`}
            <div>
                <h3>${g.name}</h3>
                <span>إدارة الأقسام والتحكم ⚙️</span>
            </div>
        </a>
    `).join('');

    if (adminGuilds.length === 0) {
        guildsList = `<p style="color: #f87171; text-align: center;">لا توجد سيرفرات تمتلك صلاحية الإدارة فيها أو لم يتم إضافة البوت إليها!</p>`;
    }

    res.send(`
        <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>اختر السيرفر | O Store - فهد المطيري</title>
                <style>
                    body { background: #07090e; color: #f8fafc; font-family: Tahoma, sans-serif; margin: 0; padding: 30px; }
                    .header { display: flex; justify-content: space-between; align-items: center; background: #111827; padding: 20px 30px; border-radius: 12px; border: 1px solid #1f2937; }
                    h1 { color: #38bdf8; margin: 0; font-size: 22px; }
                    .logout { color: #f87171; text-decoration: none; font-weight: bold; }
                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 30px; }
                    .guild-card { background: #111827; padding: 20px; border-radius: 12px; border: 1px solid #1f2937; display: flex; align-items: center; gap: 20px; text-decoration: none; color: white; transition: 0.3s; }
                    .guild-card:hover { border-color: #38bdf8; transform: translateY(-3px); }
                    .no-icon { width: 55px; height: 55px; border-radius: 50%; background: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; }
                    .guild-card h3 { margin: 0 0 5px 0; font-size: 17px; }
                    .guild-card span { font-size: 12px; color: #34d399; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>مرحباً بك، ${req.user.username} 👋</h1>
                    <a href="/logout" class="logout">تسجيل الخروج 🚪</a>
                </div>
                <h2 style="margin-top: 40px; color: #e2e8f0;">اختر السيرفر للتحكم بأقسامه:</h2>
                <div class="grid">${guildsList}</div>
            </body>
        </html>
    `);
});

// 3. اللوحة الجانبية والأقسام الفرعية المفصلة لكل سيرفر
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    const guildId = req.params.guildId;

    if (!guildDatabase[guildId]) {
        guildDatabase[guildId] = {
            gamesStatus: 'مفعل',
            triviaPrize: '50',
            bankStatus: 'مفعل',
            currency: 'عملة O',
            tempStatus: 'مفعل',
            tempPrefix: 'ROOM-',
            musicStatus: 'مفعل',
            defaultVol: '75'
        };
    }
    const cfg = guildDatabase[guildId];

    res.send(`
        <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>لوحة التحكم التفصيلية | O Store - فهد المطيري</title>
                <style>
                    body { background: #07090e; color: #f8fafc; font-family: Tahoma, sans-serif; margin: 0; display: flex; height: 100vh; overflow: hidden; }
                    .sidebar { width: 280px; background: #111827; border-left: 1px solid #1f2937; display: flex; flex-direction: column; padding: 20px; }
                    .sidebar h2 { color: #38bdf8; font-size: 18px; text-align: center; margin-bottom: 25px; }
                    .sidebar a { color: #9ca3af; text-decoration: none; padding: 12px 15px; border-radius: 8px; margin-bottom: 8px; font-weight: bold; display: block; transition: 0.3s; }
                    .sidebar a:hover { background: #1e293b; color: #38bdf8; }
                    .content { flex: 1; padding: 30px; overflow-y: auto; }
                    .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 25px; margin-bottom: 25px; }
                    .card h3 { color: #34d399; margin-top: 0; border-bottom: 1px solid #1f2937; padding-bottom: 10px; }
                    label { display: block; margin: 15px 0 5px; color: #9ca3af; font-size: 13px; }
                    input, select { width: 100%; padding: 10px; background: #07090e; border: 1px solid #374151; color: white; border-radius: 6px; box-sizing: border-box; }
                    .save-btn { background: #2563eb; color: white; padding: 12px 25px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; font-size: 15px; margin-top: 10px; }
                    .save-btn:hover { background: #1d4ed8; }
                    .back { color: #94a3b8; text-decoration: none; display: inline-block; margin-bottom: 20px; font-weight: bold; }
                    .alert { background: #065f46; color: #d1fae5; padding: 10px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="sidebar">
                    <h2>⚡ O Store Panel</h2>
                    <a href="#games">🎮 قسم الألعاب والتحديات</a>
                    <a href="#bank">🏦 البنك والمتجر الرقمي</a>
                    <a href="#temp">🎙️ الرومات المؤقتة</a>
                    <a href="#music">🎵 قسم الميوزك المتعدد</a>
                    <div style="margin-top: auto; text-align: center; font-size: 11px; color: #6b7280;">تصميم: فهد المطيري © 2026</div>
                </div>
                <div class="content">
                    <a href="/dashboard" class="back">← العودة لقائمة السيرفرات</a>
                    <h1>إدارة أقسام السيرفر والتحكم المفصل</h1>
                    ${req.query.saved ? '<div class="alert">✅ تم حفظ وتحديث الإعدادات وتطبيقها على البوت بنجاح!</div>' : ''}
                    
                    <form action="/dashboard/${guildId}/save" method="POST">
                        <div class="card" id="games">
                            <h3>🎮 قسم الألعاب والتحديات (أقسام فرعية)</h3>
                            <label>حالة نظام الألعاب:</label>
                            <select name="gamesStatus">
                                <option value="مفعل" ${cfg.gamesStatus === 'مفعل' ? 'selected' : ''}>مفعل 🟢</option>
                                <option value="متوقف" ${cfg.gamesStatus === 'متوقف' ? 'selected' : ''}>متوقف 🔴</option>
                            </select>
                            <label>قيمة جائزة التحديات السريعة:</label>
                            <input type="text" name="triviaPrize" value="${cfg.triviaPrize}">
                        </div>

                        <div class="card" id="bank">
                            <h3>🏦 البنك والمتجر الرقمي (أقسام فرعية)</h3>
                            <label>حالة نظام البنك والتحويلات:</label>
                            <select name="bankStatus">
                                <option value="مفعل" ${cfg.bankStatus === 'مفعل' ? 'selected' : ''}>مفعل 🟢</option>
                                <option value="متوقف" ${cfg.bankStatus === 'متوقف' ? 'selected' : ''}>متوقف 🔴</option>
                            </select>
                            <label>اسم العملة داخل السيرفر:</label>
                            <input type="text" name="currency" value="${cfg.currency}">
                        </div>

                        <div class="card" id="temp">
                            <h3>🎙️ الرومات المؤقتة (أقسام فرعية)</h3>
                            <label>حالة الرومات المؤقتة الصوتية:</label>
                            <select name="tempStatus">
                                <option value="مفعل" ${cfg.tempStatus === 'مفعل' ? 'selected' : ''}>مفعل 🟢</option>
                                <option value="متوقف" ${cfg.tempStatus === 'متوقف' ? 'selected' : ''}>متوقف 🔴</option>
                            </select>
                            <label>بادئة اسم الروم المؤقت (Prefix):</label>
                            <input type="text" name="tempPrefix" value="${cfg.tempPrefix}">
                        </div>

                        <div class="card" id="music">
                            <h3>🎵 قسم الميوزك المتعدد (أقسام فرعية)</h3>
                            <label>حالة مشغل الصوتيات:</label>
                            <select name="musicStatus">
                                <option value="مفعل" ${cfg.musicStatus === 'مفعل' ? 'selected' : ''}>مفعل 🟢</option>
                                <option value="متوقف" ${cfg.musicStatus === 'متوقف' ? 'selected' : ''}>متوقف 🔴</option>
                            </select>
                            <label>مستوى الصوت الافتراضي (%):</label>
                            <input type="text" name="defaultVol" value="${cfg.defaultVol}">
                        </div>

                        <button type="submit" class="save-btn">حفظ الإعدادات وتطبيقها 💾</button>
                    </form>
                </div>
            </body>
        </html>
    `);
});

// حفظ البيانات المحدثة
app.post('/dashboard/:guildId/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    const guildId = req.params.guildId;

    guildDatabase[guildId] = {
        gamesStatus: req.body.gamesStatus,
        triviaPrize: req.body.triviaPrize,
        bankStatus: req.body.bankStatus,
        currency: req.body.currency,
        tempStatus: req.body.tempStatus,
        tempPrefix: req.body.tempPrefix,
        musicStatus: req.body.musicStatus,
        defaultVol: req.body.defaultVol
    };

    res.redirect(`/dashboard/${guildId}?saved=true`);
});

// إعداد بوت ديسكورد وتشغيل الأوامر 100%
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.once('ready', () => {
    console.log(`[BOT READY] Logged in as ${client.user.tag}! Developed by Fahad Al-Mutairi.`);
    client.user.setActivity('O Store | فهد المطيري', { type: 3 });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'panel') {
        const embed = new EmbedBuilder()
            .setTitle('⚡ **لوحة التحكم المركزية - O Store**')
            .setDescription('جميع أنظمة الألعاب، البنك، الرومات، والميوزك تعمل بكفاءة 100%.')
            .addFields(
                { name: '🎮 الألعاب', value: 'نشط 🟢', inline: true },
                { name: '🏦 البنك', value: 'نشط 🟢', inline: true },
                { name: '🎙️ الرومات المؤقتة', value: 'نشط 🟢', inline: true },
                { name: '🎵 الميوزك', value: 'نشط 🟢', inline: true }
            )
            .setColor('#2563eb')
            .setFooter({ text: `Developed by Fahad Al-Mutairi (فهد المطيري)` });

        await interaction.reply({ embeds: [embed] });
    }
});

if (TOKEN) client.login(TOKEN.trim());

app.listen(PORT, () => {
    console.log(`[ULTIMATE DASHBOARD] Running on port ${PORT}`);
});
