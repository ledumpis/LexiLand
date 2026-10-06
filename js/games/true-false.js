EGL_Engine.register({
  id: 'true-false',
  name: 'True or False',
  icon: '✅',
  description: 'Evaluate at speed whether word matches the displayed definition.',
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
    const isTrue = (Math.random() > 0.5);
    const mean = isTrue ? cur.meaning : this.engine.getDistractors(cur, 1)[0].meaning;

    this.container.innerHTML = `
      <div class="mc-box" style="text-align:center;">
        <div class="mc-question-bubble">
          <div class="mc-target-word">${cur.word}</div>
          <div style="font-size:1.4rem; margin:0.75rem 0; color:var(--text-muted); font-weight:800;">=</div>
          <div style="font-size:1.8rem; font-weight:800;">${mean}</div>
        </div>
        <div style="display:flex; justify-content:center; gap:1.5rem;">
          <button class="btn btn-bounce btn-lg" id="btn-tf-t" style="background:var(--emerald); color:#000; min-width:140px; box-shadow:0 4px 0 #059669;">TRUE</button>
          <button class="btn btn-bounce btn-lg" id="btn-tf-f" style="background:var(--coral); color:#fff; min-width:140px; box-shadow:0 4px 0 #be123c;">FALSE</button>
        </div>
      </div>
    `;

    const handleChoice = (val) => {
      this.engine.recordAnswer(val === isTrue, cur);
      this.idx++;
      this.render();
    };

    this.container.querySelector('#btn-tf-t').onclick = () => handleChoice(true);
    this.container.querySelector('#btn-tf-f').onclick = () => handleChoice(false);
  },
  cleanup() {}
});