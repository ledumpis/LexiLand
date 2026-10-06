EGL_Engine.register({
  id: 'speed-quiz',
  name: 'Speed Quiz',
  icon: '⚡',
  description: '60-second time trial. Build streaks and combo multipliers.',
  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.timeLeft = 60;
    this.idx = 0;

    const timerPill = document.getElementById('timer-pill');
    timerPill.style.display = 'flex';
    document.getElementById('game-timer').innerText = `${this.timeLeft}s`;

    this.timer = setInterval(() => {
      this.timeLeft--;
      document.getElementById('game-timer').innerText = `${this.timeLeft}s`;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.engine.endSession();
      }
    }, 1000);

    this.render();
  },
  render() {
    const cur = this.words[this.idx % this.words.length];
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 1)]);

    this.container.innerHTML = `
      <div class="mc-box" style="text-align:center;">
        <h2 style="font-size:2.8rem; color:var(--amber); margin-bottom:1.5rem;">${cur.word}</h2>
        <div style="display:flex; justify-content:center; gap:1.25rem;">
          ${opts.map(o => `
            <button class="btn-choice sp-opt" data-word="${o.word}" style="min-width:180px; padding:1.25rem; text-align:center;">
              ${o.meaning}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.sp-opt').forEach(b => {
      b.onclick = () => {
        this.engine.recordAnswer(b.dataset.word === cur.word, cur);
        this.idx++;
        this.render();
      };
    });
  },
  cleanup() {
    clearInterval(this.timer);
    document.getElementById('timer-pill').style.display = 'none';
  }
});