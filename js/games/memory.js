EGL_Engine.register({
  id: 'memory',
  name: 'Memory Cards',
  icon: '🧠',
  description: 'Flip and match hidden cards between English words and meanings.',
  init(container, { words, engine }) {
    this.container = container;
    this.engine = engine;
    const sel = words.slice(0, 6);
    this.cards = EGL_Utils.shuffle([
      ...sel.map(w => ({ id: w.word, text: w.word, raw: w })),
      ...sel.map(w => ({ id: w.word, text: w.meaning, raw: w }))
    ]);
    this.flipped = [];
    this.matchedCount = 0;

    this.container.innerHTML = `
      <div class="memory-grid">
        ${this.cards.map((item, i) => `
          <div class="memory-card face-down" data-index="${i}" data-id="${item.id}">${item.text}</div>
        `).join('')}
      </div>
    `;

    this.container.querySelectorAll('.memory-card').forEach(c => {
      c.onclick = () => this.flip(c);
    });
  },
  flip(card) {
    if (this.flipped.length >= 2 || !card.classList.contains('face-down')) return;
    card.classList.remove('face-down');
    this.flipped.push(card);

    if (this.flipped.length === 2) {
      const [t1, t2] = this.flipped;
      const ok = (t1.dataset.id === t2.dataset.id);
      const raw = this.cards[t1.dataset.index].raw;
      this.engine.recordAnswer(ok, raw);

      if (ok) {
        this.matchedCount += 2;
        this.flipped = [];
        if (this.matchedCount === this.cards.length) {
          setTimeout(() => this.engine.endSession(), 600);
        }
      } else {
        setTimeout(() => {
          t1.classList.add('face-down');
          t2.classList.add('face-down');
          this.flipped = [];
        }, 700);
      }
    }
  },
  cleanup() {}
});