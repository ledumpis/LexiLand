/**
 * LexiLand — UI Orchestrator
 * Navigation, catalog, decks, home dashboard, settings and dialogs.
 * Courses: Daily Life + English for Business Studies (8 unit decks).
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
                      'unscramble', 'true-false', 'spelling', 'speed-quiz', 'survival',
                      'business-vocabulary-lab'];
  const DEFAULT_ART = '<i></i><i></i><i></i>';
  // Game tags/meta are driven by i18n keys (Phase 2B) — vocabulary content stays English
  const GAME_TAG_KEYS = {
    'flashcard': 'game.tag.study', 'multiple-choice': 'game.tag.quiz', 'word-match': 'game.tag.pairs',
    'typing': 'game.tag.recall', 'spelling': 'game.tag.listening', 'unscramble': 'game.tag.letters',
    'true-false': 'game.tag.quick', 'speed-quiz': 'game.tag.timed', 'memory': 'game.tag.memory',
    'survival': 'game.tag.survival',
    'business-vocabulary-lab': 'game.tag.lab'
  };
  const GAME_META_KEYS = {
    'flashcard': 'game.meta.flashcard', 'multiple-choice': 'game.meta.multipleChoice', 'word-match': 'game.meta.wordMatch',
    'typing': 'game.meta.typing', 'spelling': 'game.meta.spelling', 'unscramble': 'game.meta.unscramble',
    'true-false': 'game.meta.trueFalse', 'speed-quiz': 'game.meta.speedQuiz', 'memory': 'game.meta.memory',
    'survival': 'game.meta.survival',
    'business-vocabulary-lab': 'game.meta.businessVocabularyLab'
  };
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
    'survival':        { tone: 'rose',    tag: 'Survival',       meta: '3 lives · shrinking fuse' },
    'business-vocabulary-lab': { tone: 'honey', tag: 'Lab', meta: 'Verified textbook items' }
  };
  const GAME_NAME_KEYS = { 'business-vocabulary-lab': 'game.name.business-vocabulary-lab' };
  const GAME_DESC_KEYS = { 'business-vocabulary-lab': 'game.desc.business-vocabulary-lab' };
  function i18nGameField(id, map, fallback) {
    const k = map[id];
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    if (!k || !i18n) return fallback;
    const v = i18n.t(k);
    return v === k ? fallback : v;
  }
  function i18nTag(id) {
    const k = GAME_TAG_KEYS[id];
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    return k && i18n ? i18n.t(k) : (GAME_META[id]?.tag || 'Game');
  }
  function i18nMeta(id) {
    const k = GAME_META_KEYS[id];
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    return k && i18n ? i18n.t(k) : (GAME_META[id]?.meta || '');
  }
  const metaFor = (id) => GAME_META[id] || { tone: 'sky', tag: 'Game', meta: 'Vocabulary practice' };
  function diffInfo(diff) {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const key = diff === 'easy' ? 'gamePark.diffHint.easy' : diff === 'hard' ? 'gamePark.diffHint.hard' : 'gamePark.diffHint.normal';
    return i18n ? i18n.t(key) : (diff === 'easy' ? 'Easy · 8 words per round' : diff === 'hard' ? 'Hard · 15 words per round' : 'Normal · 10 words per round');
  }

  let currentView = 'home';
  let inspectedDeckId = null;
  let vocabQuery = '';
  let confirmResolve = null;

  // ---------- Selected scope for Game Park (persists via activeDeck) ----------
  // selectedUnitId is a deck id (e.g. ebs_unit_12 or daily_life_01); 'random' means Random Unit
  let selectedUnitId = EGL_Vocab.activeDeckId || 'daily_life_01';
  let selectedRandom = false;
  // Normalize if saved id is invalid after an update
  if (!EGL_Vocab.getDeck(selectedUnitId)) {
    selectedUnitId = 'daily_life_01';
    selectedRandom = false;
  }

  function resolveGameWords() {
    if (selectedRandom) {
      const pick = EGL_Vocab.getRandomBusinessUnitId();
      const deck = pick ? EGL_Vocab.getDeck(pick) : null;
      if (deck) return { words: deck.words, scopeLabel: deck.name, unitId: pick };
    }
    const deck = EGL_Vocab.getDeck(selectedUnitId);
    if (!deck) return { words: EGL_Vocab.getActiveDeck().words, scopeLabel: EGL_Vocab.getActiveDeck().name, unitId: EGL_Vocab.getActiveDeck().id };
    return { words: deck.words, scopeLabel: deck.name, unitId: deck.id };
  }

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
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const labelKey = sfxOn ? 'settings.sound.on' : 'settings.sound.off';
    if ($('sound-label')) $('sound-label').innerText = i18n ? i18n.t(labelKey) : (sfxOn ? 'Sound on' : 'Sound off');
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
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const d = new Date(ts);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === new Date().toDateString()) return i18n ? i18n.t('common.today', { time }) : `Today, ${time}`;
    if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return i18n ? i18n.t('common.yesterday', { time }) : `Yesterday, ${time}`;
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
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    return askConfirm({
      title: i18n ? i18n.t('dialog.leaveGame.title') : 'Rời khỏi ván chơi hiện tại?',
      text: i18n ? i18n.t('dialog.leaveGame.text') : 'Điểm và XP của ván này sẽ không được tính.',
      ok: i18n ? i18n.t('dialog.leaveGame.ok') : 'Rời đi',
      cancel: i18n ? i18n.t('dialog.leaveGame.cancel') : 'Ở lại'
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

  function startGameScoped(gameId, difficulty = 'normal') {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const resolved = resolveGameWords();
    if (!selectedRandom) EGL_Vocab.setActiveDeck(resolved.unitId);
    const flyNote = selectedRandom
      ? (i18n ? i18n.t('gameplay.playingWithRandom', { name: resolved.scopeLabel }) : `Random Unit → ${resolved.scopeLabel}`)
      : (i18n ? i18n.t('gameplay.playingWith', { name: resolved.scopeLabel }) : `Playing with: ${resolved.scopeLabel}`);
    EGL_Utils.toast(flyNote);
    switchView('gameplay');
    EGL_Engine.startSession(gameId, difficulty, resolved.words);
    if (EGL_Engine.activeSession) EGL_Engine.activeSession.deckName = resolved.scopeLabel;
  }

  // Legacy wrappers still used by quick-links, reco, etc. — route through scope
  function startGame(gameId, difficulty = 'normal', words = null) {
    if (words) {
      switchView('gameplay');
      EGL_Engine.startSession(gameId, difficulty, words);
      return;
    }
    startGameScoped(gameId, difficulty);
  }

  document.querySelectorAll('[data-quick-game]').forEach(btn => {
    btn.addEventListener('click', () => startGameScoped(btn.dataset.quickGame, 'normal'));
  });

  $('btn-challenge-continue')?.addEventListener('click', () => startGameScoped('multiple-choice', 'normal'));

  // ---------- Scope picker (Game Park) ----------
  function setScopeCourse(courseId) {
    if (courseId === 'daily_life') {
      selectedUnitId = 'daily_life_01';
      selectedRandom = false;
    } else {
      // Business course — default to Unit 1 if currently on daily life
      if (selectedUnitId === 'daily_life_01' || selectedRandom) {
        const first = EGL_Vocab.getBusinessUnits()[0];
        selectedUnitId = first ? first.id : EGL_Vocab.getBusinessDeckIds()[0];
        selectedRandom = false;
      } else if (!EGL_Vocab.isBusinessUnitId(selectedUnitId)) {
        const first = EGL_Vocab.getBusinessUnits()[0];
        selectedUnitId = first ? first.id : selectedUnitId;
        selectedRandom = false;
      }
    }
    renderScopePicker();
  }

  function setScopeUnit(unitId) {
    if (unitId === '__random') {
      selectedRandom = true;
    } else {
      selectedUnitId = unitId;
      selectedRandom = false;
      EGL_Vocab.setActiveDeck(unitId);
    }
    renderScopePicker();
  }

  function renderScopePicker() {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const courseRow = $('scope-course-row');
    const unitRow = $('scope-unit-row');
    const cur = $('scope-current');
    if (!courseRow || !unitRow) return;

    const isDaily = !selectedRandom && selectedUnitId === 'daily_life_01';

    const dailyDeck = EGL_Vocab.getDeck('daily_life_01');
    const businessUnits = EGL_Vocab.getBusinessUnits();

    courseRow.innerHTML = `
      <button class="scope-pill ${isDaily ? 'is-active' : ''}" data-course="daily_life" type="button">
        <span class="scope-pill-kicker">${esc(tt('gamePark.scope.courseKicker'))}</span>
        <span class="scope-pill-name">${esc(tt('gamePark.scope.dailyLife'))}</span>
        <span class="scope-pill-meta">${dailyDeck ? tt('gamePark.scope.words', { count: dailyDeck.words.length }) : ''}</span>
      </button>
      <button class="scope-pill ${!isDaily ? 'is-active' : ''}" data-course="business" type="button">
        <span class="scope-pill-kicker">${esc(tt('gamePark.scope.courseKicker'))}</span>
        <span class="scope-pill-name">${esc(tt('gamePark.scope.businessStudies'))}</span>
        <span class="scope-pill-meta">${esc(tt('gamePark.scope.businessMeta'))}</span>
      </button>
    `;

    courseRow.querySelectorAll('[data-course]').forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.course === 'daily_life') setScopeCourse('daily_life');
        else setScopeCourse('business');
      });
    });

    if (isDaily) {
      unitRow.innerHTML = `
        <button class="scope-pill is-active" data-unit="daily_life_01" type="button">
          <span class="scope-pill-kicker">${esc(tt('gamePark.scope.unitKicker'))}</span>
          <span class="scope-pill-name">${esc(tt('gamePark.scope.dailyLifeEssentials'))}</span>
          <span class="scope-pill-meta">${tt('gamePark.scope.words', { count: dailyDeck.words.length })}</span>
        </button>
      `;
      unitRow.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => setScopeUnit(b.dataset.unit)));
      cur.innerHTML = tt('gamePark.scope.playingWithDeck', { name: esc(dailyDeck.name), count: dailyDeck.words.length });
    } else {
      unitRow.innerHTML = businessUnits.map(u => {
        const active = !selectedRandom && selectedUnitId === u.id;
        return `<button class="scope-pill ${active ? 'is-active' : ''}" data-unit="${esc(u.id)}" type="button">
          <span class="scope-pill-kicker">${esc(tt('gamePark.scope.unitLabel', { number: u.unit }))}</span>
          <span class="scope-pill-name">${esc(u.name)}</span>
          <span class="scope-pill-meta">${esc(tt('gamePark.scope.words', { count: u.words.length }))}</span>
        </button>`;
      }).join('') + `
        <button class="scope-pill scope-pill--random ${selectedRandom ? 'is-active' : ''}" data-unit="__random" type="button">
          <span class="scope-pill-kicker">${esc(tt('gamePark.scope.surpriseKicker'))}</span>
          <span class="scope-pill-name">${esc(tt('gamePark.scope.randomUnit'))}</span>
          <span class="scope-pill-meta">${esc(tt('gamePark.scope.pickOneOfEight'))}</span>
        </button>
      `;
      unitRow.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => setScopeUnit(b.dataset.unit)));
      if (selectedRandom) {
        cur.innerHTML = tt('gamePark.scope.playingWithRandom');
      } else {
        const d = EGL_Vocab.getDeck(selectedUnitId);
        cur.innerHTML = d
          ? tt('gamePark.scope.playingWithUnit', { name: esc(d.name), count: d.words.length })
          : esc(tt('gamePark.scope.chooseUnit'));
      }
    }
  }

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
      const tag = i18nTag(g.id);
      const meta = i18nMeta(g.id);
      const playLabel = (typeof EGL_I18n !== 'undefined') ? EGL_I18n.t('gamePark.card.play') : 'Play';
      const name = i18nGameField(g.id, GAME_NAME_KEYS, g.name);
      const description = i18nGameField(g.id, GAME_DESC_KEYS, g.description);
      return `
        <article class="game-card tone-${m.tone}" data-gid="${esc(g.id)}" role="button" tabindex="0" aria-label="${esc(((typeof EGL_I18n !== 'undefined') ? EGL_I18n.t('gamePark.card.ariaPlay', { name: name }) : `Play ${name}`))}">
          <div class="game-art art-${esc(g.id)}" aria-hidden="true">${m.art || DEFAULT_ART}</div>
          <div class="game-card-body">
            <div class="game-card-tags">
              <span class="tag">${esc(tag)}</span>
              <span class="game-card-meta">${esc(meta)}</span>
            </div>
            <h4>${esc(name)}</h4>
            <p>${esc(description)}</p>
            <span class="game-card-cta">${esc(playLabel)} ${icons.arrow}</span>
          </div>
        </article>
      `;
    }).join('');

    catalog.querySelectorAll('.game-card').forEach(card => {
      const play = () => startGameScoped(card.dataset.gid, selectedDifficulty());
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
      const cur = btn.dataset.diff;
      if ($('diff-hint')) $('diff-hint').innerText = diffInfo(cur);
    });
  });

  // 4. Decks & inspector -----------------------------------------------------
  const wordMatches = (w, q) =>
    (w.word || '').toLowerCase().includes(q) || (w.meaning || '').toLowerCase().includes(q) || (w.type || '').toLowerCase().includes(q) || (w.note || '').toLowerCase().includes(q);

  const deckMatches = (d, q) => {
    if (!q) return true;
    return (d.name || '').toLowerCase().includes(q) ||
           (d.shortName || '').toLowerCase().includes(q) ||
           (d.description || '').toLowerCase().includes(q) ||
           d.words.some(w => wordMatches(w, q));
  };

  function courseSections() {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const daily = EGL_Vocab.getDeck('daily_life_01');
    const businessUnits = EGL_Vocab.getBusinessUnits().map(u => EGL_Vocab.getDeck(u.id)).filter(Boolean);
    return [
      { id: 'daily_life', name: tt('decks.course.dailyLife'), decks: daily ? [daily] : [] },
      { id: 'english_for_business_studies', name: tt('decks.course.businessStudies'), level: 'Business English', description: tt('decks.course.businessDesc'), decks: businessUnits }
    ];
  }

  function deckCardHTML(d) {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    let total = 0;
    d.words.forEach(w => total += EGL_Progress.getMastery(w.word));
    const avg = d.words.length > 0 ? Math.round(total / d.words.length) : 0;
    const isActive = (d.id === EGL_Vocab.activeDeckId);
    const level = d.level || 'A2';
    const unitBadge = d.unitNumber ? tt('gamePark.scope.unitLabel', { number: d.unitNumber }) : level;
    const countLabel = tt('decks.card.words', { count: d.words.length });

    return `
      <article class="deck-card lvl-${esc(level)} ${isActive ? 'is-active' : ''} ${d.courseId === 'english_for_business_studies' ? 'deck-card--unit' : ''}">
        <div class="deck-card-top">
          <span class="tag tag-level">${esc(unitBadge)}</span>
          <span class="deck-count">${esc(countLabel)}</span>
        </div>
        <h4>${esc(d.name)}</h4>
        <p>${esc(d.description || tt('decks.card.fallbackDesc'))}</p>
        <div class="meter-row"><span>${esc(tt('decks.card.mastery'))}</span><strong>${avg}%</strong></div>
        <div class="meter"><div class="meter-fill ${meterClass(avg)}" style="width:${avg}%"></div></div>
        <div class="deck-actions">
          <button class="btn btn-secondary btn-sm btn-inspect" data-id="${esc(d.id)}">${esc(tt('decks.card.viewWords'))}</button>
          <button class="btn btn-primary btn-sm btn-select-deck ${isActive ? 'is-current' : ''}" data-id="${esc(d.id)}">
            ${isActive ? `${icons.check} ${esc(tt('decks.card.selected'))}` : esc(tt('decks.card.startLearning'))}
          </button>
        </div>
      </article>
    `;
  }

  function renderDecksUI() {
    const list = $('vocab-packs-container');
    const homePreview = $('home-decks-preview');
    const sections = courseSections();
    const allDecks = EGL_Vocab.decks;

    // Sidebar & active deck label driven by activeDeckId
    const activeDeck = EGL_Vocab.getActiveDeck();
    if ($('sidebar-active-deck-name')) $('sidebar-active-deck-name').innerText = activeDeck.name;

    const bindDeckButtons = (root, onInspect) => {
      root.querySelectorAll('.btn-select-deck').forEach(b => {
        b.onclick = () => {
          EGL_Vocab.setActiveDeck(b.dataset.id);
          // Keep Game Park scope in sync when user picks from Word Decks
          selectedUnitId = b.dataset.id;
          selectedRandom = false;
          renderDecksUI();
          renderScopePicker();
        };
      });
      root.querySelectorAll('.btn-inspect').forEach(b => {
        b.onclick = () => onInspect(b.dataset.id);
      });
    };

    if (list) {
      const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
      const tt = (k, p) => i18n ? i18n.t(k, p) : k;
      const filteredSections = sections.map(sec => ({
        ...sec,
        decks: sec.decks.filter(d => deckMatches(d, vocabQuery))
      })).filter(sec => sec.decks.length > 0 || !vocabQuery);

      if (vocabQuery) {
        const flat = allDecks.filter(d => deckMatches(d, vocabQuery));
        list.innerHTML = flat.length
          ? flat.map(deckCardHTML).join('')
          : `<div class="empty">${esc(tt('decks.empty.noMatch'))}</div>`;
        bindDeckButtons(list, (id) => inspectDeck(id));
      } else {
        list.innerHTML = filteredSections.map(sec => {
          const isBusiness = sec.id === 'english_for_business_studies';
          const count = sec.decks.length;
          const labelKey = isBusiness
            ? (count === 1 ? 'decks.course.unitsLabel.one' : 'decks.course.unitsLabel.other')
            : (count === 1 ? 'decks.course.deckLabel.one' : 'decks.course.deckLabel.other');
          return `
            <div class="course-block ${isBusiness ? 'course-block--business' : ''}">
              <div class="course-head">
                <div>
                  <h4 class="course-title">${esc(sec.name)}</h4>
                  <p class="hint">${esc(sec.description || tt(isBusiness ? 'decks.course.businessDesc' : 'decks.course.everydayVocab'))}</p>
                </div>
                <span class="tag ${isBusiness ? 'tag-honey' : 'tag-sky'}">${esc(tt(labelKey, { count }))}</span>
              </div>
              <div class="deck-grid">${sec.decks.map(deckCardHTML).join('')}</div>
            </div>
          `;
        }).join('');
        bindDeckButtons(list, (id) => inspectDeck(id));
      }
    }

    if (homePreview) {
      // Show Daily Life + first 2 business units as preview
      const previewDecks = [];
      const daily = EGL_Vocab.getDeck('daily_life_01');
      if (daily) previewDecks.push(daily);
      const biz = EGL_Vocab.getBusinessUnits().slice(0, 2).map(u => EGL_Vocab.getDeck(u.id)).filter(Boolean);
      previewDecks.push(...biz);
      homePreview.innerHTML = previewDecks.slice(0, 3).map(deckCardHTML).join('');
      bindDeckButtons(homePreview, (id) => { switchView('vocabulary'); inspectDeck(id); });
    }

    renderHome();
  }

  function inspectDeck(id, scroll = true) {
    const deck = EGL_Vocab.getDeck(id);
    if (!deck) return;
    inspectedDeckId = id;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;

    let list = deck.words;
    if (vocabQuery) {
      const filtered = list.filter(w => wordMatches(w, vocabQuery));
      if (filtered.length) list = filtered;
    }

    $('inspector-title').innerText = deck.name;
    $('inspector-subtitle').innerText = list.length === deck.words.length
      ? tt('decks.inspector.subtitle.all', { count: deck.words.length })
      : tt('decks.inspector.subtitle.filtered', { filtered: list.length, total: deck.words.length });

    $('inspector-words-tbody').innerHTML = list.map(w => {
      const m = EGL_Progress.getMastery(w.word);
      return `
        <tr>
          <td><strong>${esc(w.word)}</strong></td>
          <td class="cell-phonetic">${esc(w.phonetic || '')}</td>
          <td><span class="tag tag-lav">${esc(w.type || 'n')}</span></td>
          <td>${esc(w.meaning)}</td>
          <td><div class="cell-mastery"><div class="meter meter-sm"><div class="meter-fill ${meterClass(m)}" style="width:${m}%"></div></div>${m}%</div></td>
          <td><button class="icon-btn" data-speak="${esc(w.word)}" aria-label="${esc(tt('decks.inspector.th.speak'))} ${esc(w.word)}">${icons.speak}</button></td>
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
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const name = $('deck-form-name').value.trim();
    if (!name) return EGL_Utils.toast(tt('decks.toast.enterName'));
    const level = $('deck-form-level').value;
    const desc = $('deck-form-desc').value.trim();
    const jsonStr = $('deck-form-json').value.trim();
    let words = [];

    if (jsonStr) {
      try {
        words = JSON.parse(jsonStr);
        if (!Array.isArray(words)) throw new Error('not an array');
      } catch (err) {
        return EGL_Utils.toast(tt('decks.toast.invalidJson'));
      }
    }

    EGL_Vocab.addDeck({ id: 'deck_' + Date.now(), name, level, description: desc, words });
    ['deck-form-name', 'deck-form-desc', 'deck-form-json'].forEach(id => { $(id).value = ''; });
    closeDeckModal();
    renderDecksUI();
    renderScopePicker();
    EGL_Utils.toast(tt('decks.toast.created'));
  });

  // 5. JSON import / export --------------------------------------------------
  $('input-import-json')?.addEventListener('change', (e) => {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (EGL_Vocab.importJSON(evt.target.result)) {
        EGL_Utils.toast(tt('decks.toast.imported'));
        renderDecksUI();
        renderScopePicker();
      } else {
        EGL_Utils.toast(tt('decks.toast.invalidFile'));
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
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const hour = new Date().getHours();
    const g = $('top-greeting');
    const sub = $('top-subgreeting');
    if (!g) return;
    if (!i18n) {
      if (hour < 12) { g.innerText = 'Good morning'; sub.innerText = 'Bắt đầu ngày mới với vài từ vựng nhẹ nhàng nhé?'; }
      else if (hour < 18) { g.innerText = 'Good afternoon'; sub.innerText = 'Ready to learn a little today?'; }
      else { g.innerText = 'Good evening'; sub.innerText = 'Thư giãn và củng cố thêm vài từ trước khi kết thúc ngày nhé?'; }
      return;
    }
    if (hour < 12) {
      g.innerText = i18n.t('home.greeting.morning.title');
      sub.innerText = i18n.t('home.greeting.morning.sub');
    } else if (hour < 18) {
      g.innerText = i18n.t('home.greeting.afternoon.title');
      sub.innerText = i18n.t('home.greeting.afternoon.sub');
    } else {
      g.innerText = i18n.t('home.greeting.evening.title');
      sub.innerText = i18n.t('home.greeting.evening.sub');
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
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const d = EGL_Progress.data;
    const deck = EGL_Vocab.getActiveDeck();
    const masteries = deck.words.map(w => EGL_Progress.getMastery(w.word));
    const avg = masteries.length ? Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length) : 0;
    const mastered = masteries.filter(m => m >= 80).length;
    const practiced = masteries.filter(m => m > 0).length;
    const xp = xpInfo();

    $('home-stat-level').innerText = d.level;
    $('home-xp-bar').style.width = `${xp.pct}%`;
    $('home-stat-xp').innerText = `${xp.cur} / ${xp.need} XP`;
    $('home-stat-streak').innerText = d.streak;
    $('home-stat-streak-sub').innerText = tt(d.streak === 1 ? 'home.streak.one' : 'home.streak.other');
    $('home-stat-mastered').innerText = mastered;
    $('home-stat-mastered-sub').innerText = tt('home.stats.ofWords', { count: deck.words.length });
    $('home-stat-accuracy').innerText = d.questionsAnswered > 0
      ? `${Math.round((d.correctAnswers / d.questionsAnswered) * 100)}%` : '—';
    const roundsKey = d.gamesPlayed === 1 ? 'home.stats.rounds.one' : 'home.stats.rounds.other';
    $('home-stat-games').innerText = tt(roundsKey, { count: d.gamesPlayed });

    const level = deck.level || 'A2';
    $('home-deck-name').innerText = deck.name;
    $('home-deck-desc').innerText = deck.description || tt('home.continue.fallbackDesc');
    const lvlTag = $('home-deck-level');
    lvlTag.innerText = deck.unitNumber ? `Unit ${deck.unitNumber}` : level;
    lvlTag.className = `tag tag-level lvl-${level}`;
    $('home-deck-mastery').innerText = `${avg}%`;
    const bar = $('home-deck-bar');
    bar.style.width = `${avg}%`;
    bar.className = `meter-fill ${meterClass(avg)}`;
    $('home-deck-sub').innerText = tt('home.continue.practicedMasteredTotal', { practiced, mastered, total: deck.words.length });

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
      $('btn-reco-play').onclick = () => startGameScoped(gid, 'normal');
    }

    const dc = d.dailyChallenge;
    const pct = Math.min(100, Math.round((dc.current / dc.target) * 100));
    $('home-challenge-fill').style.width = `${pct}%`;
    $('home-challenge-count').innerText = `${Math.min(dc.current, dc.target)} / ${dc.target}`;
    $('home-challenge-msg').innerText = dc.completed
      ? tt('home.habit.goalComplete')
      : tt('home.habit.moreToGo', { n: Math.max(0, dc.target - dc.current) });
    document.querySelector('.habit')?.classList.toggle('is-done', !!dc.completed);

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
      : `<li class="empty">${esc(tt('home.recent.empty'))}</li>`;
  }

  function renderWeakWords() {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const box = $('weak-words-container');
    if (!box) return;
    const deck = EGL_Vocab.getActiveDeck();
    const sorted = deck.words
      .map(w => ({ ...w, mastery: EGL_Progress.getMastery(w.word) }))
      .sort((a, b) => a.mastery - b.mastery);

    box.innerHTML = sorted.length
      ? sorted.map(w => `
      <div class="weak-row">
        <div class="weak-main">
          <strong>${esc(w.word)}</strong>
          <span class="weak-meaning">${esc(w.meaning)}${w.phonetic ? ` · ${esc(w.phonetic)}` : ''}</span>
        </div>
        <div class="weak-meter">
          <div class="meter meter-sm"><div class="meter-fill ${meterClass(w.mastery)}" style="width:${w.mastery}%"></div></div>
          ${w.mastery}%
        </div>
        <button class="icon-btn" data-speak="${esc(w.word)}" aria-label="${esc(tt('review.pronounce', { word: w.word }))}">${icons.speak}</button>
      </div>
    `).join('')
      : `<div class="empty">${esc(tt('review.empty'))}</div>`;
  }

  function renderAchievements() {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const container = $('achievements-container');
    if (!container) return;
    const d = EGL_Progress.data;
    const total = d.questionsAnswered;
    const acc = total > 0 ? d.correctAnswers / total : 0;

    const list = [
      { mark: '100', tone: 'honey', key: 'first100', titleKey: 'achievements.badge.first100.title', descKey: 'achievements.badge.first100.desc',
        check: () => total >= 100,
        progress: () => ({ cur: Math.min(total, 100), goal: 100, text: tt('achievements.progress.first100', { cur: Math.min(total, 100), goal: 100 }) }) },
      { mark: '7d', tone: 'primary', key: 'streak7', titleKey: 'achievements.badge.streak7.title', descKey: 'achievements.badge.streak7.desc',
        check: () => d.streak >= 7,
        progress: () => ({ cur: Math.min(d.streak, 7), goal: 7, text: tt('achievements.progress.streak7', { cur: Math.min(d.streak, 7), goal: 7 }) }) },
      { mark: '90%', tone: 'sage', key: 'perfectQuiz', titleKey: 'achievements.badge.perfectQuiz.title', descKey: 'achievements.badge.perfectQuiz.desc',
        check: () => total >= 20 && acc >= 0.9,
        progress: () => ({ cur: Math.min(total, 20), goal: 20, text: tt('achievements.progress.perfect', { cur: Math.min(total, 20), goal: 20, percent: Math.round(acc * 100) }) }) },
      { mark: '2+', tone: 'lav', key: 'collector', titleKey: 'achievements.badge.collector.title', descKey: 'achievements.badge.collector.desc',
        check: () => EGL_Vocab.decks.length >= 2,
        progress: () => ({ cur: Math.min(EGL_Vocab.decks.length, 2), goal: 2, text: tt('achievements.progress.collector', { cur: Math.min(EGL_Vocab.decks.length, 2), goal: 2 }) }) }
    ];

    container.innerHTML = list.map(item => {
      const unlocked = item.check();
      const p = item.progress();
      const pct = Math.round((p.cur / p.goal) * 100);
      return `
        <div class="badge-card tone-${item.tone} ${unlocked ? 'unlocked' : 'locked'}">
          <div class="seal">${item.mark}</div>
          <h4>${esc(tt(item.titleKey))}</h4>
          <p>${esc(tt(item.descKey))}</p>
          ${unlocked
            ? `<span class="tag tag-sage">${esc(tt('achievements.unlocked'))}</span>`
            : `<div class="meter meter-sm"><div class="meter-fill mid" style="width:${pct}%"></div></div><small class="badge-progress">${esc(p.text)}</small>`}
        </div>
      `;
    }).join('');
  }

  function refreshUI() {
    updateGreeting();
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const d = EGL_Progress.data;
    const xp = xpInfo();

    $('hud-streak-text').innerText = i18n ? i18n.t('hud.dayStreak', { count: d.streak }) : `${d.streak} day streak`;
    $('hud-level-text').innerText = i18n ? i18n.t('hud.level', { level: d.level }) : `Level ${d.level}`;
    $('hud-xp-display').innerText = `${xp.cur} / ${xp.need} XP`;
    $('hud-xp-bar').style.width = `${xp.pct}%`;
    if ($('top-level-chip')) $('top-level-chip').innerText = `Lv ${d.level}`;

    const dc = d.dailyChallenge;
    $('top-challenge-text').innerText = i18n ? i18n.t('hud.daily', { current: dc.current, target: dc.target }) : `Daily: ${dc.current}/${dc.target} từ`;
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
    if (s) {
      const gid = s.gameId;
      const diff = s.difficulty;
      if (selectedRandom) {
        const pick = EGL_Vocab.getRandomBusinessUnitId();
        const deck = pick ? EGL_Vocab.getDeck(pick) : null;
        if (deck) {
          const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
          EGL_Utils.toast(i18n ? i18n.t('gameplay.playingWithRandom', { name: deck.name }) : `Random Unit → ${deck.name}`);
          switchView('gameplay');
          EGL_Engine.startSession(gid, diff, deck.words);
          if (EGL_Engine.activeSession) EGL_Engine.activeSession.deckName = deck.name;
          return;
        }
      }
      const d = EGL_Vocab.getDeck(selectedUnitId);
      switchView('gameplay');
      EGL_Engine.startSession(gid, diff, d ? d.words : null);
      if (EGL_Engine.activeSession && d) EGL_Engine.activeSession.deckName = d.name;
    }
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
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const deck = EGL_Vocab.getActiveDeck();
    const weak = deck.words.filter(w => EGL_Progress.getMastery(w.word) < 60);
    const pool = weak.length >= 4 ? weak : deck.words;
    switchView('gameplay');
    EGL_Engine.startSession('multiple-choice', 'normal', pool);
    if (EGL_Engine.activeSession) EGL_Engine.activeSession.deckName = i18n ? i18n.t('gameplay.weakPool', { name: deck.name }) : deck.name + ' · weak words';
  }
  $('btn-start-weak-session')?.addEventListener('click', startWeakWordsSession);
  $('btn-home-weak')?.addEventListener('click', startWeakWordsSession);

  $('btn-exit-game')?.addEventListener('click', async () => {
    if (sessionLive() && !(await confirmLeaveGame())) return;
    switchView('games');
  });

  document.addEventListener('egl:session-end', refreshUI);

  // 8. Settings --------------------------------------------------------------
  $('setting-sfx')?.addEventListener('change', (e) => { saveSetting('sfx', e.target.checked); syncSettingsUI(); });
  $('setting-tts')?.addEventListener('change', (e) => { saveSetting('tts', e.target.checked); });

  $('btn-quick-sound')?.addEventListener('click', () => {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const on = getSettings().sfx === false;
    saveSetting('sfx', on);
    syncSettingsUI();
    EGL_Utils.toast(i18n ? i18n.t(on ? 'settings.sound.on' : 'settings.sound.off') : (on ? 'Đã bật âm thanh' : 'Đã tắt âm thanh'));
  });

  $('btn-export-full')?.addEventListener('click', () => EGL_Storage.exportFullBackup());

  $('input-import-full')?.addEventListener('change', (e) => {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (evt) => {
      if (EGL_Storage.importFullBackup(evt.target.result)) {
        EGL_Utils.toast(i18n ? i18n.t('settings.backup.restored') : 'Đã khôi phục dữ liệu thành công!');
        setTimeout(() => location.reload(), 900);
      } else {
        EGL_Utils.toast(i18n ? i18n.t('settings.backup.invalid') : 'File sao lưu không hợp lệ.');
      }
    };
    r.readAsText(f);
    e.target.value = '';
  });

  $('btn-reset-data')?.addEventListener('click', async () => {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const ok = await askConfirm({
      title: i18n ? i18n.t('settings.reset.confirmTitle') : 'Đặt lại toàn bộ dữ liệu?',
      text: i18n ? i18n.t('settings.reset.confirmText') : 'Điểm số, chuỗi streak, bộ từ và tiến độ sẽ trở về ban đầu.',
      ok: i18n ? i18n.t('settings.reset.confirmOk') : 'Đặt lại',
      cancel: i18n ? i18n.t('settings.reset.confirmCancel') : 'Giữ lại'
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

    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
    if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      const btns = document.querySelectorAll('.mc-choice-grid .btn-choice');
      if (btns && btns[idx] && !btns[idx].disabled) btns[idx].click();
    }
  });

  // 10. i18n live update for Home + Settings + Game Park + Word Decks + Review/Profile/Achievements + Results/Dialogs (Phase 2/2B/2C/2D — no game state reset) -----
  document.addEventListener('egl:language-change', () => {
    syncSettingsUI();
    if (typeof renderHome === 'function') renderHome();
    if (typeof renderScopePicker === 'function') renderScopePicker();
    if (typeof renderGamesList === 'function') renderGamesList();
    if (typeof renderDecksUI === 'function') {
      renderDecksUI();
    }
    if (typeof renderWeakWords === 'function') renderWeakWords();
    if (typeof renderAchievements === 'function') renderAchievements();
    // Results modal — update visible results without resetting session
    const overlay = document.getElementById('results-overlay');
    const s = (typeof EGL_Engine !== 'undefined') ? EGL_Engine.activeSession : null;
    if (overlay && overlay.style.display !== 'none' && s && !s.ended === false) {
      // Re-render results labels by reusing game-engine logic without resetting score:
      // just refresh static result chrome via i18n; dynamic values stay as-is
      // Titles/subtitles will update on next endSession; for language switch mid-results, patch via t()
      const i18n2 = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
      if (i18n2) {
        // Keep accuracy-based title in sync
        const acc = s.totalAnswered > 0 ? Math.round((s.correctCount / s.totalAnswered) * 100) : 0;
        let t2 = i18n2.t('results.title.keepPracticing'), sub2 = i18n2.t('results.sub.keepPracticing');
        if (s.totalAnswered > 0) {
          if (acc === 100) { t2 = i18n2.t('results.title.flawless'); sub2 = i18n2.t('results.sub.flawless'); }
          else if (acc >= 80) { t2 = i18n2.t('results.title.greatWork'); sub2 = i18n2.t('results.sub.greatWork'); }
          else if (acc >= 50) { t2 = i18n2.t('results.title.goodEffort'); sub2 = i18n2.t('results.sub.goodEffort'); }
        }
        const rt = document.getElementById('results-title');
        const rs = document.getElementById('results-subtext');
        if (rt) rt.innerText = t2;
        if (rs) rs.innerText = sub2;
        const lu = document.getElementById('res-levelup');
        if (lu && lu.style.display !== 'none') {
          const lvl = (typeof EGL_Progress !== 'undefined') ? EGL_Progress.data.level : '';
          lu.innerText = i18n2.t('results.levelUp', { level: lvl });
        }
        const weakBox = document.getElementById('res-weak-tags');
        if (weakBox && weakBox.querySelector('.flawless-note')) {
          weakBox.querySelector('.flawless-note').innerText = i18n2.t('results.flawlessNote');
        }
      }
    }
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    if (i18n) i18n.applyTranslations();
    // Refresh DIFF hint to translated string without relying on removed DIFF_INFO constant
    const diffEl = document.getElementById('diff-hint');
    if (diffEl) {
      const cur = document.querySelector('#seg-difficulty .seg-btn.active')?.dataset.diff || 'normal';
      diffEl.innerText = diffInfo(cur);
    }
  });

  // 11. Initial render -------------------------------------------------------
  syncSettingsUI();
  renderScopePicker();
  renderGamesList();
  renderDecksUI();
  refreshUI();
});
