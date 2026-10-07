/**
 * LexiLand — Core Game Engine
 * Games register themselves and receive (container, { words, difficulty, engine }).
 *
 * Public helpers for games:
 *   engine.recordAnswer(isCorrect, wordObj)
 *   engine.getDistractors(wordObj, count)
 *   engine.setProgress(current, total, label?)   // drives the progress bar in the gameplay shell
 *   engine.endSession()
 */
const EGL_Engine = {
  games: {},
  activeGame: null,
  activeSession: null,

  register(gameConfig) {
    if (!gameConfig || !gameConfig.id) {
      console.error('Invalid game registration');
      return;
    }
    this.games[gameConfig.id] = gameConfig;
  },

  getWeightedWords(deck, count) {
    const words = [...deck.words];
    if (words.length <= count) return EGL_Utils.shuffle(words);

    const pool = [];
    words.forEach(w => {
      const mastery = EGL_Progress.getMastery(w.word);
      const weight = Math.max(10, 100 - mastery + 15);
      for (let i = 0; i < weight; i++) pool.push(w);
    });

    const chosen = new Set();
    while (chosen.size < count && pool.length > 0) {
      chosen.add(pool[Math.floor(Math.random() * pool.length)]);
    }
    return Array.from(chosen);
  },

  getDistractors(currentWord, count = 3) {
    // Scope distractors to the current session's word pool so units never leak into each other.
    const pool = (this.activeSession && Array.isArray(this.activeSession.words) && this.activeSession.words.length)
      ? this.activeSession.words
      : (EGL_Vocab.getActiveDeck().words || []);
    const otherWords = pool.filter(w => w.word !== currentWord.word);
    if (otherWords.length >= count) return EGL_Utils.shuffle(otherWords).slice(0, count);
    // Fallback: if unit pool is too small (should not happen with 27+ words), borrow from active deck
    const deck = EGL_Vocab.getActiveDeck();
    const fallback = deck.words.filter(w => w.word !== currentWord.word && !otherWords.some(o => o.word === w.word));
    return EGL_Utils.shuffle([...otherWords, ...fallback]).slice(0, count);
  },

  startSession(gameId, difficulty = 'normal', customWords = null) {
    const game = this.games[gameId];
    if (!game) return;

    // Make sure a previous game never leaves timers running
    if (this.activeGame && this.activeGame.cleanup) this.activeGame.cleanup();

    const deck = EGL_Vocab.getActiveDeck();
    const count = (difficulty === 'easy') ? 8 : (difficulty === 'hard') ? 15 : 10;
    const words = customWords || this.getWeightedWords(deck, count);

    this.activeSession = {
      gameId,
      difficulty,
      deckName: deck.name,
      words,
      score: 0,
      combo: 0,
      correctCount: 0,
      totalAnswered: 0,
      weakWordsLearned: [],
      progressLocked: false,
      ended: false,
      levelAtStart: EGL_Progress.data.level
    };

    this.activeGame = game;

    const overlay = document.getElementById('results-overlay');
    if (overlay) overlay.style.display = 'none';

    const stage = document.getElementById('game-stage');
    stage.innerHTML = '';
    stage.dataset.game = game.id;

    document.getElementById('current-game-title').innerText = game.name;
    document.getElementById('current-game-diff').innerText = difficulty.toUpperCase();
    this._renderProgress(0, words.length);
    this.updateStatsUI();

    game.init(stage, { words, difficulty, engine: this });
  },

  recordAnswer(isCorrect, wordObj) {
    const s = this.activeSession;
    if (!s || s.ended) return;

    s.totalAnswered += 1;
    EGL_Progress.data.questionsAnswered += 1;

    if (isCorrect) {
      s.combo += 1;
      s.correctCount += 1;
      EGL_Progress.data.correctAnswers += 1;
      s.score += 10 * Math.min(s.combo, 5);
      EGL_Utils.sfx.correct();
    } else {
      s.combo = 0;
      s.weakWordsLearned.push(wordObj);
      EGL_Utils.sfx.wrong();
    }

    EGL_Progress.updateWordMastery(wordObj.word, isCorrect);
    this.updateStatsUI();
  },

  /** Set the shell's progress bar. Calling this stops the engine's automatic progress. */
  setProgress(current, total, label) {
    if (this.activeSession) this.activeSession.progressLocked = true;
    this._renderProgress(current, total, label);
  },

  _renderProgress(current, total, label) {
    const fill = document.getElementById('game-progress-fill');
    if (!fill) return;
    const pct = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;
    fill.style.width = `${pct}%`;

    const lab = document.getElementById('game-progress-label');
    if (lab) lab.innerText = (label !== undefined) ? label : `${Math.min(current, total)} / ${total}`;

    const bar = document.getElementById('game-progress');
    if (bar) bar.setAttribute('aria-valuenow', String(Math.round(pct)));
  },

  _pulse(el) {
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth; // restart animation
    el.classList.add('bump');
  },

  updateStatsUI() {
    const s = this.activeSession;
    if (!s) return;

    const scoreEl = document.getElementById('game-score');
    const comboEl = document.getElementById('game-combo');
    const scoreText = String(s.score);
    const comboText = `${s.combo}x`;

    if (scoreEl.innerText !== scoreText) {
      scoreEl.innerText = scoreText;
      if (s.score > 0) this._pulse(scoreEl);
    }
    if (comboEl.innerText !== comboText) {
      comboEl.innerText = comboText;
      if (s.combo > 1) this._pulse(comboEl);
    }

    const comboPill = document.getElementById('combo-pill');
    if (comboPill) comboPill.classList.toggle('hot', s.combo >= 3);

    if (!s.progressLocked) {
      this._renderProgress(Math.min(s.totalAnswered, s.words.length), s.words.length);
    }
  },

  /** Leave a session without awarding XP (used when the player quits mid-game). */
  abandonSession() {
    if (this.activeGame && this.activeGame.cleanup) this.activeGame.cleanup();
    if (this.activeSession) this.activeSession.ended = true;
  },

  endSession() {
    const s = this.activeSession;
    if (!s || s.ended) return;
    s.ended = true;

    if (this.activeGame && this.activeGame.cleanup) {
      this.activeGame.cleanup();
    }

    const accuracy = s.totalAnswered > 0 ? Math.round((s.correctCount / s.totalAnswered) * 100) : 0;
    const earnedXP = Math.round(s.score / 2) + (s.correctCount * 5);
    const levelBefore = EGL_Progress.data.level;

    EGL_Progress.addXP(earnedXP);
    EGL_Progress.data.gamesPlayed += 1;

    // Recent activity log (additive field; older saves simply don't have it yet)
    const entry = {
      gameId: s.gameId,
      gameName: this.activeGame ? this.activeGame.name : s.gameId,
      deckName: s.deckName,
      score: s.score,
      accuracy,
      correct: s.correctCount,
      total: s.totalAnswered,
      ts: Date.now()
    };
    EGL_Progress.data.lastSession = entry;
    EGL_Progress.data.recentSessions = [entry, ...(EGL_Progress.data.recentSessions || [])].slice(0, 5);
    EGL_Progress.save();

    // Results modal
    let title = 'Keep practicing!';
    let sub = 'Every small practice session strengthens your memory.';
    if (s.totalAnswered > 0) {
      if (accuracy === 100) { title = 'Flawless round!'; sub = 'Not a single slip. Beautifully done.'; }
      else if (accuracy >= 80) { title = 'Great work!'; sub = 'You are building a solid memory for these words.'; }
      else if (accuracy >= 50) { title = 'Good effort!'; sub = 'The tricky words below will come back soon.'; }
    }
    document.getElementById('results-title').innerText = title;
    document.getElementById('results-subtext').innerText = sub;
    document.getElementById('res-score').innerText = s.score;
    document.getElementById('res-accuracy').innerText = `${accuracy}%`;
    document.getElementById('res-correct').innerText = `${s.correctCount} / ${s.totalAnswered}`;
    document.getElementById('res-xp').innerText = `+${earnedXP} XP`;

    const levelUp = document.getElementById('res-levelup');
    if (levelUp) {
      levelUp.style.display = (EGL_Progress.data.level > levelBefore) ? 'inline-block' : 'none';
      levelUp.innerText = `Level up! You reached level ${EGL_Progress.data.level}.`;
    }

    const weakBox = document.getElementById('res-weak-tags');
    weakBox.innerHTML = '';
    const unique = [...new Set(s.weakWordsLearned.map(w => w.word))];
    if (unique.length === 0) {
      const note = document.createElement('span');
      note.className = 'flawless-note';
      note.innerText = 'Flawless victory! No mistakes made.';
      weakBox.appendChild(note);
      EGL_Utils.triggerConfetti();
    } else {
      unique.forEach(w => {
        const span = document.createElement('span');
        span.className = 'word-chip';
        span.innerText = w;
        weakBox.appendChild(span);
      });
    }

    document.getElementById('results-overlay').style.display = 'flex';
    document.dispatchEvent(new CustomEvent('egl:session-end'));
  }
};