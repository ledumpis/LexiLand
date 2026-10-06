EGL_Engine.register({
  id: 'flashcard',
  name: 'Flashcard Challenge',
  icon: '🃏',
  description: 'Review cards with smooth 3D flip animation.',
  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.idx = 0;
    this.render();
  },
  render() {
    if (this.idx >= this.words.length) return this.engine.endSession();
    const cur = this.words[this.idx];

    this.container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div class="flashcard-3d-wrap" id="fc-card">
          <div class="flashcard-inner">
            <div class="card-face card-front">
              <span class="fun-chip">TAP TO FLIP</span>
              <h2 style="font-size:2.5rem; color:var(--sky); margin:0.85rem 0;">${cur.word}</h2>
              <p style="color:var(--text-muted); font-family:var(--font-mono);">${cur.phonetic || ''}</p>
            </div>
            <div class="card-face card-back">
              <span class="fun-chip" style="color:var(--emerald);">MEANING</span>
              <h2 style="font-size:2rem; margin:0.75rem 0;">${cur.meaning}</h2>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:1.5rem;">
          <button class="btn btn-bounce btn-soft btn-lg" id="btn-fc-no">❌ Still Learning</button>
          <button class="btn btn-bounce btn-accent btn-lg" id="btn-fc-yes" style="background:var(--emerald); color:#000; box-shadow:0 4px 0 #059669;">✓ I Got This!</button>
        </div>
      </div>
    `;

    const card = this.container.querySelector('#fc-card');
    card.onclick = () => card.classList.toggle('flipped');

    this.container.querySelector('#btn-fc-no').onclick = () => {
      this.engine.recordAnswer(false, cur);
      this.idx++;
      this.render();
    };
    this.container.querySelector('#btn-fc-yes').onclick = () => {
      this.engine.recordAnswer(true, cur);
      this.idx++;
      this.render();
    };
  },
  cleanup() {}
});