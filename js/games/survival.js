EGL_Engine.register({
  id: 'survival',
  name: 'Word Bomb Survival',
  icon: '⏱️',
  description: 'Tháo gỡ quả bom từ vựng trước khi đồng hồ đếm ngược về 0.',
  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.lives = 3;
    this.idx = 0;
    this.fuseTime = 5000; // ms per word round

    const livesPill = document.getElementById('lives-pill');
    if (livesPill) livesPill.style.display = 'flex';
    this.updateLivesDisplay();
    this.nextRound();
  },
  updateLivesDisplay() {
    const el = document.getElementById('game-lives');
    if (el) el.innerText = '❤️'.repeat(Math.max(0, this.lives));
  },
  nextRound() {
    if (this.lives <= 0 || this.idx >= this.words.length) {
      this.engine.endSession();
      return;
    }

    const cur = this.words[this.idx];
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 3)]);
    const startTime = Date.now();

    this.container.innerHTML = `
      <div class="bomb-survival-stage">
        <div class="bomb-apparatus-card" id="bomb-card">
          <div class="bomb-clock-visual">
            <span class="bomb-illustration">⏰</span>
            <span class="bomb-timer-display" id="bomb-seconds">05.0</span>
          </div>

          <div class="fuse-progress-wrap">
            <div class="fuse-progress-bar" id="fuse-bar"></div>
          </div>

          <div class="bomb-word-display">${cur.word}</div>
        </div>

        <div class="bomb-choice-grid">
          ${opts.map(o => `
            <button class="btn-bomb-option" data-word="${o.word}">${o.meaning}</button>
          `).join('')}
        </div>
      </div>
    `;

    const fuseBar = this.container.querySelector('#fuse-bar');
    const bombCard = this.container.querySelector('#bomb-card');
    const secondsDisplay = this.container.querySelector('#bomb-seconds');

    // Interval to update countdown time smoothly
    this.countdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, this.fuseTime - elapsed);
      const sec = (remaining / 1000).toFixed(1);
      if (secondsDisplay) secondsDisplay.innerText = sec < 10 ? `0${sec}` : sec;

      const pct = (remaining / this.fuseTime) * 100;
      if (fuseBar) fuseBar.style.width = `${pct}%`;

      // Visual alert when time runs low
      if (remaining <= 1800 && bombCard) {
        bombCard.classList.add('danger-pulse');
      }

      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        this.handleAnswer(false, cur);
      }
    }, 100);

    this.container.querySelectorAll('.btn-bomb-option').forEach(btn => {
      btn.onclick = () => {
        clearInterval(this.countdownInterval);
        const isCorrect = (btn.dataset.word === cur.word);
        this.handleAnswer(isCorrect, cur);
      };
    });
  },
  handleAnswer(isCorrect, currentWord) {
    if (!isCorrect) {
      this.lives--;
      this.updateLivesDisplay();
    }

    this.engine.recordAnswer(isCorrect, currentWord);
    this.idx++;
    this.fuseTime = Math.max(2200, this.fuseTime - 250); // Progressively accelerates
    this.nextRound();
  },
  cleanup() {
    clearInterval(this.countdownInterval);
    const livesPill = document.getElementById('lives-pill');
    if (livesPill) livesPill.style.display = 'none';
  }
});