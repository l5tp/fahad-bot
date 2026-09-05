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

    client.once('ready', async () => {
        console.log(`[🚀 BOT #${config.id}] اشتغل بنجاح باسم: ${client.user.tag}`);
        
        try {
            const guild = await client.guilds.fetch(TARGET_GUILD_ID);
            if (!guild) return;
            const channel = await guild.channels.fetch(config.channelId);
            if (channel && channel.isVoiceBased()) {
                queue.voiceChannel = channel;
                queue.connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false
                });
                console.log(`[🎧 BOT #${config.id}] دخل الروم الصوتي بنجاح!`);
            }
        } catch (err) {
            console.error(`[❌ BOT #${config.id}] فشل في دخول الروم الصوتي تلقائياً:`, err);
        }
    });

    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;
        if (message.guild.id !== TARGET_GUILD_ID) return;

        const prefix = '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // التأكد أن الشخص يكتب الأمر في روم البوت أو أن البوت مخصص له
        if (message.member?.voice.channel?.id !== config.channelId && message.channel.id !== config.channelId) {
            // يمكننا السماح بالأمر إذا كان في الشات العام ولكن يخص هذا البوت عبر الـ ID
        }

        // أمر التشغيل
        if (command === 'play') {
            const query = args.join(' ');
            if (!query) return message.reply(`❌ بوت #${config.id}: اكتب اسم الأغنية أو الرابط!`);

            queue.textChannel = message.channel;

            // التأكد من الاتصال بالروم إذا لم يكن متصلاً
            if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Disconnected) {
                try {
                    const guild = message.guild;
                    const channel = await guild.channels.fetch(config.channelId);
                    if (channel) {
                        queue.voiceChannel = channel;
                        queue.connection = joinVoiceChannel({
                            channelId: channel.id,
                            guildId: guild.id,
                            adapterCreator: guild.voiceAdapterCreator,
                            selfDeaf: true,
                        });
                    }
                } catch (e) {}
            }

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

        // أمر رقصني (أو تشغيل مقحي/حماسي افتراضي)
        else if (command === 'رقصني' || command === 'dance') {
            queue.textChannel = message.channel;
            // تشغيل مقطع حماسي أو رقص افتراضي
            const query = args.join(' ') || 'رقص حماسي دي جي remix';
            
            try {
                const searchResult = await yts(query);
                const video = searchResult.videos[0];
                if (!video) return message.reply(`❌ بوت #${config.id}: ما حصلت شي للرقص!`);

                const song = { title: video.title, url: video.url };
                queue.songs.push(song);
                if (!queue.isPlaying) {
                    playNextSong(queue);
                } else {
                    message.reply(`💃 تم إضافة رقصة **${song.title}** للطابور يا وحش (بوت #${config.id})!`);
                }
            } catch (err) {
                message.reply(`❌ بوت #${config.id}: صار خطأ بسيطة.`);
            }
        }

        // أمر التخطي
        else if (command === 'skip') {
            if (!queue.isPlaying) return message.reply(`❌ بوت #${config.id}: مافيه شي شغغال حالياً!`);
            queue.player.stop();
            message.reply(`⏭️ تم تخطي الأغنية (بوت #${config.id}).`);
        }

        // أمر الإيقاف
        else if (command === 'stop') {
            queue.songs = [];
            queue.player.stop();
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
        return;
    }

    queue.isPlaying = true;
    const currentSong = queue.songs[0];

    try {
        if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Disconnected) {
            if (queue.voiceChannel) {
                queue.connection = joinVoiceChannel({
                    channelId: queue.voiceChannel.id,
                    guildId: queue.voiceChannel.guild.id,
                    adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
                    selfDeaf: true,
                });
            }
        }

        queue.connection.subscribe(queue.player);

        const stream = ytdl(currentSong.url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
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
        queue.songs.shift();
        playNextSong(queue);
    }
}

process.on('unhandledRejection', error => {
    console.error('Unhandled Rejection:', error);
});
