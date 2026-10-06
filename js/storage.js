/**
 * English Game Lab — Local Storage Manager
 */
const EGL_Storage = {
  KEYS: {
    DECKS: 'egl_vocab_decks',
    ACTIVE_DECK: 'egl_active_deck_id',
    PROGRESS: 'egl_user_progress',
    SETTINGS: 'egl_user_settings'
  },

  get(key, fallback = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  },

  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  },

  exportFullBackup() {
    const backup = {
      timestamp: new Date().toISOString(),
      decks: this.get(this.KEYS.DECKS),
      activeDeck: this.get(this.KEYS.ACTIVE_DECK),
      progress: this.get(this.KEYS.PROGRESS),
      settings: this.get(this.KEYS.SETTINGS)
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `WordLab_Backup_${Date.now()}.json`;
    a.click();
  },

  importFullBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.decks) this.set(this.KEYS.DECKS, data.decks);
      if (data.progress) this.set(this.KEYS.PROGRESS, data.progress);
      if (data.settings) this.set(this.KEYS.SETTINGS, data.settings);
      if (data.activeDeck) this.set(this.KEYS.ACTIVE_DECK, data.activeDeck);
      return true;
    } catch (e) {
      return false;
    }
  }
};