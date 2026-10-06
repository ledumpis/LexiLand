/**
 * English Game Lab — Cozy UI/UX Orchestrator
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Boot Subsystems
  EGL_Vocab.init();
  EGL_Progress.init();

  // 2. Navigation Routing
  const views = document.querySelectorAll('.view-panel');
  function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');

    const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshUI();
  }

  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => switchView(el.dataset.view));
  });

  // Quick Play on Home
  document.querySelectorAll('[data-quick-game]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gid = btn.dataset.quickGame;
      switchView('gameplay');
      EGL_Engine.startSession(gid, 'normal');
    });
  });

  // Today's Challenge Action
  document.getElementById('btn-challenge-continue')?.addEventListener('click', () => {
    switchView('gameplay');
    EGL_Engine.startSession('multiple-choice', 'normal');
  });

  // 3. Dynamic Games Catalog Rendering
  function renderGamesList() {
    const games = Object.values(EGL_Engine.games);
    const catalog = document.getElementById('games-catalog-container');

    // Update Sidebar Label
    const navLabel = document.getElementById('nav-games-label');
    if (navLabel) navLabel.innerText = `Mini Games (${games.length})`;

    if (catalog) {
      catalog.innerHTML = games.map(g => `
        <div class="cozy-game-card" data-gid="${g.id}">
          <div class="game-icon-bubble">${g.icon}</div>
          <h4>${g.name}</h4>
          <p>${g.description}</p>
          <div class="game-card-footer">
            <span class="badge-tag tag-sage">⭐ Standard</span>
            <button class="btn btn-secondary btn-sm">Chơi ngay</button>
          </div>
        </div>
      `).join('');

      catalog.querySelectorAll('.cozy-game-card').forEach(card => {
        card.onclick = () => {
          const gid = card.dataset.gid;
          const diff = document.querySelector('#seg-difficulty .seg-btn.active')?.dataset.diff || 'normal';
          switchView('gameplay');
          EGL_Engine.startSession(gid, diff);
        };
      });
    }
  }

  // Difficulty Toggle
  document.querySelectorAll('#seg-difficulty .seg-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#seg-difficulty .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  // 4. Deck Management & Inspector
  function renderDecksUI() {
    const list = document.getElementById('vocab-packs-container');
    const homePreview = document.getElementById('home-decks-preview');
    const select = document.getElementById('select-active-deck');
    const sideName = document.getElementById('sidebar-active-deck-name');

    const activeDeck = EGL_Vocab.getActiveDeck();
    if (sideName) sideName.innerText = activeDeck.name;

    if (select) {
      select.innerHTML = EGL_Vocab.decks.map(d => `
        <option value="${d.id}" ${d.id === EGL_Vocab.activeDeckId ? 'selected' : ''}>${d.name} (${d.words.length} từ)</option>
      `).join('');
      select.onchange = (e) => {
        EGL_Vocab.setActiveDeck(e.target.value);
        renderDecksUI();
      };
    }

    const deckCardHTML = (d) => {
      // Calculate Deck Mastery Average
      let totalMastery = 0;
      d.words.forEach(w => totalMastery += EGL_Progress.getMastery(w.word));
      const avgMastery = d.words.length > 0 ? Math.round(totalMastery / d.words.length) : 0;
      const isActive = (d.id === EGL_Vocab.activeDeckId);

      return `
        <div class="cozy-deck-card">
          <div class="deck-header-row">
            <span class="badge-tag tag-blue">${d.level || 'A2'}</span>
            <small style="color:var(--text-muted); font-weight:600;">${d.words.length} từ</small>
          </div>
          <h4>${d.name}</h4>
          <p>${d.description || 'Bộ từ vựng chủ đề giao tiếp thực hành.'}</p>
          <div class="deck-meta-line">
            <span>Tiến độ thành thạo</span>
            <strong>${avgMastery}%</strong>
          </div>
          <div class="deck-progress-track">
            <div class="deck-progress-fill" style="width: ${avgMastery}%"></div>
          </div>
          <div class="deck-actions-row">
            <button class="btn btn-secondary btn-sm btn-inspect" data-id="${d.id}" style="flex:1;">Xem từ</button>
            <button class="btn btn-primary btn-sm btn-select-deck" data-id="${d.id}" style="flex:1;">
              ${isActive ? '✓ Đang chọn' : 'Chọn học'}
            </button>
          </div>
        </div>
      `;
    };

    if (list) {
      list.innerHTML = EGL_Vocab.decks.map(deckCardHTML).join('');
      list.querySelectorAll('.btn-select-deck').forEach(b => {
        b.onclick = () => { EGL_Vocab.setActiveDeck(b.dataset.id); renderDecksUI(); };
      });
      list.querySelectorAll('.btn-inspect').forEach(b => {
        b.onclick = () => inspectDeck(b.dataset.id);
      });
    }

    if (homePreview) {
      homePreview.innerHTML = EGL_Vocab.decks.slice(0, 3).map(deckCardHTML).join('');
      homePreview.querySelectorAll('.btn-select-deck').forEach(b => {
        b.onclick = () => { EGL_Vocab.setActiveDeck(b.dataset.id); renderDecksUI(); };
      });
      homePreview.querySelectorAll('.btn-inspect').forEach(b => {
        b.onclick = () => { switchView('vocabulary'); inspectDeck(b.dataset.id); };
      });
    }
  }

  function inspectDeck(id) {
    const deck = EGL_Vocab.getDeck(id);
    if (!deck) return;
    const inspector = document.getElementById('words-inspector');
    document.getElementById('inspector-title').innerText = deck.name;
    document.getElementById('inspector-subtitle').innerText = `${deck.words.length} từ vựng trong bộ này`;

    const tbody = document.getElementById('inspector-words-tbody');
    tbody.innerHTML = deck.words.map(w => {
      const mastery = EGL_Progress.getMastery(w.word);
      return `
        <tr>
          <td><strong>${w.word}</strong></td>
          <td style="font-family:'JetBrains Mono', monospace; color:var(--text-muted);">${w.phonetic || ''}</td>
          <td><span class="badge-tag tag-lavender">${w.type || 'n'}</span></td>
          <td>${w.meaning}</td>
          <td><strong style="color:var(--sage);">${mastery}%</strong></td>
          <td><button class="btn-icon" onclick="EGL_Utils.speak('${w.word}')">🔊</button></td>
        </tr>
      `;
    }).join('');
    inspector.style.display = 'block';
  }

  document.getElementById('btn-close-inspector')?.addEventListener('click', () => {
    document.getElementById('words-inspector').style.display = 'none';
  });

  // Modal Deck Creation
  const modal = document.getElementById('modal-deck');
  document.getElementById('btn-new-pack')?.addEventListener('click', () => { modal.style.display = 'flex'; });
  document.getElementById('btn-close-modal')?.addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('btn-cancel-modal')?.addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('btn-save-deck')?.addEventListener('click', () => {
    const name = document.getElementById('deck-form-name').value.trim();
    if (!name) return alert('Vui lòng nhập tên bộ từ');
    const level = document.getElementById('deck-form-level').value;
    const desc = document.getElementById('deck-form-desc').value.trim();
    const jsonStr = document.getElementById('deck-form-json').value.trim();
    let words = [];

    if (jsonStr) {
      try { words = JSON.parse(jsonStr); } catch (e) { return alert('Định dạng JSON từ vựng chưa đúng'); }
    }

    EGL_Vocab.addDeck({ id: 'deck_' + Date.now(), name, level, description: desc, words });
    modal.style.display = 'none';
    renderDecksUI();
  });

  // 5. JSON Import / Export
  document.getElementById('input-import-json')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (EGL_Vocab.importJSON(evt.target.result)) {
        alert("Đã thêm bộ từ mới thành công!");
        renderDecksUI();
      } else {
        alert("File JSON không hợp lệ.");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-export-vocab')?.addEventListener('click', () => {
    const deck = EGL_Vocab.getActiveDeck();
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${deck.id}.json`;
    a.click();
  });

  // 6. UI Synchronization & Greeting
  function updateGreeting() {
    const hour = new Date().getHours();
    const topGreeting = document.getElementById('top-greeting');
    const topSub = document.getElementById('top-subgreeting');
    if (!topGreeting) return;

    if (hour < 12) {
      topGreeting.innerText = "Good morning! ☀️";
      topSub.innerText = "Bắt đầu ngày mới với vài từ vựng nhẹ nhàng nhé?";
    } else if (hour < 18) {
      topGreeting.innerText = "Good afternoon! 🌤️";
      topSub.innerText = "Ready to learn a little today?";
    } else {
      topGreeting.innerText = "Good evening! 🌙";
      topSub.innerText = "Thư giãn và củng cố thêm vài từ trước khi kết thúc ngày nhé?";
    }
  }

  function renderAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container) return;

    const list = [
      { id: 'first_100', icon: '🏆', title: 'First 100 Words', desc: 'Đã học trên 100 lượt từ vựng', check: () => EGL_Progress.data.questionsAnswered >= 100 },
      { id: 'streak_7', icon: '🔥', title: '7 Day Streak', desc: 'Duy trì chuỗi học tập 7 ngày liên tục', check: () => EGL_Progress.data.streak >= 7 },
      { id: 'perfect_quiz', icon: '🎯', title: 'Perfect Quiz', desc: 'Đạt độ chính xác trên 90%', check: () => {
        const total = EGL_Progress.data.questionsAnswered;
        return total >= 20 && (EGL_Progress.data.correctAnswers / total) >= 0.9;
      }},
      { id: 'collector', icon: '📚', title: 'Vocabulary Collector', desc: 'Sở hữu từ 2 bộ từ vựng trở lên', check: () => EGL_Vocab.decks.length >= 2 }
    ];

    container.innerHTML = list.map(item => {
      const isUnlocked = item.check();
      return `
        <div class="cozy-achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon">${item.icon}</div>
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
          <span class="badge-tag ${isUnlocked ? 'tag-sage' : 'tag-amber'}" style="margin-top:0.75rem;">
            ${isUnlocked ? '✓ Đã đạt' : 'Đang thực hiện'}
          </span>
        </div>
      `;
    }).join('');
  }

  function refreshUI() {
    updateGreeting();

    // Sidebar HUD
    document.getElementById('hud-streak-text').innerText = `🔥 ${EGL_Progress.data.streak} day streak`;
    document.getElementById('hud-level-text').innerText = `⭐ Level ${EGL_Progress.data.level}`;

    const curLv = EGL_Progress.data.level;
    const curLevelBaseXP = (curLv - 1) * (curLv - 1) * 50;
    const nextLevelXP = curLv * curLv * 50;
    const currentProgressXP = EGL_Progress.data.xp - curLevelBaseXP;
    const levelNeededXP = nextLevelXP - curLevelBaseXP;

    document.getElementById('hud-xp-display').innerText = `${currentProgressXP} / ${levelNeededXP} XP`;
    document.getElementById('hud-xp-bar').style.width = `${EGL_Progress.getXPProgress()}%`;

    // Today's Challenge on Home
    const dCur = EGL_Progress.data.dailyChallenge.current;
    const dTarget = EGL_Progress.data.dailyChallenge.target;
    const dPct = Math.min(100, Math.round((dCur / dTarget) * 100));

    document.getElementById('top-challenge-text').innerText = `Daily: ${dCur}/${dTarget} từ`;
    document.getElementById('home-challenge-count').innerText = `${dCur} / ${dTarget}`;
    document.getElementById('home-challenge-fill').style.width = `${dPct}%`;

    // Weak Words View
    const weakContainer = document.getElementById('weak-words-container');
    if (weakContainer) {
      const activeDeck = EGL_Vocab.getActiveDeck();
      const sorted = activeDeck.words.map(w => ({ ...w, mastery: EGL_Progress.getMastery(w.word) }))
                                     .sort((a, b) => a.mastery - b.mastery);

      weakContainer.innerHTML = sorted.map(w => `
        <div class="cozy-weak-word-card">
          <div class="weak-word-info">
            <div class="weak-word-top">
              <strong>${w.word}</strong>
              <span class="weak-mastery-text">Mastery: ${w.mastery}%</span>
            </div>
            <p class="weak-word-meaning">${w.meaning} • <em>${w.phonetic || ''}</em></p>
          </div>
          <button class="btn-icon" onclick="EGL_Utils.speak('${w.word}')">🔊</button>
        </div>
      `).join('');
    }

    renderAchievements();
  }

  // 7. Results Modal Handlers
  document.getElementById('btn-res-play-again')?.addEventListener('click', () => {
    document.getElementById('results-overlay').style.display = 'none';
    if (EGL_Engine.activeSession) {
      EGL_Engine.startSession(EGL_Engine.activeSession.gameId, EGL_Engine.activeSession.difficulty);
    }
  });

  document.getElementById('btn-res-choose-game')?.addEventListener('click', () => {
    document.getElementById('results-overlay').style.display = 'none';
    switchView('games');
  });

  document.getElementById('btn-res-practice-weak')?.addEventListener('click', () => {
    document.getElementById('results-overlay').style.display = 'none';
    startWeakWordsSession();
  });

  document.getElementById('btn-start-weak-session')?.addEventListener('click', startWeakWordsSession);

  function startWeakWordsSession() {
    const deck = EGL_Vocab.getActiveDeck();
    const weak = deck.words.filter(w => EGL_Progress.getMastery(w.word) < 60);
    const pool = weak.length >= 4 ? weak : deck.words;
    switchView('gameplay');
    EGL_Engine.startSession('multiple-choice', 'normal', pool);
  }

  document.getElementById('btn-exit-game')?.addEventListener('click', () => {
    if (confirm("Rời khỏi ván chơi hiện tại?")) {
      if (EGL_Engine.activeGame?.cleanup) EGL_Engine.activeGame.cleanup();
      switchView('games');
    }
  });

  // Settings Handlers
  document.getElementById('btn-export-full')?.addEventListener('click', () => EGL_Storage.exportFullBackup());
  document.getElementById('input-import-full')?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (evt) => {
      if (EGL_Storage.importFullBackup(evt.target.result)) {
        alert("Đã phục hồi dữ liệu thành công!");
        location.reload();
      }
    };
    r.readAsText(f);
  });

  document.getElementById('btn-reset-data')?.addEventListener('click', () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại toàn bộ điểm số, chuỗi streak và từ vựng về ban đầu không?")) {
      localStorage.clear();
      location.reload();
    }
  });

  // Sound toggle button in header
  document.getElementById('btn-quick-sound')?.addEventListener('click', () => {
    const s = EGL_Storage.get(EGL_Storage.KEYS.SETTINGS) || {};
    s.sfx = (s.sfx === false);
    EGL_Storage.set(EGL_Storage.KEYS.SETTINGS, s);
    document.getElementById('setting-sfx').checked = s.sfx;
    alert(s.sfx ? "Đã bật âm thanh 🔊" : "Đã tắt âm thanh 🔇");
  });

  // Keyboard Shortcuts: 1, 2, 3, 4
  window.addEventListener('keydown', (e) => {
    if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
      const idx = parseInt(e.code.replace('Digit', '')) - 1;
      const btns = document.querySelectorAll('.mc-choice-grid .btn-choice');
      if (btns && btns[idx] && !btns[idx].disabled) btns[idx].click();
    }
  });

  // Initial Render
  renderGamesList();
  renderDecksUI();
  refreshUI();
});