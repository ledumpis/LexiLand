EGL_Engine.register({
  id: 'word-match',
  name: 'Word Match',
  icon: '🧩',
  description: 'Match pairs of English terms and definitions across two columns.',
  init(container, { words, engine }) {
    this.container = container;
    this.engine = engine;
    this.active = words.slice(0, 5);
    this.matched = 0;
    this.selEn = null;
    this.selVi = null;

    const ens = EGL_Utils.shuffle(this.active.map(w => ({ id: w.word, text: w.word })));
    const vis = EGL_Utils.shuffle(this.active.map(w => ({ id: w.word, text: w.meaning })));

    this.container.innerHTML = `
      <div class="match-arena-grid">
        <div class="match-column" id="col-en">
          ${ens.map(i => `<div class="match-card" data-id="${i.id}" data-type="en">${i.text}</div>`).join('')}
        </div>
        <div class="match-column" id="col-vi">
          ${vis.map(i => `<div class="match-card" data-id="${i.id}" data-type="vi">${i.text}</div>`).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.match-card').forEach(c => {
      c.onclick = () => this.handle(c);
    });
  },
  handle(card) {
    const isEn = (card.dataset.type === 'en');
    const colId = isEn ? '#col-en' : '#col-vi';
    this.container.querySelectorAll(`${colId} .match-card`).forEach(el => el.classList.remove('active-selected'));
    card.classList.add('active-selected');

    if (isEn) this.selEn = card;
    else this.selVi = card;

    if (this.selEn && this.selVi) {
      const ok = (this.selEn.dataset.id === this.selVi.dataset.id);
      const raw = this.active.find(w => w.word === this.selEn.dataset.id);
      this.engine.recordAnswer(ok, raw);

      if (ok) {
        this.selEn.classList.add('done-matched');
        this.selVi.classList.add('done-matched');
        this.matched++;
        if (this.matched === this.active.length) {
          setTimeout(() => this.engine.endSession(), 600);
        }
      } else {
        const e = this.selEn;
        const v = this.selVi;
        setTimeout(() => {
          e.classList.remove('active-selected');
          v.classList.remove('active-selected');
        }, 300);
      }
      this.selEn = null;
      this.selVi = null;
    }
  },
  cleanup() {}
});