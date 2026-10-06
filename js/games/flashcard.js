EGL_Engine.register({
  id: 'flashcard',
  name: 'Flashcard Challenge',
  icon: '🃏',
  description: 'Thẻ từ vựng Quizlet lật 3D hai mặt kèm phát âm và ví dụ.',
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
      <div class="fc-quizlet-stage">
        <div class="fc-card-counter">
          Card ${this.idx + 1} of ${this.words.length}
        </div>

        <div class="flashcard-3d-wrap" id="fc-card-element">
          <div class="flashcard-inner">
            <!-- Front Face -->
            <div class="card-face card-front">
              <span class="fc-pos-tag">${cur.type || 'vocabulary'}</span>
              <h2>${cur.word}</h2>
              <div class="fc-phonetic">${cur.phonetic || ''}</div>
              <button class="btn-icon" id="btn-fc-audio" style="margin-top: 1rem;">🔊</button>
              <div class="fc-hint-flip">Click or tap anywhere to flip</div>
            </div>

            <!-- Back Face -->
            <div class="card-face card-back">
              <span class="fc-pos-tag">Meaning</span>
              <h2>${cur.meaning}</h2>
              ${cur.example ? `
                <div class="fc-example-box">
                  "${cur.example}"
                  ${cur.example_vi ? `<div style="font-size:0.8rem; margin-top:4px;">${cur.example_vi}</div>` : ''}
                </div>
              ` : ''}
              <div class="fc-hint-flip">Click to flip back</div>
            </div>
          </div>
        </div>

        <div class="fc-actions-row">
          <button class="btn btn-learning" id="btn-fc-learning">Still Learning</button>
          <button class="btn btn-mastered" id="btn-fc-mastered">I Got This</button>
        </div>
      </div>
    `;

    const card = this.container.querySelector('#fc-card-element');
    card.onclick = (e) => {
      // Don't flip when clicking the audio button
      if (e.target.closest('#btn-fc-audio')) return;
      card.classList.toggle('flipped');
    };

    const audioBtn = this.container.querySelector('#btn-fc-audio');
    if (audioBtn) {
      audioBtn.onclick = (e) => {
        e.stopPropagation();
        EGL_Utils.speak(cur.word);
      };
    }

    this.container.querySelector('#btn-fc-learning').onclick = () => {
      this.engine.recordAnswer(false, cur);
      this.idx++;
      this.render();
    };

    this.container.querySelector('#btn-fc-mastered').onclick = () => {
      this.engine.recordAnswer(true, cur);
      this.idx++;
      this.render();
    };
  },
  cleanup() {}
});