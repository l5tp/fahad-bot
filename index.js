const { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder } = require('discord.js');
const { mainToken } = require('./config.json');
const express = require('express');

// إعداد لوحة التحكم الويب العامة بتصميم فخم وعربي بالكامل باسم فهد المطيري
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

let systemStatus = {
    games: true,
    bank: true,
    tempChannels: true,
    music: true,
    secretMsg: true
};

app.get('/', (req, res) => {
    res.send(`
        <html dir="rtl">
            <head>
                <title>O Store | لوحة التحكم الكبرى - فهد المطيري</title>
                <style>
                    body { background: #090d16; color: #f8fafc; font-family: Tahoma, sans-serif; margin: 0; padding: 25px; }
                    .header { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 30px; border-radius: 15px; text-align: center; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.6); }
                    h1 { color: #38bdf8; margin: 0; font-size: 28px; }
                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 30px; }
                    .card { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
                    .card h3 { color: #34d399; margin-top: 0; }
                    button { width: 100%; padding: 12px; margin-top: 15px; border-radius: 8px; border: none; font-family: Tahoma; font-size: 14px; background: #2563eb; color: white; font-weight: bold; cursor: pointer; transition: 0.3s; }
                    button:hover { background: #1d4ed8; }
                    .status-on { color: #4ade80; font-weight: bold; }
                    .status-off { color: #f87171; font-weight: bold; }
                    .footer { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 13px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>⚡ O Store & Mega Dashboard System</h1>
                    <p><b>البرمجة والتطوير:</b> فهد المطيري © 2026 | جميع الحقوق محفوظة</p>
                </div>
                <div class="grid">
                    <div class="card">
                        <h3>🎮 قسم الألعاب والتحديات</h3>
                        <p>الحالة: <span class="${systemStatus.games ? 'status-on' : 'status-off'}">${systemStatus.games ? 'يعمل 🟢' : 'متوقف 🔴'}</span></p>
                        <form action="/toggle/games" method="POST"><button type="submit">${systemStatus.games ? 'إيقاف النظام' : 'تشغيل النظام'}</button></form>
                    </div>
                    <div class="card">
                        <h3>🏦 البنك والمتجر الرقمي</h3>
                        <p>الحالة: <span class="${systemStatus.bank ? 'status-on' : 'status-off'}">${systemStatus.bank ? 'يعمل 🟢' : 'متوقف 🔴'}</span></p>
                        <form action="/toggle/bank" method="POST"><button type="submit">${systemStatus.bank ? 'إيقاف النظام' : 'تشغيل النظام'}</button></form>
                    </div>
                    <div class="card">
                        <h3>🎙️ الرومات المؤقتة (صوت/شات)</h3>
                        <p>الحالة: <span class="${systemStatus.tempChannels ? 'status-on' : 'status-off'}">${systemStatus.tempChannels ? 'يعمل 🟢' : 'متوقف 🔴'}</span></p>
                        <form action="/toggle/temp" method="POST"><button type="submit">${systemStatus.tempChannels ? 'إيقاف النظام' : 'تشغيل النظام'}</button></form>
                    </div>
                    <div class="card">
                        <h3>🎵 قسم الميوزك المتعدد</h3>
                        <p>الحالة: <span class="${systemStatus.music ? 'status-on' : 'status-off'}">${systemStatus.music ? 'يعمل 🟢' : 'متوقف 🔴'}</span></p>
                        <form action="/toggle/music" method="POST"><button type="submit">${systemStatus.music ? 'إيقاف النظام' : 'تشغيل النظام'}</button></form>
                    </div>
                </div>
                <div class="footer">
                    <p>O Store Management Platform - Designed for Fahad Al-Mutairi</p>
                </div>
            </body>
        </html>
    `);
});

app.post('/toggle/:system', (req, res) => {
    const sys = req.params.system;
    if (sys === 'games') systemStatus.games = !systemStatus.games;
    if (sys === 'bank') systemStatus.bank = !systemStatus.bank;
    if (sys === 'temp') systemStatus.tempChannels = !systemStatus.tempChannels;
    if (sys === 'music') systemStatus.music = !systemStatus.music;
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`[WEB DASHBOARD] Server is running on port ${PORT}`);
});

// إعدادات البوت الأساسية في ديسكورد
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember]
});

client.once('ready', () => {
    console.log(`[MEGA BOT READY] Logged in as ${client.user.tag}! Developed by Fahad Al-Mutairi.`);
    client.user.setActivity('O Store | فهد المطيري', { type: 3 });
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ للأدمبرسترات فقط.', ephemeral: true });
        }
        const embed = new EmbedBuilder()
            .setTitle('⚡ **لوحة التحكم المركزية - O Store**')
            .setDescription('إدارة كافة أقسام السيرفر والتحكم بالاختصارات والرومات والمزيد مباشرة.')
            .addFields(
                { name: '🎮 الألعاب', value: systemStatus.games ? 'مفعل 🟢' : 'متوقف 🔴', inline: true },
                { name: '🏦 البنك', value: systemStatus.bank ? 'مفعل 🟢' : 'متوقف 🔴', inline: true },
                { name: '🎙️ الرومات المؤقتة', value: systemStatus.tempChannels ? 'مفعل 🟢' : 'متوقف 🔴', inline: true },
                { name: '🎵 الميوزك', value: systemStatus.music ? 'مفعل 🟢' : 'متوقف 🔴', inline: true }
            )
            .setColor('#000000')
            .setFooter({ text: `Developed by Fahad Al-Mutairi (فهد المطيري)` });

        await interaction.reply({ embeds: [embed] });
    }
});

client.login(mainToken);
