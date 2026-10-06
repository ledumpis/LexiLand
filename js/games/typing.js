EGL_Engine.register({
  id: 'typing',
  name: 'Typing Challenge',
  icon: '⌨️',
  description: 'Quan sát ý nghĩa tiếng Việt và gõ chính xác từ tiếng Anh.',
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
        <div class="type-question-card">
          <div class="type-prompt-text">${cur.meaning}</div>
          <div class="type-sub-prompt">
            [${cur.type || 'word'}] ${cur.phonetic ? `• ${cur.phonetic}` : ''}
          </div>
        </div>

        <div class="type-form-wrap">
          <input type="text" class="type-cozy-input" id="type-input-field" placeholder="Type English word here..." autocomplete="off">
          <div id="type-fb"></div>
          <button class="btn btn-primary btn-lg" id="btn-type-submit">Check</button>
        </div>
      </div>
    `;

    const input = this.container.querySelector('#type-input-field');
    const submitBtn = this.container.querySelector('#btn-type-submit');
    const feedback = this.container.querySelector('#type-fb');

    input.focus();

    const checkAnswer = () => {
      const val = input.value.trim().toLowerCase();
      if (!val) return;

      const isCorrect = (val === cur.word.toLowerCase());
      input.disabled = true;
      submitBtn.disabled = true;

      if (isCorrect) {
        feedback.innerText = '✓ Correct! Well done.';
        feedback.style.color = 'var(--pastel-mint-dark)';
      } else {
        feedback.innerText = `✗ Correct word is: "${cur.word}"`;
        feedback.style.color = 'var(--pastel-coral-dark)';
      }

      this.engine.recordAnswer(isCorrect, cur);
      setTimeout(() => {
        this.idx++;
        this.render();
      }, 1000);
    };

    submitBtn.onclick = checkAnswer;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') checkAnswer();
    };
  },
  cleanup() {}
});