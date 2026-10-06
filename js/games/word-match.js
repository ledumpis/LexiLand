EGL_Engine.register({
  id: 'word-match',
  name: 'Word Match',
  icon: '🔗',
  description: 'Ghép cặp từ tiếng Anh và nghĩa tiếng Việt bằng màu pastel đồng bộ.',
  init(container, { words, engine }) {
    this.container = container;
    this.engine = engine;
    this.activeWords = words.slice(0, 5);
    this.matchedCount = 0;
    this.selectedEn = null;
    this.selectedVi = null;

    const enList = EGL_Utils.shuffle(this.activeWords.map(w => ({ id: w.word, text: w.word })));
    const viList = EGL_Utils.shuffle(this.activeWords.map(w => ({ id: w.word, text: w.meaning })));

    this.container.innerHTML = `
      <div class="match-arena-grid">
        <div class="match-column" id="col-en">
          ${enList.map(item => `<div class="match-card" data-id="${item.id}" data-type="en">${item.text}</div>`).join('')}
        </div>
        <div class="match-column" id="col-vi">
          ${viList.map(item => `<div class="match-card" data-id="${item.id}" data-type="vi">${item.text}</div>`).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.match-card').forEach(card => {
      card.onclick = () => this.handleSelect(card);
    });
  },
  handleSelect(card) {
    if (card.classList.contains('is-matched')) return;

    const isEn = (card.dataset.type === 'en');
    const colId = isEn ? '#col-en' : '#col-vi';

    // Deselect other cards in same column
    this.container.querySelectorAll(`${colId} .match-card:not(.is-matched)`).forEach(el => {
      el.classList.remove('card-selected');
    });

    card.classList.add('card-selected');
    if (isEn) this.selectedEn = card;
    else this.selectedVi = card;

    if (this.selectedEn && this.selectedVi) {
      const isMatch = (this.selectedEn.dataset.id === this.selectedVi.dataset.id);
      const rawWord = this.activeWords.find(w => w.word === this.selectedEn.dataset.id);
      const enEl = this.selectedEn;
      const viEl = this.selectedVi;

      this.engine.recordAnswer(isMatch, rawWord);

      if (isMatch) {
        // Assign a distinct matching pastel color class so pairs stay visually connected
        const colorClass = `pair-color-${this.matchedCount % 5}`;
        enEl.classList.remove('card-selected');
        viEl.classList.remove('card-selected');
        enEl.classList.add('is-matched', colorClass);
        viEl.classList.add('is-matched', colorClass);

        this.matchedCount++;
        if (this.matchedCount === this.activeWords.length) {
          setTimeout(() => this.engine.endSession(), 700);
        }
      } else {
        enEl.classList.add('card-wrong');
        viEl.classList.add('card-wrong');

        setTimeout(() => {
          enEl.classList.remove('card-selected', 'card-wrong');
          viEl.classList.remove('card-selected', 'card-wrong');
        }, 500);
      }

      this.selectedEn = null;
      this.selectedVi = null;
    }
  },
  cleanup() {}
});