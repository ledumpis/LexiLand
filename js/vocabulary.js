/**
 * English Game Lab — Vocabulary Repository
 * Courses: Daily Life (single deck) + English for Business Studies (8 unit decks)
 * Business vocabulary source: window.EGL_BUSINESS_COURSE (js/business-course.js)
 */
const EGL_Vocab = {
  decks: [],
  activeDeckId: 'daily_life_01',

  // ---- Course / unit helpers ----
  BUSINESS_COURSE_ID: 'english_for_business_studies',
  BUSINESS_COURSE_NAME: 'English for Business Studies',

  getBusinessCourse() {
    return window.EGL_BUSINESS_COURSE || null;
  },

  getBusinessUnits() {
    const c = this.getBusinessCourse();
    return c && Array.isArray(c.units) ? c.units : [];
  },

  isBusinessUnitId(id) {
    return typeof id === 'string' && id.indexOf('ebs_unit_') === 0;
  },

  getCourseForDeck(deckId) {
    if (this.isBusinessUnitId(deckId)) return this.BUSINESS_COURSE_ID;
    return deckId === 'daily_life_01' ? 'daily_life' : 'custom';
  },

  getBusinessDeckIds() {
    return this.getBusinessUnits().map(u => u.id);
  },

  getRandomBusinessUnitId() {
    const ids = this.getBusinessDeckIds();
    return ids.length ? ids[Math.floor(Math.random() * ids.length)] : null;
  },

  // Build a deck object from a business unit
  unitToDeck(unit) {
    return {
      id: unit.id,
      name: 'Unit ' + unit.unit + ' — ' + unit.name,
      shortName: unit.name,
      unitNumber: unit.unit,
      courseId: this.BUSINESS_COURSE_ID,
      courseName: this.BUSINESS_COURSE_NAME,
      level: 'Business English',
      description: unit.name + ' · ' + unit.words.length + ' words',
      words: unit.words.map(w => ({
        word: w.word,
        meaning: w.meaning,
        type: w.type || 'n',
        phonetic: w.phonetic || '',
        note: w.note || ''
      }))
    };
  },

  ensureBusinessDecks() {
    const units = this.getBusinessUnits();
    if (!units.length) return;
    let changed = false;
    units.forEach(unit => {
      const deck = this.unitToDeck(unit);
      const idx = this.decks.findIndex(d => d.id === deck.id);
      if (idx >= 0) {
        // Keep user deck shell but always refresh vocabulary exactly from JSON
        // Preserve mastery separately (progress.js keyed by word), so overwriting words is safe
        const existing = this.decks[idx];
        const sameWords = existing.words.length === deck.words.length &&
          existing.words.every((w, i) => w.word === deck.words[i].word);
        if (!sameWords || existing.name !== deck.name) {
          this.decks[idx] = Object.assign({}, existing, {
            name: deck.name,
            shortName: deck.shortName,
            unitNumber: deck.unitNumber,
            courseId: deck.courseId,
            courseName: deck.courseName,
            level: deck.level,
            description: deck.description,
            words: deck.words
          });
          changed = true;
        }
      } else {
        this.decks.push(deck);
        changed = true;
      }
    });
    if (changed) this.save();
  },

  init() {
    const stored = EGL_Storage.get(EGL_Storage.KEYS.DECKS);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this.decks = stored;
    } else {
      this.decks = [this.getDefaultDeck()];
      this.save();
    }

    // Merge business units (idempotent, keeps Daily Life untouched)
    this.ensureBusinessDecks();

    // Migrate old saves that have a course-level business deck (255 words) — remove it
    const legacyCourseDeck = this.decks.find(d => d.id === this.BUSINESS_COURSE_ID);
    if (legacyCourseDeck) {
      this.decks = this.decks.filter(d => d.id !== this.BUSINESS_COURSE_ID);
      this.save();
    }

    const savedActive = EGL_Storage.get(EGL_Storage.KEYS.ACTIVE_DECK);
    if (savedActive && this.getDeck(savedActive)) {
      this.activeDeckId = savedActive;
    } else {
      // Prefer Daily Life if present, else first deck
      const daily = this.getDeck('daily_life_01');
      this.activeDeckId = daily ? daily.id : this.decks[0].id;
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
      courseId: "daily_life",
      courseName: "Daily Life",
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
