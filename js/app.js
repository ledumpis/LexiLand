/**
 * LexiLand — UI Orchestrator
 * Navigation, catalog, decks, home dashboard, settings and dialogs.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Boot subsystems
  EGL_Vocab.init();
  EGL_Progress.init();

  const $ = (id) => document.getElementById(id);
  const esc = (s) => EGL_Utils.escapeHtml(s);
  const icons = EGL_Utils.icons;

  // ---------- Static config ----------
  const GAME_ORDER = ['flashcard', 'multiple-choice', 'word-match', 'typing', 'memory',
                      'unscramble', 'true-false', 'spelling', 'speed-quiz', 'survival'];
  const DEFAULT_ART = '<i></i><i></i><i></i>';
  const GAME_META = {
    'flashcard':       { tone: 'sage',    tag: 'Study',          meta: 'Flip & self-rate' },
    'multiple-choice': { tone: 'sky',     tag: 'Quiz',           meta: '4 choices · keys 1–4' },
    'word-match':      { tone: 'sage',    tag: 'Pairs',          meta: '5 pairs · tap two cards' },
    'typing':          { tone: 'lav',     tag: 'Recall',         meta: 'Type from meaning' },
    'spelling':        { tone: 'rose',    tag: 'Listening',      meta: 'Listen, then spell' },
    'unscramble':      { tone: 'honey',   tag: 'Letters',        meta: 'Rebuild the word', art: '<i>L</i><i>E</i><i>X</i>' },
    'true-false':      { tone: 'primary', tag: 'Quick judgment', meta: 'True or false' },
    'speed-quiz':      { tone: 'primary', tag: 'Timed',          meta: '60 seconds' },
    'memory':          { tone: 'lav',     tag: 'Memory',         meta: '6 pairs · flip cards' },
    'survival':        { tone: 'rose',    tag: 'Survival',       meta: '3 lives · shrinking fuse' }
  };
  const metaFor = (id) => GAME_META[id] || { tone: 'sky', tag: 'Game', meta: 'Vocabulary practice' };
  const DIFF_INFO = {
    easy: 'Easy · 8 words per round',
    normal: 'Normal · 10 words per round',
    hard: 'Hard · 15 words per round'
  };

  let currentView = 'home';
  let inspectedDeckId = null;
  let vocabQuery = '';
  let confirmResolve = null;

  // ---------- Settings helpers ----------
  const getSettings = () => EGL_Storage.get(EGL_Storage.KEYS.SETTINGS) || {};
  function saveSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    EGL_Storage.set(EGL_Storage.KEYS.SETTINGS, s);
  }
  function syncSettingsUI() {
    const s = getSettings();
    const sfxOn = s.sfx !== false;
    if ($('setting-sfx')) $('setting-sfx').checked = sfxOn;
    if ($('setting-tts')) $('setting-tts').checked = s.tts !== false;
    const btn = $('btn-quick-sound');
    if (btn) btn.setAttribute('aria-pressed', String(sfxOn));
    if ($('sound-label')) $('sound-label').innerText = sfxOn ? 'Sound on' : 'Sound off';
  }

  // ---------- In-page confirm dialog ----------
  function askConfirm({ title, text, ok = 'Xác nhận', cancel = 'Hủy' }) {
    return new Promise((resolve) => {
      const box = $('modal-confirm');
      $('confirm-title').innerText = title;
      $('confirm-text').innerText = text;
      $('btn-confirm-ok').innerText = ok;
      $('btn-confirm-cancel').innerText = cancel;
      confirmResolve = (value) => {
        box.style.display = 'none';
        confirmResolve = null;
        resolve(value);
      };
      box.style.display = 'flex';
      $('btn-confirm-cancel').focus();
    });
  }
  $('btn-confirm-ok').addEventListener('click', () => confirmResolve && confirmResolve(true));
  $('btn-confirm-cancel').addEventListener('click', () => confirmResolve && confirmResolve(false));
  $('modal-confirm').addEventListener('click', (e) => {
    if (e.target === $('modal-confirm') && confirmResolve) confirmResolve(false);
  });

  // ---------- Small helpers ----------
  const sessionLive = () => !!(EGL_Engine.activeSession && !EGL_Engine.activeSession.ended);
  const meterClass = (m) => (m < 40 ? 'low' : m < 70 ? 'mid' : '');

  function whenLabel(ts) {
    const d = new Date(ts);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === new Date().toDateString()) return `Today, ${time}`;
    if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return `Yesterday, ${time}`;
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }

  function xpInfo() {
    const lv = EGL_Progress.data.level;
    const base = (lv - 1) * (lv - 1) * 50;
    const need = lv * lv * 50 - base;
    return { cur: EGL_Progress.data.xp - base, need, pct: EGL_Progress.getXPProgress() };
  }

  // 2. Navigation ------------------------------------------------------------
  const views = document.querySelectorAll('.view-panel');

  function switchView(viewId) {
    // Leaving the arena mid-game: stop timers, no XP awarded
    if (currentView === 'gameplay' && viewId !== 'gameplay') EGL_Engine.abandonSession();
    currentView = viewId;
    document.body.classList.toggle('is-playing', viewId === 'gameplay');

    views.forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    const target = $(`view-${viewId}`);
    if (target) target.classList.add('active');

    const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshUI();
  }

  function confirmLeaveGame() {
    return askConfirm({
      title: 'Rời khỏi ván chơi hiện tại?',
      text: 'Điểm và XP của ván này sẽ không được tính.',
      ok: 'Rời đi',
      cancel: 'Ở lại'
    });
  }

  async function requestView(viewId) {
    if (currentView === 'gameplay' && viewId !== 'gameplay' && sessionLive()) {
      if (!(await confirmLeaveGame())) return;
    }
    switchView(viewId);
  }

  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => requestView(el.dataset.view));
  });

  function startGame(gameId, difficulty = 'normal', words = null) {
    switchView('gameplay');
    EGL_Engine.startSession(gameId, difficulty, words);
  }

  document.querySelectorAll('[data-quick-game]').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.quickGame, 'normal'));
  });

  $('btn-challenge-continue')?.addEventListener('click', () => startGame('multiple-choice', 'normal'));

  // 3. Games catalog ---------------------------------------------------------
  const selectedDifficulty = () =>
    document.querySelector('#seg-difficulty .seg-btn.active')?.dataset.diff || 'normal';

  function renderGamesList() {
    const games = Object.values(EGL_Engine.games);
    if ($('nav-games-count')) $('nav-games-count').innerText = games.length;

    const catalog = $('games-catalog-container');
    if (!catalog) return;

    catalog.innerHTML = games.map(g => {
      const m = metaFor(g.id);
      return `
        <article class="game-card tone-${m.tone}" data-gid="${esc(g.id)}" role="button" tabindex="0" aria-label="Play ${esc(g.name)}">
          <div class="game-art art-${esc(g.id)}" aria-hidden="true">${m.art || DEFAULT_ART}</div>
          <div class="game-card-body">
            <div class="game-card-tags">
              <span class="tag">${esc(m.tag)}</span>
              <span class="game-card-meta">${esc(m.meta)}</span>
            </div>
            <h4>${esc(g.name)}</h4>
            <p>${esc(g.description)}</p>
            <span class="game-card-cta">Play ${icons.arrow}</span>
          </div>
        </article>
      `;
    }).join('');

    catalog.querySelectorAll('.game-card').forEach(card => {
      const play = () => startGame(card.dataset.gid, selectedDifficulty());
      card.addEventListener('click', play);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
      });
    });
  }

  document.querySelectorAll('#seg-difficulty .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#seg-difficulty .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if ($('diff-hint')) $('diff-hint').innerText = DIFF_INFO[btn.dataset.diff] || '';
    });
  });

  // 4. Decks & inspector -----------------------------------------------------
  const wordMatches = (w, q) =>
    (w.word || '').toLowerCase().includes(q) || (w.meaning || '').toLowerCase().includes(q);

  const deckMatches = (d, q) => {
    if (!q) return true;
    return (d.name || '').toLowerCase().includes(q) ||
           (d.description || '').toLowerCase().includes(q) ||
           d.words.some(w => wordMatches(w, q));
  };

  function deckCardHTML(d) {
    let total = 0;
    d.words.forEach(w => total += EGL_Progress.getMastery(w.word));
    const avg = d.words.length > 0 ? Math.round(total / d.words.length) : 0;
    const isActive = (d.id === EGL_Vocab.activeDeckId);
    const level = d.level || 'A2';

    return `
      <article class="deck-card lvl-${esc(level)} ${isActive ? 'is-active' : ''}">
        <div class="deck-card-top">
          <span class="tag tag-level">${esc(level)}</span>
          <span class="deck-count">${d.words.length} từ</span>
        </div>
        <h4>${esc(d.name)}</h4>
        <p>${esc(d.description || 'Bộ từ vựng chủ đề giao tiếp thực hành.')}</p>
        <div class="meter-row"><span>Tiến độ thành thạo</span><strong>${avg}%</strong></div>
        <div class="meter"><div class="meter-fill ${meterClass(avg)}" style="width:${avg}%"></div></div>
        <div class="deck-actions">
          <button class="btn btn-secondary btn-sm btn-inspect" data-id="${esc(d.id)}">Xem từ</button>
          <button class="btn btn-primary btn-sm btn-select-deck ${isActive ? 'is-current' : ''}" data-id="${esc(d.id)}">
            ${isActive ? `${icons.check} Đang chọn` : 'Chọn học'}
          </button>
        </div>
      </article>
    `;
  }

  function renderDecksUI() {
    const list = $('vocab-packs-container');
    const homePreview = $('home-decks-preview');
    const select = $('select-active-deck');
    const activeDeck = EGL_Vocab.getActiveDeck();

    if ($('sidebar-active-deck-name')) $('sidebar-active-deck-name').innerText = activeDeck.name;

    if (select) {
      select.innerHTML = EGL_Vocab.decks.map(d => `
        <option value="${esc(d.id)}" ${d.id === EGL_Vocab.activeDeckId ? 'selected' : ''}>${esc(d.name)} (${d.words.length} từ)</option>
      `).join('');
      select.onchange = (e) => {
        EGL_Vocab.setActiveDeck(e.target.value);
        renderDecksUI();
      };
    }

    const bindDeckButtons = (root, onInspect) => {
      root.querySelectorAll('.btn-select-deck').forEach(b => {
        b.onclick = () => { EGL_Vocab.setActiveDeck(b.dataset.id); renderDecksUI(); };
      });
      root.querySelectorAll('.btn-inspect').forEach(b => {
        b.onclick = () => onInspect(b.dataset.id);
      });
    };

    if (list) {
      const shown = EGL_Vocab.decks.filter(d => deckMatches(d, vocabQuery));
      list.innerHTML = shown.length
        ? shown.map(deckCardHTML).join('')
        : '<div class="empty">Không tìm thấy bộ từ nào phù hợp.</div>';
      bindDeckButtons(list, (id) => inspectDeck(id));
    }

    if (homePreview) {
      homePreview.innerHTML = EGL_Vocab.decks.slice(0, 3).map(deckCardHTML).join('');
      bindDeckButtons(homePreview, (id) => { switchView('vocabulary'); inspectDeck(id); });
    }

    renderHome();
  }

  function inspectDeck(id, scroll = true) {
    const deck = EGL_Vocab.getDeck(id);
    if (!deck) return;
    inspectedDeckId = id;

    let list = deck.words;
    if (vocabQuery) {
      const filtered = list.filter(w => wordMatches(w, vocabQuery));
      if (filtered.length) list = filtered;
    }

    $('inspector-title').innerText = deck.name;
    $('inspector-subtitle').innerText = list.length === deck.words.length
      ? `${deck.words.length} từ vựng trong bộ này`
      : `${list.length} / ${deck.words.length} từ khớp với tìm kiếm`;

    $('inspector-words-tbody').innerHTML = list.map(w => {
      const m = EGL_Progress.getMastery(w.word);
      return `
        <tr>
          <td><strong>${esc(w.word)}</strong></td>
          <td class="cell-phonetic">${esc(w.phonetic || '')}</td>
          <td><span class="tag tag-lav">${esc(w.type || 'n')}</span></td>
          <td>${esc(w.meaning)}</td>
          <td><div class="cell-mastery"><div class="meter meter-sm"><div class="meter-fill ${meterClass(m)}" style="width:${m}%"></div></div>${m}%</div></td>
          <td><button class="icon-btn" data-speak="${esc(w.word)}" aria-label="Pronounce ${esc(w.word)}">${icons.speak}</button></td>
        </tr>
      `;
    }).join('');

    const box = $('words-inspector');
    box.style.display = 'block';
    if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('btn-close-inspector')?.addEventListener('click', () => {
    $('words-inspector').style.display = 'none';
    inspectedDeckId = null;
  });

  $('vocab-search')?.addEventListener('input', (e) => {
    vocabQuery = e.target.value.trim().toLowerCase();
    renderDecksUI();
    if (inspectedDeckId && $('words-inspector').style.display !== 'none') inspectDeck(inspectedDeckId, false);
  });

  // Pronounce buttons anywhere (delegated; avoids inline onclick with unescaped words)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-speak]');
    if (btn) EGL_Utils.speak(btn.dataset.speak);
  });

  // New deck modal
  const deckModal = $('modal-deck');
  const openDeckModal = () => { deckModal.style.display = 'flex'; $('deck-form-name').focus(); };
  const closeDeckModal = () => { deckModal.style.display = 'none'; };
  $('btn-new-pack')?.addEventListener('click', openDeckModal);
  $('btn-close-modal')?.addEventListener('click', closeDeckModal);
  $('btn-cancel-modal')?.addEventListener('click', closeDeckModal);
  deckModal.addEventListener('click', (e) => { if (e.target === deckModal) closeDeckModal(); });

  $('btn-save-deck')?.addEventListener('click', () => {
    const name = $('deck-form-name').value.trim();
    if (!name) return EGL_Utils.toast('Vui lòng nhập tên bộ từ');
    const level = $('deck-form-level').value;
    const desc = $('deck-form-desc').value.trim();
    const jsonStr = $('deck-form-json').value.trim();
    let words = [];

    if (jsonStr) {
      try {
        words = JSON.parse(jsonStr);
        if (!Array.isArray(words)) throw new Error('not an array');
      } catch (err) {
        return EGL_Utils.toast('Định dạng JSON từ vựng chưa đúng');
      }
    }

    EGL_Vocab.addDeck({ id: 'deck_' + Date.now(), name, level, description: desc, words });
    ['deck-form-name', 'deck-form-desc', 'deck-form-json'].forEach(id => { $(id).value = ''; });
    closeDeckModal();
    renderDecksUI();
    EGL_Utils.toast('Đã tạo bộ từ mới');
  });

  // 5. JSON import / export --------------------------------------------------
  $('input-import-json')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (EGL_Vocab.importJSON(evt.target.result)) {
        EGL_Utils.toast('Đã thêm bộ từ mới thành công!');
        renderDecksUI();
      } else {
        EGL_Utils.toast('File JSON không hợp lệ.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('btn-export-vocab')?.addEventListener('click', () => {
    const deck = EGL_Vocab.getActiveDeck();
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${deck.id}.json`;
    a.click();
  });

  // 6. Greeting, home, review, achievements ---------------------------------
  function updateGreeting() {
    const hour = new Date().getHours();
    const g = $('top-greeting');
    const sub = $('top-subgreeting');
    if (!g) return;

    if (hour < 12) {
      g.innerText = 'Good morning';
      sub.innerText = 'Bắt đầu ngày mới với vài từ vựng nhẹ nhàng nhé?';
    } else if (hour < 18) {
      g.innerText = 'Good afternoon';
      sub.innerText = 'Ready to learn a little today?';
    } else {
      g.innerText = 'Good evening';
      sub.innerText = 'Thư giãn và củng cố thêm vài từ trước khi kết thúc ngày nhé?';
    }
  }

  function recommendedGameId() {
    const ids = Object.keys(EGL_Engine.games);
    const order = GAME_ORDER.filter(id => ids.includes(id)).concat(ids.filter(id => !GAME_ORDER.includes(id)));
    if (!order.length) return null;
    const last = EGL_Progress.data.lastSession && EGL_Progress.data.lastSession.gameId;
    const i = order.indexOf(last);
    return order[(i + 1) % order.length];
  }

  function renderHome() {
    if (!$('view-home')) return;
    const d = EGL_Progress.data;
    const deck = EGL_Vocab.getActiveDeck();
    const masteries = deck.words.map(w => EGL_Progress.getMastery(w.word));
    const avg = masteries.length ? Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length) : 0;
    const mastered = masteries.filter(m => m >= 80).length;
    const practiced = masteries.filter(m => m > 0).length;
    const xp = xpInfo();

    // Ledger
    $('home-stat-level').innerText = d.level;
    $('home-xp-bar').style.width = `${xp.pct}%`;
    $('home-stat-xp').innerText = `${xp.cur} / ${xp.need} XP`;
    $('home-stat-streak').innerText = d.streak;
    $('home-stat-streak-sub').innerText = d.streak === 1 ? 'day in a row' : 'days in a row';
    $('home-stat-mastered').innerText = mastered;
    $('home-stat-mastered-sub').innerText = `of ${deck.words.length} words in this deck`;
    $('home-stat-accuracy').innerText = d.questionsAnswered > 0
      ? `${Math.round((d.correctAnswers / d.questionsAnswered) * 100)}%` : '—';
    $('home-stat-games').innerText = `${d.gamesPlayed} ${d.gamesPlayed === 1 ? 'round' : 'rounds'} played`;

    // Continue learning
    const level = deck.level || 'A2';
    $('home-deck-name').innerText = deck.name;
    $('home-deck-desc').innerText = deck.description || 'Bộ từ vựng chủ đề giao tiếp thực hành.';
    const lvlTag = $('home-deck-level');
    lvlTag.innerText = level;
    lvlTag.className = `tag tag-level lvl-${level}`;
    $('home-deck-mastery').innerText = `${avg}%`;
    const bar = $('home-deck-bar');
    bar.style.width = `${avg}%`;
    bar.className = `meter-fill ${meterClass(avg)}`;
    $('home-deck-sub').innerText = `${practiced} practiced · ${mastered} mastered · ${deck.words.length} total`;

    // Recommended game
    const gid = recommendedGameId();
    const game = gid && EGL_Engine.games[gid];
    if (game) {
      const m = metaFor(gid);
      $('home-reco').className = `reco tone-${m.tone}`;
      $('reco-art').className = `game-art art-${gid}`;
      $('reco-art').innerHTML = m.art || DEFAULT_ART;
      $('reco-name').innerText = game.name;
      $('reco-desc').innerText = game.description;
      $('reco-tag').innerText = m.tag;
      $('btn-reco-play').onclick = () => startGame(gid, 'normal');
    }

    // Daily habit
    const dc = d.dailyChallenge;
    const pct = Math.min(100, Math.round((dc.current / dc.target) * 100));
    $('home-challenge-fill').style.width = `${pct}%`;
    $('home-challenge-count').innerText = `${Math.min(dc.current, dc.target)} / ${dc.target}`;
    $('home-challenge-msg').innerText = dc.completed
      ? 'Goal complete — lovely work today.'
      : `${Math.max(0, dc.target - dc.current)} more correct answers to go.`;
    document.querySelector('.habit')?.classList.toggle('is-done', !!dc.completed);

    // Recent activity
    const recent = d.recentSessions || [];
    $('home-recent-list').innerHTML = recent.length
      ? recent.map(r => `
          <li class="recent-row">
            <div>
              <strong>${esc(r.gameName)}</strong>
              <small>${esc(r.deckName)} · ${esc(whenLabel(r.ts))}</small>
            </div>
            <div class="recent-score">
              <strong>${r.score}</strong>
              <small>${r.accuracy}% accuracy</small>
            </div>
          </li>`).join('')
      : '<li class="empty">No rounds yet. Your first game will show up here.</li>';
  }

  function renderWeakWords() {
    const box = $('weak-words-container');
    if (!box) return;
    const sorted = EGL_Vocab.getActiveDeck().words
      .map(w => ({ ...w, mastery: EGL_Progress.getMastery(w.word) }))
      .sort((a, b) => a.mastery - b.mastery);

    box.innerHTML = sorted.map(w => `
      <div class="weak-row">
        <div class="weak-main">
          <strong>${esc(w.word)}</strong>
          <span class="weak-meaning">${esc(w.meaning)}${w.phonetic ? ` · ${esc(w.phonetic)}` : ''}</span>
        </div>
        <div class="weak-meter">
          <div class="meter meter-sm"><div class="meter-fill ${meterClass(w.mastery)}" style="width:${w.mastery}%"></div></div>
          ${w.mastery}%
        </div>
        <button class="icon-btn" data-speak="${esc(w.word)}" aria-label="Pronounce ${esc(w.word)}">${icons.speak}</button>
      </div>
    `).join('');
  }

  function renderAchievements() {
    const container = $('achievements-container');
    if (!container) return;
    const d = EGL_Progress.data;
    const total = d.questionsAnswered;
    const acc = total > 0 ? d.correctAnswers / total : 0;

    const list = [
      { mark: '100', tone: 'honey', title: 'First 100 Words', desc: 'Đã học trên 100 lượt từ vựng',
        check: () => total >= 100,
        progress: () => ({ cur: Math.min(total, 100), goal: 100, text: `${Math.min(total, 100)} / 100 lượt` }) },
      { mark: '7d', tone: 'primary', title: '7 Day Streak', desc: 'Duy trì chuỗi học tập 7 ngày liên tục',
        check: () => d.streak >= 7,
        progress: () => ({ cur: Math.min(d.streak, 7), goal: 7, text: `${Math.min(d.streak, 7)} / 7 ngày` }) },
      { mark: '90%', tone: 'sage', title: 'Perfect Quiz', desc: 'Đạt độ chính xác trên 90%',
        check: () => total >= 20 && acc >= 0.9,
        progress: () => ({ cur: Math.min(total, 20), goal: 20, text: `${Math.min(total, 20)} / 20 câu · hiện tại ${Math.round(acc * 100)}%` }) },
      { mark: '2+', tone: 'lav', title: 'Vocabulary Collector', desc: 'Sở hữu từ 2 bộ từ vựng trở lên',
        check: () => EGL_Vocab.decks.length >= 2,
        progress: () => ({ cur: Math.min(EGL_Vocab.decks.length, 2), goal: 2, text: `${Math.min(EGL_Vocab.decks.length, 2)} / 2 bộ` }) }
    ];

    container.innerHTML = list.map(item => {
      const unlocked = item.check();
      const p = item.progress();
      const pct = Math.round((p.cur / p.goal) * 100);
      return `
        <div class="badge-card tone-${item.tone} ${unlocked ? 'unlocked' : 'locked'}">
          <div class="seal">${item.mark}</div>
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
          ${unlocked
            ? '<span class="tag tag-sage">Đã đạt</span>'
            : `<div class="meter meter-sm"><div class="meter-fill mid" style="width:${pct}%"></div></div><small class="badge-progress">${p.text}</small>`}
        </div>
      `;
    }).join('');
  }

  function refreshUI() {
    updateGreeting();
    const d = EGL_Progress.data;
    const xp = xpInfo();

    // Sidebar HUD
    $('hud-streak-text').innerText = `${d.streak} day streak`;
    $('hud-level-text').innerText = `Level ${d.level}`;
    $('hud-xp-display').innerText = `${xp.cur} / ${xp.need} XP`;
    $('hud-xp-bar').style.width = `${xp.pct}%`;
    if ($('top-level-chip')) $('top-level-chip').innerText = `Lv ${d.level}`;

    // Header daily chip
    const dc = d.dailyChallenge;
    $('top-challenge-text').innerText = `Daily: ${dc.current}/${dc.target} từ`;
    $('top-challenge-chip')?.classList.toggle('is-done', !!dc.completed);

    renderHome();
    renderWeakWords();
    renderAchievements();
  }

  // 7. Results modal & session handlers -------------------------------------
  const hideResults = () => { $('results-overlay').style.display = 'none'; };

  $('btn-res-play-again')?.addEventListener('click', () => {
    hideResults();
    const s = EGL_Engine.activeSession;
    if (s) EGL_Engine.startSession(s.gameId, s.difficulty);
  });

  $('btn-res-choose-game')?.addEventListener('click', () => {
    hideResults();
    switchView('games');
  });

  $('btn-res-practice-weak')?.addEventListener('click', () => {
    hideResults();
    startWeakWordsSession();
  });

  function startWeakWordsSession() {
    const deck = EGL_Vocab.getActiveDeck();
    const weak = deck.words.filter(w => EGL_Progress.getMastery(w.word) < 60);
    const pool = weak.length >= 4 ? weak : deck.words;
    startGame('multiple-choice', 'normal', pool);
  }
  $('btn-start-weak-session')?.addEventListener('click', startWeakWordsSession);
  $('btn-home-weak')?.addEventListener('click', startWeakWordsSession);

  $('btn-exit-game')?.addEventListener('click', async () => {
    if (sessionLive() && !(await confirmLeaveGame())) return;
    switchView('games');
  });

  // Keep the HUD and home fresh as soon as a round ends
  document.addEventListener('egl:session-end', refreshUI);

  // 8. Settings --------------------------------------------------------------
  $('setting-sfx')?.addEventListener('change', (e) => { saveSetting('sfx', e.target.checked); syncSettingsUI(); });
  $('setting-tts')?.addEventListener('change', (e) => { saveSetting('tts', e.target.checked); });

  $('btn-quick-sound')?.addEventListener('click', () => {
    const on = getSettings().sfx === false; // toggled value
    saveSetting('sfx', on);
    syncSettingsUI();
    EGL_Utils.toast(on ? 'Đã bật âm thanh' : 'Đã tắt âm thanh');
  });

  $('btn-export-full')?.addEventListener('click', () => EGL_Storage.exportFullBackup());

  $('input-import-full')?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (evt) => {
      if (EGL_Storage.importFullBackup(evt.target.result)) {
        EGL_Utils.toast('Đã phục hồi dữ liệu thành công!');
        setTimeout(() => location.reload(), 900);
      } else {
        EGL_Utils.toast('File sao lưu không hợp lệ.');
      }
    };
    r.readAsText(f);
    e.target.value = '';
  });

  $('btn-reset-data')?.addEventListener('click', async () => {
    const ok = await askConfirm({
      title: 'Đặt lại toàn bộ dữ liệu?',
      text: 'Điểm số, chuỗi streak, bộ từ và tiến độ sẽ trở về ban đầu.',
      ok: 'Đặt lại',
      cancel: 'Giữ lại'
    });
    if (ok) {
      localStorage.clear();
      location.reload();
    }
  });

  // 9. Keyboard --------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('modal-confirm').style.display === 'flex') $('btn-confirm-cancel').click();
      else if (deckModal.style.display === 'flex') closeDeckModal();
      return;
    }

    // Shortcuts 1–4 for Multiple Choice (ignored while typing in a field)
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
    if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      const btns = document.querySelectorAll('.mc-choice-grid .btn-choice');
      if (btns && btns[idx] && !btns[idx].disabled) btns[idx].click();
    }
  });

  // 10. Initial render -------------------------------------------------------
  syncSettingsUI();
  renderGamesList();
  renderDecksUI();
  refreshUI();
});