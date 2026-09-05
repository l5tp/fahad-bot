const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const queues = new Map();

client.once('ready', () => {
    console.log(`[+] البوت اشتغل بنجاح: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    let serverQueue = queues.get(message.guild.id);

    // أمر التشغيل !play
    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ يرجى كتابة اسم الأغنية أو رابط اليوتيوب!');

        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) return message.reply('❌ يجب أن تكون في روم صوتي لتشغيل الموسيقى!');

        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('❌ ليس لدي صلاحية الدخول أو التحدث في هذا الروم الصوتي!');
        }

        try {
            const searchResult = await yts(query);
            const video = searchResult.videos[0];
            if (!video) return message.reply('❌ لم يتم العثور على نتائج مطابقة لبحثك!');

            const song = {
                title: video.title,
                url: video.url,
                duration: video.timestamp,
                thumbnail: video.thumbnail
            };

            if (!serverQueue) {
                const queueContruct = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    songs: [],
                    player: createAudioPlayer(),
                    volume: 1,
                    playing: true,
                };

                queues.set(message.guild.id, queueContruct);
                queueContruct.songs.push(song);

                try {
                    const connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: message.guild.id,
                        adapterCreator: message.guild.voiceAdapterCreator,
                        selfDeaf: true,
                    });
                    queueContruct.connection = connection;
                    connection.subscribe(queueContruct.player);
                    playSong(message.guild, queueContruct.songs[0]);
                } catch (err) {
                    console.error(err);
                    queues.delete(message.guild.id);
                    return message.reply('❌ حدث خطأ أثناء الاتصال بالروم الصوتي.');
                }
            } else {
                serverQueue.songs.push(song);
                return message.reply(`✅ تم أضافة **${song.title}** إلى الطابور!`);
            }
        } catch (error) {
            console.error(error);
            message.reply('❌ حدث خطأ أثناء معالجة الطلب.');
        }
    } 
    // أمر التخطي !skip
    else if (command === 'skip') {
        if (!serverQueue) return message.reply('❌ لا توجد أغانٍ لتخطيها!');
        if (!message.member.voice.channel) return message.reply('❌ يجب أن تكون معي في نفس الروم الصوتي!');
        serverQueue.player.stop();
        message.reply('⏭️ تم تخطي الأغنية الحالية بنجاح.');
    } 
    // أمر الإيقاف والخروج !stop
    else if (command === 'stop') {
        if (!serverQueue) return message.reply('❌ لا توجد أغانٍ مشغلة حالياً!');
        if (!message.member.voice.channel) return message.reply('❌ يجب أن تكون معي في نفس الروم الصوتي!');
        serverQueue.songs = [];
        serverQueue.player.stop();
        serverQueue.connection.destroy();
        queues.delete(message.guild.id);
        message.reply('🛑 تم إيقاف البوت ومغادرة الروم الصوتي.');
    }
});

function playSong(guild, song) {
    const serverQueue = queues.get(guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queues.delete(guild.id);
        return;
    }

    try {
        const stream = ytdl(song.url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
            dlChunkSize: 0,
        });

        const resource = createAudioResource(stream);
        serverQueue.player.play(resource);
        serverQueue.textChannel.send(`🎶 جاري الآن تشغيل: **${song.title}**`);

        serverQueue.player.removeAllListeners(AudioPlayerStatus.Idle);
        serverQueue.player.on(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playSong(guild, serverQueue.songs[0]);
        });
    } catch (err) {
        console.error(err);
        serverQueue.songs.shift();
        playSong(guild, serverQueue.songs[0]);
    }
}

client.login(process.env.TOKEN);
