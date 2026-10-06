/**
 * English Game Lab — Utils, Sound Synthesizer & Speech Engine
 */
const EGL_Utils = {
  audioCtx: null,

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.audioCtx = new AudioContext();
    }
  },

  playTone(freq, type = 'sine', duration = 0.12, gainValue = 0.1) {
    const settings = EGL_Storage ? EGL_Storage.get(EGL_Storage.KEYS.SETTINGS) : null;
    if (settings && settings.sfx === false) return;

    try {
      this.initAudio();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(gainValue, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  },

  sfx: {
    correct() {
      EGL_Utils.playTone(587.33, 'triangle', 0.1, 0.12);
      setTimeout(() => EGL_Utils.playTone(880, 'triangle', 0.18, 0.15), 90);
    },
    wrong() {
      EGL_Utils.playTone(220, 'sawtooth', 0.18, 0.12);
      setTimeout(() => EGL_Utils.playTone(180, 'sawtooth', 0.25, 0.12), 120);
    },
    levelUp() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        setTimeout(() => EGL_Utils.playTone(freq, 'triangle', 0.15, 0.15), i * 80);
      });
    }
  },

  speak(text) {
    const settings = EGL_Storage ? EGL_Storage.get(EGL_Storage.KEYS.SETTINGS) : null;
    if (settings && settings.tts === false) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  },

  shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5,
      r: Math.random() * 6 + 4,
      d: Math.random() * 20 + 10,
      color: ['#f43f5e', '#fbbf24', '#10b981', '#38bdf8', '#a855f7'][Math.floor(Math.random() * 5)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngle: 0,
      tiltAngleInc: Math.random() * 0.07 + 0.05
    }));

    let frames = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.d);
        p.tilt = Math.sin(p.tiltAngle) * 12;
        ctx.beginPath();
        ctx.lineWidth = p.r / 1.5;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });
      frames++;
      if (frames < 120) requestAnimationFrame(render);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    render();
  }
};