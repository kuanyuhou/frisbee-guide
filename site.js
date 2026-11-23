// 全站共用：頁首顯示台灣時間的今日日期與時間，跨日時通知各頁更新；首頁顯示下一場比賽倒數
(function () {
  const TZ = 'Asia/Taipei';
  const WD = '日一二三四五六';

  // 取得台灣時間的年月日時分（不受使用者裝置時區影響）
  function taipeiNow() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    const y = +p.year, m = +p.month, d = +p.day, h = +p.hour % 24, min = +p.minute;
    return { y, m, d, h, min, iso: `${p.year}-${p.month}-${p.day}`, date: new Date(y, m - 1, d) };
  }

  const toDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);

  window.SITE = {
    today: () => taipeiNow().date,   // 台灣時間的今天 00:00
    toDate,
    daysBetween,
  };

  function greeting(h) {
    if (h < 5) return '夜深了';
    if (h < 11) return '早安';
    if (h < 14) return '午安';
    if (h < 18) return '下午好';
    return '晚安';
  }

  function renderClock(t) {
    const el = document.getElementById('today');
    if (!el) return;
    const wd = WD[t.date.getDay()];
    const ampm = t.h < 12 ? '上午' : '下午';
    const h12 = t.h % 12 === 0 ? 12 : t.h % 12;
    const mm = String(t.min).padStart(2, '0');
    el.innerHTML =
      `<span class="today-greet">${greeting(t.h)}</span>` +
      `<span>📅 ${t.y} 年 ${t.m} 月 ${t.d} 日（星期${wd}）</span>` +
      `<span class="today-roc">民國 ${t.y - 1911} 年</span>` +
      `<span>🕒 ${ampm} ${h12}:${mm}</span>`;
    el.title = '台灣時間';
  }

  // 首頁：下一場比賽倒數
  function renderHomeNext(today) {
    const box = document.getElementById('home-next');
    if (!box || !window.EVENTS) return;
    const live = window.EVENTS.filter(e => !(e.note || '').startsWith('延期'));
    const ongoing = live.find(e => toDate(e.s) <= today && toDate(e.e) >= today);
    const next = live.filter(e => toDate(e.s) > today).sort((a, b) => toDate(a.s) - toDate(b.s))[0];
    const fmt = s => { const x = toDate(s); return `${x.getMonth() + 1}/${x.getDate()}（${WD[x.getDay()]}）`; };
    const range = e => e.s === e.e ? fmt(e.s) : `${fmt(e.s)} – ${fmt(e.e)}`;
    let html = '';
    if (ongoing) {
      const n = daysBetween(toDate(ongoing.s), today) + 1;
      html += `<span class="next-label">🥏 今天有比賽</span><strong>${ongoing.n}</strong>` +
        `<span>${range(ongoing)}・📍 ${ongoing.p}・<b>進行中（第 ${n} 天）</b></span>`;
    }
    if (next) {
      const days = daysBetween(today, toDate(next.s));
      html += `${ongoing ? '<hr>' : ''}<span class="next-label">🔜 下一場比賽</span><strong>${next.n}</strong>` +
        `<span>${range(next)}・📍 ${next.p}</span>` +
        `<span class="countdown">還有 <b>${days}</b> 天${days === 1 ? '，就是明天！' : ''}</span>`;
    }
    if (!html) {
      html = `<span class="next-label">🎉 ${today.getFullYear()} 年的比賽都已結束</span><span>明年的行事曆公布後會再更新。</span>`;
    }
    box.innerHTML = html + `<a class="next-link" href="events.html">看全部賽事 →</a>`;
    box.hidden = false;
  }

  let lastIso = null;
  function tick() {
    const t = taipeiNow();
    renderClock(t);
    if (t.iso !== lastIso) {
      const first = lastIso === null;
      lastIso = t.iso;
      renderHomeNext(t.date);
      // 跨過午夜時通知頁面重新計算（例如賽事頁的「還有幾天」）
      if (!first) document.dispatchEvent(new CustomEvent('site:daychange', { detail: { date: t.date } }));
    }
  }

  tick();
  setInterval(tick, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
})();
