EGL_Engine.register({
  id: 'multiple-choice',
  name: 'Multiple Choice',
  icon: '🎯',
  description: 'Chọn đáp án đúng từ 4 lựa chọn. Hỗ trợ phím tắt 1, 2, 3, 4.',
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
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 3)]);

    this.container.innerHTML = `
      <div class="mc-box-container">
        <div class="mc-question-card">
          <div class="mc-target-word">${cur.word}</div>
          <div class="mc-phonetic-text">${cur.phonetic || ''}</div>
          <button class="btn-icon" style="margin: 1rem auto 0;" onclick="EGL_Utils.speak('${cur.word}')">🔊</button>
        </div>
        <div class="mc-choice-grid">
          ${opts.map((o, i) => `
            <button class="btn-choice" data-word="${o.word}">
              <span class="choice-num">${i + 1}.</span>
              <span class="choice-text">${o.meaning}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const btns = this.container.querySelectorAll('.btn-choice');
    btns.forEach(btn => {
      btn.onclick = () => {
        btns.forEach(b => b.disabled = true);
        const ok = (btn.dataset.word === cur.word);
        btn.classList.add(ok ? 'choice-correct' : 'choice-wrong');
        if (!ok) {
          btns.forEach(b => { 
            if (b.dataset.word === cur.word) b.classList.add('choice-correct'); 
          });
        }
        this.engine.recordAnswer(ok, cur);
        setTimeout(() => { this.idx++; this.render(); }, 900);
      };
    });
  },
  cleanup() {}
});