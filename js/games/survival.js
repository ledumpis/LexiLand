EGL_Engine.register({
  id: 'survival',
  name: 'Word Bomb Survival',
  icon: '💣',
  description: 'Defuse the bomb before the fuse burns out! 3 lives total.',
  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.lives = 3;
    this.idx = 0;
    this.fuseTime = 5000;

    const livesPill = document.getElementById('lives-pill');
    livesPill.style.display = 'flex';
    this.updateLives();
    this.next();
  },
  updateLives() {
    document.getElementById('game-lives').innerText = '❤️'.repeat(Math.max(0, this.lives));
  },
  next() {
    if (this.lives <= 0 || this.idx >= this.words.length) {
      return this.engine.endSession();
    }
    const cur = this.words[this.idx];
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 3)]);

    this.container.innerHTML = `
      <div class="mc-box">
        <div class="fuse-bar"><div class="fuse-progress" id="fuse"></div></div>
        <div class="mc-question-bubble"><div class="mc-target-word">${cur.word}</div></div>
        <div class="mc-choice-grid">
          ${opts.map(o => `<button class="btn-choice bomb-btn" data-word="${o.word}">${o.meaning}</button>`).join('')}
        </div>
      </div>
    `;

    const fill = this.container.querySelector('#fuse');
    fill.style.transition = `width ${this.fuseTime}ms linear`;
    setTimeout(() => fill.style.width = '0%', 20);

    this.timer = setTimeout(() => this.handle(false, cur), this.fuseTime);

    this.container.querySelectorAll('.bomb-btn').forEach(b => {
      b.onclick = () => {
        clearTimeout(this.timer);
        this.handle(b.dataset.word === cur.word, cur);
      };
    });
  },
  handle(ok, cur) {
    if (!ok) {
      this.lives--;
      this.updateLives();
    }
    this.engine.recordAnswer(ok, cur);
    this.idx++;
    this.fuseTime = Math.max(2200, this.fuseTime - 250);
    this.next();
  },
  cleanup() {
    clearTimeout(this.timer);
    document.getElementById('lives-pill').style.display = 'none';
  }
});