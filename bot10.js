    if (cmd === 'play' || cmd === 'رقصني') {
        let q = args.join(' ');
        if (cmd === 'رقصني') q = q ? `رقص حماسي دي جي ${q}` : 'شيلات حماسية رقص';
        if (!q) return msg.reply('❌ يرجى كتابة اسم الأغنية أو الرابط!');
        const m = await msg.reply('🔍 جاري البحث...');
        try {
            let trackUrl = '', title = q, thumbnail = '', duration = 'مباشر';
            
            if (!q.startsWith('http')) {
                const searchResults = await playdl.search(q, { limit: 1 });
                const track = searchResults[0];
                if (!track) { await m.edit('❌ لم يتم العثور على نتائج!'); return; }
                trackUrl = track.url;
                title = track.title;
                thumbnail = track.thumbnail || track.thumbnails?.[0]?.url || '';
                duration = track.durationRaw || 'مباشرية';
            } else {
                trackUrl = q;
                const trackInfo = await playdl.video_info(q).catch(() => null);
                if (trackInfo) {
                    title = trackInfo.video_details.title;
                    thumbnail = trackInfo.video_details.thumbnails[0]?.url || '';
                    duration = trackInfo.video_details.duration || 'غير معروف';
                }
            }
            
            if (!trackUrl) return m.edit('❌ حدث خطأ في جلب الرابط.');

            state.songs.push({ title, url: trackUrl, thumbnail, duration, requestedBy: msg.author.tag });
            await m.delete().catch(()=>{});
            
            if (!state.isPlaying) {
                playNext(state, CHANNEL_ID, client);
            } else {
                msg.reply(`✅ تم الإضافة للطابور: **${title}**`);
            }
        } catch (e) { 
            console.error('خطأ في البحث:', e);
            m.edit('❌ حدث خطأ أثناء البحث.'); 
        }
    }
