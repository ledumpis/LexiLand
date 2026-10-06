/**
 * English Game Lab — Gamification & Spaced Repetition Engine
 */
const EGL_Progress = {
  data: {
    xp: 0,
    level: 1,
    streak: 1,
    lastActiveDate: null,
    gamesPlayed: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    masteryMap: {},
    dailyChallenge: {
      date: new Date().toDateString(),
      target: 20,
      current: 0,
      completed: false
    }
  },

  init() {
    const saved = EGL_Storage.get(EGL_Storage.KEYS.PROGRESS);
    if (saved) this.data = { ...this.data, ...saved };
    this.checkStreak();
  },

  save() {
    EGL_Storage.set(EGL_Storage.KEYS.PROGRESS, this.data);
  },

  checkStreak() {
    const today = new Date().toDateString();
    if (!this.data.lastActiveDate) {
      this.data.streak = 1;
      this.data.lastActiveDate = today;
    } else if (this.data.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (this.data.lastActiveDate === yesterday) {
        this.data.streak += 1;
      } else {
        this.data.streak = 1;
      }
      this.data.lastActiveDate = today;
    }

    if (this.data.dailyChallenge.date !== today) {
      this.data.dailyChallenge = {
        date: today,
        target: 20,
        current: 0,
        completed: false
      };
    }
    this.save();
  },

  addXP(amt) {
    this.data.xp += amt;
    const oldLv = this.data.level;
    this.data.level = Math.floor(Math.sqrt(this.data.xp / 50)) + 1;
    if (this.data.level > oldLv) {
      EGL_Utils.sfx.levelUp();
    }
    this.save();
  },

  getXPProgress() {
    const curLv = this.data.level;
    const curXP = (curLv - 1) * (curLv - 1) * 50;
    const nextXP = curLv * curLv * 50;
    return Math.min(Math.max(((this.data.xp - curXP) / (nextXP - curXP)) * 100, 0), 100);
  },

  getNextLevelXP() {
    return this.data.level * this.data.level * 50;
  },

  updateWordMastery(word, isCorrect) {
    const key = word.toLowerCase();
    let cur = this.data.masteryMap[key] || 0;
    cur = isCorrect ? Math.min(100, cur + 20) : Math.max(0, cur - 15);
    this.data.masteryMap[key] = cur;

    if (isCorrect) {
      this.data.dailyChallenge.current += 1;
      if (this.data.dailyChallenge.current >= this.data.dailyChallenge.target && !this.data.dailyChallenge.completed) {
        this.data.dailyChallenge.completed = true;
        this.addXP(100);
      }
    }
    this.save();
  },

  getMastery(word) {
    return this.data.masteryMap[word.toLowerCase()] || 0;
  }
};