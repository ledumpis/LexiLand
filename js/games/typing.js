EGL_Engine.register({
  id: 'typing',
  name: 'Typing Challenge',
  icon: '⌨️',
  description: 'Read the definition and type the exact English word. Press Enter.',
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
      <div class="type-arena">
        <div class="type-prompt-text">${cur.meaning}</div>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">[${cur.type || 'term'}]</p>
        <input type="text" class="type-glow-input" id="t-inp" placeholder="Type here..." autocomplete="off">
        <div id="t-fb" style="margin-top:1.25rem; font-weight:800; height:24px;"></div>
      </div>
    `;

    const inp = this.container.querySelector('#t-inp');
    inp.focus();
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const ok = (inp.value.trim().toLowerCase() === cur.word.toLowerCase());
        const fb = this.container.querySelector('#t-fb');
        inp.disabled = true;

        fb.innerText = ok ? '✓ Spot on!' : `✗ Correct: ${cur.word}`;
        fb.style.color = ok ? 'var(--emerald)' : 'var(--coral)';
        this.engine.recordAnswer(ok, cur);
        setTimeout(() => { this.idx++; this.render(); }, 1000);
      }
    };
  },
  cleanup() {}
});