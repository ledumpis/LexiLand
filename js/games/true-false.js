EGL_Engine.register({
  id: 'true-false',
  name: 'True or False',
  icon: '⚖️',
  description: 'Đánh giá nhanh tính chính xác giữa từ tiếng Anh và nghĩa hiển thị.',
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
    const displayedMeaning = isTrue ? cur.meaning : this.engine.getDistractors(cur, 1)[0].meaning;

    this.container.innerHTML = `
      <div class="tf-container">
        <div class="tf-statement-card">
          <div class="tf-word">${cur.word}</div>
          <div class="tf-connector">means</div>
          <div class="tf-meaning">${displayedMeaning}</div>
        </div>

        <div class="tf-buttons-row">
          <button class="btn btn-tf btn-tf-true" id="btn-tf-true">TRUE</button>
          <button class="btn btn-tf btn-tf-false" id="btn-tf-false">FALSE</button>
        </div>
      </div>
    `;

    const handleChoice = (userChoice) => {
      const isCorrect = (userChoice === isTrue);
      this.engine.recordAnswer(isCorrect, cur);
      this.idx++;
      this.render();
    };

    this.container.querySelector('#btn-tf-true').onclick = () => handleChoice(true);
    this.container.querySelector('#btn-tf-false').onclick = () => handleChoice(false);
  },
  cleanup() {}
});