process.env.FFMPEG_PATH = require('ffmpeg-static');

const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

const GUILD_ID = '1505700340392263720';

function setupLockedBot(id, token, targetChannelId) {
    if (!token) {
        console.log(`⚠️ بوت #${id} ليس لديه توكن معرف.`);
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

    const state = {
        textChannel: null,
        connection: null,
        player: createAudioPlayer(),
        songs: [],
        isPlaying: false
    };

    client.once('ready', async () => {
        console.log(`[🔒 BOT #${id}] متصل باسم: ${client.user.tag}`);
        lockAndJoinVoice(client, state, targetChannelId);
    });

    client.on('voiceStateUpdate', (oldState, newState) => {
        if (newState.member && newState.member.id === client.user.id) {
            if (newState.channelId !== targetChannelId) {
                lockAndJoinVoice(client, state, targetChannelId);
            }
        }
    });

    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;
        if (message.guild.id !== GUILD_ID) return;

        const memberVoice = message.member?.voice.channel;
        if (!memberVoice || memberVoice.id !== targetChannelId) return;

        const prefix = '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        state.textChannel = message.channel;
        lockAndJoinVoice(client, state, targetChannelId);

        if (command === 'play') {
            const query = args.join(' ');
            if (!query) return message.reply(`❌ بوت #${id}: اكتب اسم الأغنية أو الرابط!`);

            try {
                const searchResult = await yts(query);
                const video = searchResult.videos[0];
                if (!video) return message.reply(`❌ بوت #${id}: ما حصلت نتائج.`);

                const song = { title: video.title, url: video.url };
                state.songs.push(song);

                if (!state.isPlaying) {
                    playSong(state, id, targetChannelId, client);
                } else {
                    message.reply(`✅ تم إضافة **${song.title}** للطابور (بوت #${id})!`);
                }
            } catch (err) {
                message.reply(`❌ بوت #${id}: خطأ في البحث.`);
            }
        } 
        else if (command === 'رقصني' || command === 'dance') {
            const query = args.join(' ') || 'رقص حماسي دي جي remix';
            try {
                const searchResult = await yts(query);
                const video = searchResult.videos[0];
                if (!video) return message.reply(`❌ بوت #${id}: ما حصلت شي.`);

                const song = { title: video.title, url: video.url };
                state.songs.push(song);

                if (!state.isPlaying) {
                    playSong(state, id, targetChannelId, client);
                } else {
                    message.reply(`💃 تم إضافة رقصة **${song.title}** للطابور (بوت #${id})!`);
                }
            } catch (err) {
                message.reply(`❌ بوت #${id}: حدث خطأ.`);
            }
        }
        else if (command === 'skip') {
            if (!state.isPlaying) return message.reply(`❌ بوت #${id}: مافيه شي شغال!`);
            state.player.stop();
            message.reply(`⏭️ تم التخطي (بوت #${id}).`);
        }
        else if (command === 'stop') {
            state.songs = [];
            state.player.stop();
            message.reply(`🛑 تم الإيقاف (بوت #${id}).`);
        }
    });

    client.login(token).catch(err => {
        console.error(`❌ خطأ دخول بوت #${id}:`, err.message);
    });
}

async function lockAndJoinVoice(client, state, channelId) {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        if (!guild) return;
        const channel = await guild.channels.fetch(channelId);
        if (channel && channel.isVoiceBased()) {
            state.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
            });
        }
    } catch (e) {}
}

async function playSong(state, id, channelId, client) {
    if (state.songs.length === 0) {
        state.isPlaying = false;
        return;
    }

    state.isPlaying = true;
    const currentSong = state.songs[0];

    try {
        lockAndJoinVoice(client, state, channelId);
        state.connection.subscribe(state.player);

        const stream = ytdl(currentSong.url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
            dlChunkSize: 0,
            quality: 'highestaudio'
        });

        const resource = createAudioResource(stream);
        state.player.play(resource);

        if (state.textChannel) {
            state.textChannel.send(`🎶 (بوت #${id}) جاري تشغيل: **${currentSong.title}**`);
        }

        state.player.removeAllListeners(AudioPlayerStatus.Idle);
        state.player.on(AudioPlayerStatus.Idle, () => {
            state.songs.shift();
            playSong(state, id, channelId, client);
        });

    } catch (error) {
        state.songs.shift();
        playSong(state, id, channelId, client);
    }
}

// =====================================================================
// تشغيل الـ 10 بوتات بفارق زمني بسيط وآمن لكي لا تنهار الاستضافة
// =====================================================================

setTimeout(() => setupLockedBot(1,  process.env.TOKEN_1,  '1505724955143442605'), 1000);
setTimeout(() => setupLockedBot(2,  process.env.TOKEN_2,  '1515803830955151502'), 3000);
setTimeout(() => setupLockedBot(3,  process.env.TOKEN_3,  '1515803958344417310'), 5000);
setTimeout(() => setupLockedBot(4,  process.env.TOKEN_4,  '1545463745663205446'), 7000);
setTimeout(() => setupLockedBot(5,  process.env.TOKEN_5,  '1545463810037391531'), 9000);
setTimeout(() => setupLockedBot(6,  process.env.TOKEN_6,  '1545466619638325318'), 11000);
setTimeout(() => setupLockedBot(7,  process.env.TOKEN_7,  '1545466694955438201'), 13000);
setTimeout(() => setupLockedBot(8,  process.env.TOKEN_8,  '1545466766854197278'), 15000);
setTimeout(() => setupLockedBot(9,  process.env.TOKEN_9,  '1545466820193161327'), 17000);
setTimeout(() => setupLockedBot(10, process.env.TOKEN_10, '1545466885770977432'), 19000);

// حماية شاملة لمنع السكربت من الانطفاء تماماً
process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});
