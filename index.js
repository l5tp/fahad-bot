const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

// بيانات الـ 10 بوتات مرتبة بدقة مع إيدي الرومات حقتهم
const botsConfig = [
    { id: 1, channelId: '1505724955143442605', tokenEnv: 'TOKEN_1' },
    { id: 2, channelId: '1515803830955151502', tokenEnv: 'TOKEN_2' },
    { id: 3, channelId: '1515803958344417310', tokenEnv: 'TOKEN_3' },
    { id: 4, channelId: '1545463745663205446', tokenEnv: 'TOKEN_4' },
    { id: 5, channelId: '1545463810037391531', tokenEnv: 'TOKEN_5' },
    { id: 6, channelId: '1545466619638325318', tokenEnv: 'TOKEN_6' },
    { id: 7, channelId: '1545466694955438201', tokenEnv: 'TOKEN_7' },
    { id: 8, channelId: '1545466766854197278', tokenEnv: 'TOKEN_8' },
    { id: 9, channelId: '1545466820193161327', tokenEnv: 'TOKEN_9' },
    { id: 10, channelId: '1545466885770977432', tokenEnv: 'TOKEN_10' }
];

const TARGET_GUILD_ID = '1505700340392263720';

// تشغيل كل بوت بشكل مستقل تماماً داخلياً
botsConfig.forEach((config) => {
    const token = process.env[config.tokenEnv];
    if (!token) {
        console.log(`⚠️ تخطي البوت رقم ${config.id}: متغير البيئة ${config.tokenEnv} غير موجود.`);
        return;
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    });

    const queue = {
        textChannel: null,
        voiceChannel: null,
        connection: null,
        player: createAudioPlayer(),
        songs: [],
        isPlaying: false
    };

    client.once('ready', () => {
        console.log(`[🚀 BOT #${config.id}] اشتغل بنجاح باسم: ${client.user.tag}`);
    });

    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;
        if (message.guild.id !== TARGET_GUILD_ID) return;

        const prefix = '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // أمر التشغيل الخاص بهذا البوت في رومه المحدد
        if (command === 'play') {
            const query = args.join(' ');
            if (!query) return message.reply(`❌ بوت #${config.id}: اكتب اسم الأغنية أو الرابط!`);

            const voiceChannel = message.member?.voice.channel;
            if (!voiceChannel || voiceChannel.id !== config.channelId) {
                return message.reply(`❌ هذا البوت مخصص فقط للروم الصوتي رقم ${config.id}!`);
            }

            queue.textChannel = message.channel;
            queue.voiceChannel = voiceChannel;

            try {
                const searchResult = await yts(query);
                const video = searchResult.videos[0];
                if (!video) return message.reply(`❌ بوت #${config.id}: لم يتم العثور على نتائج.`);

                const song = {
                    title: video.title,
                    url: video.url,
                    duration: video.timestamp
                };

                queue.songs.push(song);

                if (!queue.isPlaying) {
                    playNextSong(queue);
                } else {
                    message.reply(`✅ تم إضافة **${song.title}** إلى الطابور (بوت #${config.id})!`);
                }

            } catch (error) {
                console.error(`Bot #${config.id} Search Error:`, error);
                message.reply(`❌ بوت #${config.id}: حدث خطأ أثناء البحث.`);
            }
        }

        // أمر التخطي
        else if (command === 'skip') {
            const voiceChannel = message.member?.voice.channel;
            if (!voiceChannel || voiceChannel.id !== config.channelId) return;
            if (!queue.isPlaying) return message.reply(`❌ بوت #${config.id}: لا توجد أغنية تعمل حالياً!`);
            queue.player.stop();
            message.reply(`⏭️ تم تخطي الأغنية (بوت #${config.id}).`);
        }

        // أمر الإيقاف
        else if (command === 'stop') {
            const voiceChannel = message.member?.voice.channel;
            if (!voiceChannel || voiceChannel.id !== config.channelId) return;
            queue.songs = [];
            queue.player.stop();
            if (queue.connection) queue.connection.destroy();
            queue.isPlaying = false;
            message.reply(`🛑 تم إيقاف البوت وتفريغ الطابور (بوت #${config.id}).`);
        }
    });

    client.login(token).catch(err => {
        console.error(`❌ خطأ في تسجيل دخول البوت #${config.id}:`, err.message);
    });
});

// دالة تشغيل الأغاني المستقلة لكل بوت
async function playNextSong(queue) {
    if (queue.songs.length === 0) {
        queue.isPlaying = false;
        if (queue.connection) {
            try { queue.connection.destroy(); } catch (e) {}
        }
        return;
    }

    queue.isPlaying = true;
    const currentSong = queue.songs[0];

    try {
        if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Disconnected) {
            queue.connection = joinVoiceChannel({
                channelId: queue.voiceChannel.id,
                guildId: queue.voiceChannel.guild.id,
                adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true,
            });
        }

        queue.connection.subscribe(queue.player);

        const stream = ytdl(currentSong.url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25, // ذاكرة مؤقتة عالية لمنع أي تعليق
            dlChunkSize: 0,
            quality: 'highestaudio'
        });

        const resource = createAudioResource(stream);
        queue.player.play(resource);

        if (queue.textChannel) {
            queue.textChannel.send(`🎶 جاري الآن تشغيل: **${currentSong.title}**`);
        }

        queue.player.removeAllListeners(AudioPlayerStatus.Idle);
        queue.player.on(AudioPlayerStatus.Idle, () => {
            queue.songs.shift();
            playNextSong(queue);
        });

    } catch (error) {
        console.error('Playback Error:', error);
        if (queue.textChannel) {
            queue.textChannel.send(`⚠️ حدث خطأ أثناء تشغيل الأغنية، جاري الانتقال للتي بعدها...`);
        }
        queue.songs.shift();
        playNextSong(queue);
    }
}

// حماية شاملة تمنع البرنامج من الانهيار نهائياً
process.on('unhandledRejection', error => {
    console.error('Unhandled Rejection:', error);
});
