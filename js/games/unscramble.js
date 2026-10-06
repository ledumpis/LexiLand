EGL_Engine.register({
  id: 'unscramble',
  name: 'Unscramble',
  icon: '🔤',
  description: 'Assemble scrambled colorful letter tiles back into the word.',
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
    const letters = EGL_Utils.shuffle(cur.word.replace(/\s+/g, '').toUpperCase().split(''));
    let chosen = [];

    this.container.innerHTML = `
      <div class="unscramble-box">
        <h3 style="color:var(--text-muted); margin-bottom:1rem;">${cur.meaning}</h3>
        <div class="answer-slots" id="u-slots"></div>
        <div class="tile-pool">${letters.map(ch => `<div class="cozy-tile" data-char="${ch}">${ch}</div>`).join('')}</div>
        <div style="margin-top:1.5rem;">
          <button class="btn btn-soft btn-sm" id="btn-u-rst">Reset Letters</button>
        </div>
      </div>
    `;

    const slots = this.container.querySelector('#u-slots');
    const tiles = this.container.querySelectorAll('.cozy-tile');

    const updateUI = () => {
      slots.innerHTML = chosen.map(t => `<div class="cozy-tile" style="background:var(--sky); box-shadow:0 4px 0 #0284c7;">${t.char}</div>`).join('');
      if (chosen.length === letters.length) {
        const ok = (chosen.map(t => t.char).join('') === cur.word.replace(/\s+/g, '').toUpperCase());
        this.engine.recordAnswer(ok, cur);
        setTimeout(() => { this.idx++; this.render(); }, 750);
      }
    };

    tiles.forEach(t => {
      t.onclick = () => {
        t.classList.add('used-up');
        chosen.push({ char: t.dataset.char, tile: t });
        updateUI();
      };
    });

    this.container.querySelector('#btn-u-rst').onclick = () => {
      chosen = [];
      tiles.forEach(t => t.classList.remove('used-up'));
      updateUI();
    };
  },
  cleanup() {}
});