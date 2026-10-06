/**
 * English Game Lab — Dynamic Core Game Engine
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
    const deck = EGL_Vocab.getActiveDeck();
    const otherWords = deck.words.filter(w => w.word !== currentWord.word);
    return EGL_Utils.shuffle(otherWords).slice(0, count);
  },

  startSession(gameId, difficulty = 'normal', customWords = null) {
    const game = this.games[gameId];
    if (!game) return;

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
      weakWordsLearned: []
    };

    this.activeGame = game;
    const stage = document.getElementById('game-stage');
    stage.innerHTML = '';

    document.getElementById('current-game-title').innerText = game.name;
    document.getElementById('current-game-diff').innerText = difficulty.toUpperCase();
    this.updateStatsUI();

    game.init(stage, { words, difficulty, engine: this });
  },

  recordAnswer(isCorrect, wordObj) {
    const s = this.activeSession;
    if (!s) return;

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

  updateStatsUI() {
    if (!this.activeSession) return;
    document.getElementById('game-score').innerText = this.activeSession.score;
    document.getElementById('game-combo').innerText = `${this.activeSession.combo}x`;
  },

  endSession() {
    const s = this.activeSession;
    if (!s) return;

    if (this.activeGame && this.activeGame.cleanup) {
      this.activeGame.cleanup();
    }

    const accuracy = s.totalAnswered > 0 ? Math.round((s.correctCount / s.totalAnswered) * 100) : 0;
    const earnedXP = Math.round(s.score / 2) + (s.correctCount * 5);
    EGL_Progress.addXP(earnedXP);
    EGL_Progress.data.gamesPlayed += 1;
    EGL_Progress.save();

    document.getElementById('res-score').innerText = s.score;
    document.getElementById('res-accuracy').innerText = `${accuracy}%`;
    document.getElementById('res-correct').innerText = `${s.correctCount} / ${s.totalAnswered}`;
    document.getElementById('res-xp').innerText = `+${earnedXP} XP`;

    const weakBox = document.getElementById('res-weak-tags');
    weakBox.innerHTML = '';
    const unique = [...new Set(s.weakWordsLearned.map(w => w.word))];
    if (unique.length === 0) {
      weakBox.innerHTML = '<span style="color:var(--emerald); font-weight:800;">Flawless victory! No mistakes made.</span>';
      EGL_Utils.triggerConfetti();
    } else {
      unique.forEach(w => {
        const span = document.createElement('span');
        span.className = 'deck-badge-pill';
        span.innerText = w;
        weakBox.appendChild(span);
      });
    }

    document.getElementById('results-overlay').style.display = 'flex';
  }
};