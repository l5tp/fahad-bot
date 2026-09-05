process.env.FFMPEG_PATH = require('ffmpeg-static');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

const GUILD_ID = '1505700340392263720';
const CHANNEL_ID = '1545466694955438201';
const TOKEN = process.env.TOKEN_7;
if (!TOKEN) process.exit(0);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const state = { textChannel: null, connection: null, player: createAudioPlayer(), songs: [], isPlaying: false };

client.once('ready', () => { console.log(`[BOT #7] متصل: ${client.user.tag}`); joinVoice(client, state, CHANNEL_ID); });
client.on('voiceStateUpdate', (o, n) => { if (n.member?.id === client.user.id && n.channelId !== CHANNEL_ID) joinVoice(client, state, CHANNEL_ID); });
client.on('messageCreate', async msg => {
    if (msg.author.bot || msg.guild?.id !== GUILD_ID || msg.member?.voice.channel?.id !== CHANNEL_ID || !msg.content.startsWith('!')) return;
    const args = msg.content.slice(1).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    state.textChannel = msg.channel; joinVoice(client, state, CHANNEL_ID);
    if (cmd === 'play') {
        const q = args.join(' '); if (!q) return msg.reply('❌ اكتب اسم الأغنية!');
        try { const res = await yts(q); const v = res.videos[0]; if (!v) return msg.reply('❌ ما حصلت نتيجة.');
            state.songs.push({ title: v.title, url: v.url });
            if (!state.isPlaying) playNext(state, CHANNEL_ID, client); else msg.reply(`✅ تم الإضافة: **${v.title}**`);
        } catch (e) { msg.reply('❌ خطأ.'); }
    } else if (cmd === 'skip') { if (state.isPlaying) { state.player.stop(); msg.reply('⏭️ تم التخطي.'); }
    } else if (cmd === 'stop') { state.songs = []; state.player.stop(); msg.reply('🛑 تم الإيقاف.'); }
});
function joinVoice(c, st, chId) {
    c.channels.fetch(chId).then(ch => { if (ch?.isVoiceBased()) st.connection = joinVoiceChannel({ channelId: ch.id, guildId: ch.guild.id, adapterCreator: ch.guild.voiceAdapterCreator, selfDeaf: true }); }).catch(() => {});
}
function playNext(st, chId, c) {
    if (st.songs.length === 0) { st.isPlaying = false; return; }
    st.isPlaying = true; const song = st.songs[0];
    try {
        joinVoice(c, st, chId); st.connection.subscribe(st.player);
        const stream = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1 << 25, quality: 'highestaudio' });
        st.player.play(createAudioResource(stream));
        if (st.textChannel) st.textChannel.send(`🎶 جاري تشغيل: **${song.title}**`);
        st.player.removeAllListeners(AudioPlayerStatus.Idle);
        st.player.on(AudioPlayerStatus.Idle, () => { st.songs.shift(); playNext(st, chId, c); });
    } catch (e) { st.songs.shift(); playNext(st, chId, c); }
}
client.login(TOKEN);
