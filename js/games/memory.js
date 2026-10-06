EGL_Engine.register({
  id: 'memory',
  name: 'Memory Cards',
  icon: '🧩',
  description: 'Lật tìm các cặp thẻ bài tương ứng giữa từ vựng và định nghĩa.',
  init(container, { words, engine }) {
    this.container = container;
    this.engine = engine;
    const selected = words.slice(0, 6);
    this.cards = EGL_Utils.shuffle([
      ...selected.map(w => ({ id: w.word, text: w.word, raw: w })),
      ...selected.map(w => ({ id: w.word, text: w.meaning, raw: w }))
    ]);
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.totalPairs = selected.length;
    this.isLocked = false;

    this.render();
  },
  render() {
    this.container.innerHTML = `
      <div class="memory-game-wrap">
        <div class="memory-stats-header">
          <span>Pairs: <strong id="mem-pairs">${this.matchedPairs} / ${this.totalPairs}</strong></span>
          <span>Moves: <strong id="mem-moves">${this.moves}</strong></span>
        </div>

        <div class="memory-grid">
          ${this.cards.map((c, i) => `
            <div class="memory-tile-card" data-index="${i}" data-id="${c.id}">
              <div class="memory-tile-inner">
                <div class="memory-tile-face memory-tile-back">?</div>
                <div class="memory-tile-face memory-tile-front">${c.text}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.memory-tile-card').forEach(tile => {
      tile.onclick = () => this.handleFlip(tile);
    });
  },
  handleFlip(tile) {
    if (this.isLocked) return;
    if (tile.classList.contains('is-open') || tile.classList.contains('is-matched')) return;

    tile.classList.add('is-open');
    this.flippedCards.push(tile);

    if (this.flippedCards.length === 2) {
      this.moves++;
      document.getElementById('mem-moves').innerText = this.moves;

      const [c1, c2] = this.flippedCards;
      const isMatch = (c1.dataset.id === c2.dataset.id);
      const raw = this.cards[c1.dataset.index].raw;

      this.engine.recordAnswer(isMatch, raw);

      if (isMatch) {
        c1.classList.add('is-matched');
        c2.classList.add('is-matched');
        this.matchedPairs++;
        document.getElementById('mem-pairs').innerText = `${this.matchedPairs} / ${this.totalPairs}`;
        this.flippedCards = [];

        if (this.matchedPairs === this.totalPairs) {
          setTimeout(() => this.engine.endSession(), 700);
        }
      } else {
        this.isLocked = true;
        setTimeout(() => {
          c1.classList.remove('is-open');
          c2.classList.remove('is-open');
          this.flippedCards = [];
          this.isLocked = false;
        }, 850);
      }
    }
  },
  cleanup() {}
});