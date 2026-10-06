EGL_Engine.register({
  id: 'spelling',
  name: 'Spelling Bee',
  icon: '🎧',
  description: 'Listen to native audio pronunciation and spell the term correctly.',
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
        <button class="btn btn-bounce btn-accent btn-lg" id="btn-spk" style="font-size:1.6rem; margin-bottom:1.25rem;">
          🔊 Listen Again
        </button>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">Meaning: ${cur.meaning}</p>
        <input type="text" class="type-glow-input" id="s-inp" placeholder="Spell the word..." autocomplete="off">
        <div id="s-fb" style="margin-top:1.25rem; font-weight:800; height:24px;"></div>
      </div>
    `;

    EGL_Utils.speak(cur.word);
    this.container.querySelector('#btn-spk').onclick = () => EGL_Utils.speak(cur.word);

    const inp = this.container.querySelector('#s-inp');
    inp.focus();
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const ok = (inp.value.trim().toLowerCase() === cur.word.toLowerCase());
        const fb = this.container.querySelector('#s-fb');
        inp.disabled = true;

        fb.innerText = ok ? '✓ Awesome spelling!' : `✗ Word: ${cur.word}`;
        fb.style.color = ok ? 'var(--emerald)' : 'var(--coral)';
        this.engine.recordAnswer(ok, cur);
        setTimeout(() => { this.idx++; this.render(); }, 1000);
      }
    };
  },
  cleanup() {}
});