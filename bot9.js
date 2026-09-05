process.env.FFMPEG_PATH = require('ffmpeg-static');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

const BOT_ID = 9;
const GUILD_ID = '1505700340392263720';
const CHANNEL_ID = '1505724955143442605';
const TOKEN = process.env.TOKEN_9;

if (!TOKEN) { console.error(`[BOT #${BOT_ID}] التوكن غير موجود!`); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const state = { textChannel: null, connection: null, player: createAudioPlayer(), songs: [], isPlaying: false, currentMessage: null };

client.once('ready', () => { console.log(`[BOT #${BOT_ID}] متصل: ${client.user.tag}`); joinVoice(client, state, CHANNEL_ID); });
client.on('voiceStateUpdate', (o, n) => { if (n.member?.id === client.user.id && n.channelId !== CHANNEL_ID) joinVoice(client, state, CHANNEL_ID); });

client.on('messageCreate', async msg => {
    if (msg.author.bot || msg.guild?.id !== GUILD_ID || msg.member?.voice.channel?.id !== CHANNEL_ID || !msg.content.startsWith('!')) return;
    const args = msg.content.slice(1).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    state.textChannel = msg.channel; joinVoice(client, state, CHANNEL_ID);

    if (cmd === 'play' || cmd === 'رقصني') {
        let q = args.join(' ');
        if (cmd === 'رقصني') q = q ? `رقص حماسي دي جي ${q}` : 'رقص حماسي دي جي remix عراقي سعودي';
        if (!q) return msg.reply('❌ يرجى كتابة اسم الأغنية أو الرابط!');
        const m = await msg.reply('🔍 جاري البحث...');
        try {
            let url = q, title = q;
            if (!q.startsWith('http')) {
                const res = await yts(q); const v = res.videos[0];
                if (!v) return m.edit('❌ لم يتم العثور على نتائج.');
                url = v.url; title = v.title;
            } else {
                const res = await yts(q); if (res.videos[0]) title = res.videos[0].title;
            }
            state.songs.push({ title, url, requestedBy: msg.author.tag });
            await m.delete().catch(()=>{});
            if (!state.isPlaying) playNext(state, CHANNEL_ID, client);
            else msg.reply(`✅ تم الإضافة للطابور: **${title}**`);
        } catch (e) { m.edit('❌ حدث خطأ.'); }
    } else if (cmd === 'skip') {
        if (!state.isPlaying) return msg.reply('❌ لا يوجد شيئ للتشغيل!');
        state.player.stop(); msg.reply('⏭️ تم التخطي.');
    } else if (cmd === 'stop') {
        state.songs = []; state.player.stop();
        if (state.currentMessage) { state.currentMessage.edit({ components: [] }).catch(()=>{}); state.currentMessage = null; }
        msg.reply('🛑 تم الإيقاف.');
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.guildId !== GUILD_ID) return;
    if (interaction.customId === `pause_${BOT_ID}`) { state.player.pause(); await interaction.reply({ content: '⏸️ مؤقت.', ephemeral: true }); }
    else if (interaction.customId === `resume_${BOT_ID}`) { state.player.unpause(); await interaction.reply({ content: '▶️ متابعة.', ephemeral: true }); }
    else if (interaction.customId === `skip_${BOT_ID}`) { if (!state.isPlaying) return interaction.reply({ content: '❌ لا شيئ.', ephemeral: true }); state.player.stop(); await interaction.reply({ content: '⏭️ تخطي.', ephemeral: true }); }
    else if (interaction.customId === `stop_${BOT_ID}`) { state.songs = []; state.player.stop(); if (state.currentMessage) { state.currentMessage.edit({ components: [] }).catch(()=>{}); state.currentMessage = null; } await interaction.reply({ content: '🛑 توقف.', ephemeral: true }); }
});

function joinVoice(c, st, chId) {
    c.channels.fetch(chId).then(ch => { if (ch?.isVoiceBased()) st.connection = joinVoiceChannel({ channelId: ch.id, guildId: ch.guild.id, adapterCreator: ch.guild.voiceAdapterCreator, selfDeaf: true }); }).catch(()=>{});
}

async function playNext(st, chId, c) {
    if (st.songs.length === 0) { st.isPlaying = false; if (st.currentMessage) { st.currentMessage.edit({ components: [] }).catch(()=>{}); st.currentMessage = null; } return; }
    st.isPlaying = true; const song = st.songs[0];
    try {
        joinVoice(c, st, chId); st.connection.subscribe(st.player);
        const stream = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1 << 25, quality: 'highestaudio', dlChunkSize: 0 });
        st.player.play(createAudioResource(stream));
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`pause_${BOT_ID}`).setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`resume_${BOT_ID}`).setEmoji('▶️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`skip_${BOT_ID}`).setEmoji('⏭️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`stop_${BOT_ID}`).setEmoji('🛑').setStyle(ButtonStyle.Danger)
        );
        const text = `🎶 جاري تشغيل: **${song.title}**\n👤 طلب بواسطة: \`${song.requestedBy}\``;
        if (st.textChannel) {
            if (st.currentMessage) st.currentMessage.edit({ content: text, components: [row] }).catch(async () => { st.currentMessage = await st.textChannel.send({ content: text, components: [row] }); });
            else st.currentMessage = await st.textChannel.send({ content: text, components: [row] });
        }
        st.player.removeAllListeners(AudioPlayerStatus.Idle);
        st.player.on(AudioPlayerStatus.Idle, () => { st.songs.shift(); playNext(st, chId, c); });
    } catch (e) { st.songs.shift(); playNext(st, chId, c); }
}
client.login(TOKEN);
