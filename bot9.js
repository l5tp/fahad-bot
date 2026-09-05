process.env.FFMPEG_PATH = require('ffmpeg-static');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const playdl = require('play-dl');

const BOT_ID = 9;
const GUILD_ID = '1505700340392263720';
const CHANNEL_ID = '1545466820193161327';
const TOKEN = process.env.TOKEN_9;

if (!TOKEN) { console.error(`[BOT #${BOT_ID}] التوكن غير موجود!`); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const state = { textChannel: null, connection: null, player: createAudioPlayer(), songs: [], isPlaying: false, currentMessage: null, volume: 1 };

client.once('clientReady', () => { console.log(`[BOT #${BOT_ID}] متصل: ${client.user.tag}`); joinVoice(client, state, CHANNEL_ID); });
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
            let videoUrl = q, title = q, thumbnail = '', duration = 'مباشر';
            if (!q.startsWith('http')) {
                const searchResults = await playdl.search(q, { limit: 1 });
                if (!searchResults || searchResults.length === 0) return m.edit('❌ لم يتم العثور على نتائج.');
                videoUrl = searchResults[0].url;
                title = searchResults[0].title;
                thumbnail = searchResults[0].thumbnails[0]?.url || '';
                duration = searchResults[0].duration || 'غير معروف';
            } else {
                const info = await playdl.video_info(q);
                title = info.video_details.title;
                thumbnail = info.video_details.thumbnails[0]?.url || '';
                duration = info.video_details.duration || 'غير معروف';
            }
            state.songs.push({ title, url: videoUrl, thumbnail, duration, requestedBy: msg.author.tag });
            await m.delete().catch(()=>{});
            if (!state.isPlaying) playNext(state, CHANNEL_ID, client);
            else msg.reply(`✅ تم الإضافة للطابور: **${title}**`);
        } catch (e) { 
            console.error(e);
            m.edit('❌ حدث خطأ أثناء جلب الأغنية.'); 
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
        await interaction.reply({ content: '⏭️ تم تخطي الأغنية.', flags: MessageFlags.Ephemeral }); 
    }
    else if (id === `stop_${BOT_ID}`) { 
        state.songs = []; 
        state.player.stop(); 
        if (state.currentMessage) { state.currentMessage.edit({ components: [] }).catch(()=>{}); state.currentMessage = null; } 
        await interaction.reply({ content: '🛑 تم إيقاف البوت وتنظيف الطابور.', flags: MessageFlags.Ephemeral }); 
    }
    else if (id === `vol_up_${BOT_ID}`) {
        state.volume = Math.min(state.volume + 0.2, 2);
        await interaction.reply({ content: `🔊 تم رفع الصوت (الدرجة الحالية: ${Math.round(state.volume * 100)}%)`, flags: MessageFlags.Ephemeral });
    }
    else if (id === `vol_down_${BOT_ID}`) {
        state.volume = Math.max(state.volume - 0.2, 0.1);
        await interaction.reply({ content: `🔉 تم خفض الصوت (الدرجة الحالية: ${Math.round(state.volume * 100)}%)`, flags: MessageFlags.Ephemeral });
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
        const streamData = await playdl.stream(song.url, { quality: 2 });
        const resource = createAudioResource(streamData.stream, { inputType: streamData.type, inlineVolume: true });
        resource.volume.setVolume(st.volume);
        
        st.connection.subscribe(st.player);
        st.player.play(resource);

        // تصميم لوحة التحكم الاحترافية (Embed)
        const embed = new EmbedBuilder()
            .setColor('#1DB954')
            .setTitle('🎶 مشغل الموسيقى - Music Control')
            .setDescription(`**[${song.title}](${song.url})**`)
            .addFields(
                { name: '⏱️ المدة', value: `\`${song.duration}\``, inline: true },
                { name: '👤 طلب بواسطة', value: `\`${song.requestedBy}\``, inline: true }
            );
        if (song.thumbnail) embed.setImage(song.thumbnail);

        // أزرار التحكم (إيقاف مؤقت، متابعة، تخطي، إيقاف نهائي، رفع صوت، خفض صوت)
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
        console.error(e);
        st.songs.shift(); 
        playNext(st, chId, c); 
    }
}
client.login(TOKEN);
