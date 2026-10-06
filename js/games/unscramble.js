EGL_Engine.register({
  id: 'unscramble',
  name: 'Unscramble',
  icon: '🔤',
  description: 'Sắp xếp các chữ cái xáo trộn thành từ tiếng Anh hoàn chỉnh.',
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
    let placedTiles = [];

    this.container.innerHTML = `
      <div class="unscramble-box">
        <div class="unscramble-meaning">"${cur.meaning}"</div>

        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">Your word:</div>
        <div class="answer-slots-wrap" id="u-slots-area"></div>

        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">Available letters:</div>
        <div class="tiles-pool-wrap" id="u-pool-area">
          ${letters.map((char, i) => `<div class="cozy-letter-tile" data-idx="${i}" data-char="${char}">${char}</div>`).join('')}
        </div>

        <div class="unscramble-btn-row">
          <button class="btn btn-secondary" id="btn-u-reset">Reset</button>
          <button class="btn btn-primary" id="btn-u-check">Check</button>
        </div>
      </div>
    `;

    const slotsArea = this.container.querySelector('#u-slots-area');
    const poolTiles = this.container.querySelectorAll('#u-pool-area .cozy-letter-tile');

    const updateSlots = () => {
      slotsArea.innerHTML = placedTiles.map((item, index) => `
        <div class="cozy-letter-tile tile-placed" data-slot-index="${index}">${item.char}</div>
      `).join('');

      // Allow clicking placed tiles to return them to the pool
      slotsArea.querySelectorAll('.tile-placed').forEach(tile => {
        tile.onclick = () => {
          const slotIdx = parseInt(tile.dataset.slotIndex);
          const returned = placedTiles.splice(slotIdx, 1)[0];
          returned.sourceTile.classList.remove('tile-used');
          updateSlots();
        };
      });
    };

    poolTiles.forEach(tile => {
      tile.onclick = () => {
        tile.classList.add('tile-used');
        placedTiles.push({ char: tile.dataset.char, sourceTile: tile });
        updateSlots();
      };
    });

    this.container.querySelector('#btn-u-reset').onclick = () => {
      placedTiles = [];
      poolTiles.forEach(t => t.classList.remove('tile-used'));
      updateSlots();
    };

    this.container.querySelector('#btn-u-check').onclick = () => {
      const assembled = placedTiles.map(p => p.char).join('');
      const target = cur.word.replace(/\s+/g, '').toUpperCase();
      const isCorrect = (assembled === target);

      this.engine.recordAnswer(isCorrect, cur);
      setTimeout(() => {
        this.idx++;
        this.render();
      }, 750);
    };
  },
  cleanup() {}
});