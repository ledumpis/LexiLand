/**
 * English Game Lab — Vocabulary Repository
 */
const EGL_Vocab = {
  decks: [],
  activeDeckId: 'daily_life_01',

  init() {
    const stored = EGL_Storage.get(EGL_Storage.KEYS.DECKS);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this.decks = stored;
    } else {
      this.decks = [this.getDefaultDeck()];
      this.save();
    }

    const savedActive = EGL_Storage.get(EGL_Storage.KEYS.ACTIVE_DECK);
    if (savedActive && this.getDeck(savedActive)) {
      this.activeDeckId = savedActive;
    } else {
      this.activeDeckId = this.decks[0].id;
    }
  },

  save() {
    EGL_Storage.set(EGL_Storage.KEYS.DECKS, this.decks);
    EGL_Storage.set(EGL_Storage.KEYS.ACTIVE_DECK, this.activeDeckId);
  },

  getActiveDeck() {
    return this.getDeck(this.activeDeckId) || this.decks[0];
  },

  setActiveDeck(id) {
    if (this.getDeck(id)) {
      this.activeDeckId = id;
      this.save();
    }
  },

  getDeck(id) {
    return this.decks.find(d => d.id === id);
  },

  addDeck(deck) {
    if (!deck.id) deck.id = 'deck_' + Date.now();
    const idx = this.decks.findIndex(d => d.id === deck.id);
    if (idx >= 0) this.decks[idx] = deck;
    else this.decks.push(deck);
    this.save();
  },

  importJSON(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      const packs = Array.isArray(parsed) ? parsed : [parsed];
      packs.forEach(p => {
        if (p.name && Array.isArray(p.words)) this.addDeck(p);
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  getDefaultDeck() {
    return {
      id: "daily_life_01",
      name: "Daily Life Essentials",
      description: "Common vocabulary about everyday life",
      level: "A2",
      words: [
        { word: "hospital", meaning: "bệnh viện", type: "noun", phonetic: "/ˈhɒspɪtl/" },
        { word: "restaurant", meaning: "nhà hàng", type: "noun", phonetic: "/ˈrestrɒnt/" },
        { word: "school", meaning: "trường học", type: "noun", phonetic: "/skuːl/" },
        { word: "bank", meaning: "ngân hàng", type: "noun", phonetic: "/bæŋk/" },
        { word: "supermarket", meaning: "siêu thị", type: "noun", phonetic: "/ˈsuːpəmɑːkɪt/" },
        { word: "library", meaning: "thư viện", type: "noun", phonetic: "/ˈlaɪbrəri/" },
        { word: "pharmacy", meaning: "tiệm thuốc", type: "noun", phonetic: "/ˈfɑːməsi/" },
        { word: "airport", meaning: "sân bay", type: "noun", phonetic: "/ˈeəpɔːt/" },
        { word: "train station", meaning: "nhà ga xe lửa", type: "noun", phonetic: "/treɪn ˈsteɪʃn/" },
        { word: "bakery", meaning: "tiệm bánh", type: "noun", phonetic: "/ˈbeɪkəri/" },
        { word: "doctor", meaning: "bác sĩ", type: "noun", phonetic: "/ˈdɒktə(r)/" },
        { word: "teacher", meaning: "giáo viên", type: "noun", phonetic: "/ˈtiːtʃə(r)/" },
        { word: "engineer", meaning: "kỹ sư", type: "noun", phonetic: "/ˌendʒɪˈnɪə(r)/" },
        { word: "chef", meaning: "đầu bếp", type: "noun", phonetic: "/ʃef/" },
        { word: "police officer", meaning: "cảnh sát", type: "noun", phonetic: "/pəˈliːs ˈɒfɪsə(r)/" },
        { word: "breakfast", meaning: "bữa sáng", type: "noun", phonetic: "/ˈbrekfəst/" },
        { word: "dinner", meaning: "bữa tối", type: "noun", phonetic: "/ˈdɪnə(r)/" },
        { word: "delicious", meaning: "ngon miệng", type: "adjective", phonetic: "/dɪˈlɪʃəs/" },
        { word: "expensive", meaning: "đắt đỏ", type: "adjective", phonetic: "/ɪkˈspensɪv/" },
        { word: "convenient", meaning: "tiện lợi", type: "adjective", phonetic: "/kənˈviːniənt/" },
        { word: "crowded", meaning: "đông đúc", type: "adjective", phonetic: "/ˈkraʊdɪd/" },
        { word: "commute", meaning: "đi làm / đi lại", type: "verb", phonetic: "/kəˈmjuːt/" },
        { word: "exercise", meaning: "tập thể dục", type: "verb", phonetic: "/ˈeksəsaɪz/" },
        { word: "relax", meaning: "thư giãn", type: "verb", phonetic: "/rɪˈlæks/" },
        { word: "schedule", meaning: "lịch trình", type: "noun", phonetic: "/ˈʃedjuːl/" },
        { word: "appointment", meaning: "cuộc hẹn", type: "noun", phonetic: "/əˈpɔɪntmənt/" },
        { word: "neighborhood", meaning: "khu xóm", type: "noun", phonetic: "/ˈneɪbəhʊd/" },
        { word: "weather", meaning: "thời tiết", type: "noun", phonetic: "/ˈweðə(r)/" },
        { word: "luggage", meaning: "hành lý", type: "noun", phonetic: "/ˈlʌɡɪdʒ/" },
        { word: "comfortable", meaning: "thoải mái", type: "adjective", phonetic: "/ˈkʌmftəbl/" }
      ]
    };
  }
};