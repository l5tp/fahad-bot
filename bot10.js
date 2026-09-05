process.env.FFMPEG_PATH = require('ffmpeg-static');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const scSearch = require('soundcloud-scraper');
const SoundCloud = new scSearch.Client();

const BOT_ID = 10;
const GUILD_ID = '1505700340392263720';
const CHANNEL_ID = '1545466885770977432'; // آيدي روم 10
const TOKEN = process.env.TOKEN_10;

if (!TOKEN) { console.error(`[BOT #${BOT_ID}] التوكن غير موجود!`); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const state = { textChannel: null, connection: null, player: createAudioPlayer(), songs: [], isPlaying: false, currentMessage: null, volume: 1 };

client.once('clientReady', () => { 
    console.log(`[BOT #${BOT_ID}] متصل: ${client.user.tag}`); 
    joinVoice(client, state, CHANNEL_ID); 
});

client.on('voiceStateUpdate', (o, n) => { if (n.member?.id === client.user.id && n.channelId !== CHANNEL_ID) joinVoice(client, state, CHANNEL_ID); });

client.on('messageCreate', async msg => {
    if (msg.author.bot || msg.guild?.id !== GUILD_ID || msg.member?.voice.channel?.id !== CHANNEL_ID || !msg.content.startsWith('!')) return;
    const args = msg.content.slice(1).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    state.textChannel = msg.channel; joinVoice(client, state, CHANNEL_ID);

    if (cmd === 'play' || cmd === 'رقصني') {
        const query = args.join(' ');
        if (!query) return msg.reply('❌ اكتب اسم الأغنية أو الشيلة الي تبيها!');

        const searchingMsg = await msg.reply('🔍 جاري البحث في SoundCloud...');

        try {
            const searchResults = await SoundCloud.search(query, "track");
            if (!searchResults || searchResults.length === 0) {
                return searchingMsg.edit('❌ لم يتم العثور على نتائج في ساوند كلاود.');
            }

            const track = searchResults[0];

            state.songs.push({ 
                title: track.title, 
                url: track.url, 
                thumbnail: track.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500', 
                duration: track.durationFormatted || 'مباشر', 
                requestedBy: msg.author.tag 
            });

            await searchingMsg.delete().catch(()=>{});

            if (!state.isPlaying) {
                playNext(state, CHANNEL_ID, client);
                msg.reply(`▶️ جاري تشغيل: **${track.title}**`);
            } else {
                msg.reply(`✅ تم الإضافة للطابور: **${track.title}**`);
            }

        } catch (e) {
            console.error('خطأ في البحث:', e);
            searchingMsg.edit('❌ حدث خطأ أثناء البحث.').catch(()=>{});
        }
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
    const id = interaction.customId;

    if (id === `pause_${BOT_ID}`) { 
        state.player.pause(); 
        await interaction.reply({ content: '⏸️ تم إيقاف الصوت مؤقتاً.', flags: MessageFlags.Ephemeral }); 
    }
    else if (id === `resume_${BOT_ID}`) { 
        state.player.unpause(); 
        await interaction.reply({ content: '▶️ تم استئناف التشغيل.', flags: MessageFlags.Ephemeral }); 
    }
    else if (id === `skip_${BOT_ID}`) { 
        if (!state.isPlaying) return interaction.reply({ content: '❌ لا يوجد شيئ لتخطيه.', flags: MessageFlags.Ephemeral }); 
        state.player.stop(); 
        await interaction.reply({ content: '⏭️ تم تخطي الصوت.', flags: MessageFlags.Ephemeral }); 
    }
    else if (id === `stop_${BOT_ID}`) { 
        state.songs = []; 
        state.player.stop(); 
        if (state.currentMessage) { state.currentMessage.edit({ components: [] }).catch(()=>{}); state.currentMessage = null; } 
        await interaction.reply({ content: '🛑 تم إيقاف البوت وتنظيف الطابور.', flags: MessageFlags.Ephemeral }); 
    }
    else if (id === `vol_up_${BOT_ID}`) {
        state.volume = Math.min(state.volume + 0.2, 2);
        await interaction.reply({ content: `🔊 تم رفع الصوت (${Math.round(state.volume * 100)}%)`, flags: MessageFlags.Ephemeral });
    }
    else if (id === `vol_down_${BOT_ID}`) {
        state.volume = Math.max(state.volume - 0.2, 0.1);
        await interaction.reply({ content: `🔉 تم خفض الصوت (${Math.round(state.volume * 100)}%)`, flags: MessageFlags.Ephemeral });
    }
});

function joinVoice(c, st, chId) {
    c.channels.fetch(chId).then(ch => { if (ch?.isVoiceBased()) st.connection = joinVoiceChannel({ channelId: ch.id, guildId: ch.guild.id, adapterCreator: ch.guild.voiceAdapterCreator, selfDeaf: true }); }).catch(()=>{});
}

async function playNext(st, chId, c) {
    if (st.songs.length === 0) { st.isPlaying = false; if (st.currentMessage) { st.currentMessage.edit({ components: [] }).catch(()=>{}); st.currentMessage = null; } return; }
    st.isPlaying = true; const song = st.songs[0];
    try {
        joinVoice(c, st, chId); 

        // سحب الرابط الصوتي مباشرة من ساوند كلاود بدون حظر
        const streamURL = await SoundCloud.downloadTrack(song.url);
        const resource = createAudioResource(streamURL, { inlineVolume: true });
        resource.volume.setVolume(st.volume);
        
        st.connection.subscribe(st.player);
        st.player.play(resource);

        const embed = new EmbedBuilder()
            .setColor('#FF5500')
            .setTitle('🎶 جاري التشغيل الآن (SoundCloud)')
            .setDescription(`**[${song.title}](${song.url})**`)
            .addFields(
                { name: '⏱️ المدة', value: `\`${song.duration}\``, inline: true },
                { name: '👤 طلب بواسطة', value: `\`${song.requestedBy}\``, inline: true }
            );
        if (song.thumbnail) embed.setImage(song.thumbnail);

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`pause_${BOT_ID}`).setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`resume_${BOT_ID}`).setEmoji('▶️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`skip_${BOT_ID}`).setEmoji('⏭️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`stop_${BOT_ID}`).setEmoji('🛑').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`vol_up_${BOT_ID}`).setLabel('رفع الصوت 🔊').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`vol_down_${BOT_ID}`).setLabel('خُفض الصوت 🔉').setStyle(ButtonStyle.Secondary)
        );

        if (st.textChannel) {
            if (st.currentMessage) {
                st.currentMessage.edit({ embeds: [embed], components: [row1, row2] }).catch(async () => { 
                    st.currentMessage = await st.textChannel.send({ embeds: [embed], components: [row1, row2] }); 
                });
            } else {
                st.currentMessage = await st.textChannel.send({ embeds: [embed], components: [row1, row2] });
            }
        }
        st.player.removeAllListeners(AudioPlayerStatus.Idle);
        st.player.on(AudioPlayerStatus.Idle, () => { st.songs.shift(); playNext(st, chId, c); });
    } catch (e) { 
        console.error('خطأ أثناء التشغيل:', e);
        if (st.textChannel) st.textChannel.send(`❌ تعذر تشغيل (${song.title}).`).catch(()=>{});
        st.songs.shift(); 
        playNext(st, chId, c); 
    }
}
client.login(TOKEN);
