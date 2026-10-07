/**
 * LexiLand — World theme layer (visual only).
 * Adds decoration, nav doodles and the hero illustration.
 * It never removes or renames elements that app.js or the games rely on.
 */
(function () {
  const ICONS = {
    home: '<path d="M3 20L12 4l9 16H3z"/><path d="M9.5 20L12 14l2.5 6"/>',
    games: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    vocabulary: '<path d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4z"/><path d="M20 4h-4a2 2 0 00-2 2v14a2 2 0 012-2h4z"/>',
    review: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5z"/>',
    achievements: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H4v1a3 3 0 003 3M16 6h4v1a3 3 0 01-3 3"/><path d="M12 13v4M8 20h8"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
  };

  // [desktop label, mobile label, original name kept as tooltip]
  const LABELS = {
    home: ['Camp', 'Camp', 'Home'],
    games: ['Game Park', 'Games', 'Mini Games'],
    vocabulary: ['Library', 'Library', 'Word Decks'],
    review: ['Review Garden', 'Garden', 'Review'],
    achievements: ['Trophy Corner', 'Trophies', 'Achievements'],
    settings: ['Settings', 'Settings', 'Settings']
  };

  const DECO = `
    <div class="world-deco" aria-hidden="true">
      <svg class="d1" viewBox="-12 -12 24 24"><polygon points="0,-10 3,-3 10,-3 4.5,2 6.5,9 0,5 -6.5,9 -4.5,2 -10,-3 -3,-3" fill="#FFD66B" stroke="#3B2F2A" stroke-width="1.4" stroke-linejoin="round"/></svg>
      <svg class="d2" viewBox="0 0 90 30"><path d="M3 18Q13 3 23 18T43 18T63 18T87 18" fill="none" stroke="#3F7FB5" stroke-width="4" stroke-linecap="round"/></svg>
      <svg class="d3" viewBox="0 0 60 20"><g fill="#CC5878"><circle cx="8" cy="10" r="4"/><circle cx="30" cy="10" r="4"/><circle cx="52" cy="10" r="4"/></g></svg>
      <svg class="d4" viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" stroke="#3F8E62" stroke-width="4" stroke-linecap="round"/></svg>
    </div>`;

  const HERO_ART = `
    <svg class="hero-art" viewBox="0 0 420 320" role="img" aria-label="A little hill with stacked books, a plant, a flashcard and floating letters">
      <g stroke="#3B2F2A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
        <circle cx="342" cy="58" r="28" fill="#FFD66B"/>
        <path d="M54 96q10-24 34-10 12-18 36-6 24-2 24 18z" fill="#FFFEFA"/>
        <path d="M0 294C60 252 140 246 210 264S350 254 420 272V320H0z" fill="#A8DDB5"/>
        <path d="M40 206q60-52 104-20" fill="none" stroke-width="3" stroke-dasharray="1 9"/>

        <rect x="56" y="250" width="124" height="26" rx="4" fill="#7FB2DA"/>
        <rect x="66" y="226" width="104" height="24" rx="4" fill="#F4A6B8"/>
        <rect x="60" y="204" width="112" height="22" rx="4" fill="#FFD66B"/>

        <g class="hw-wob">
          <path d="M290 276h46l-6 34h-34z" fill="#E4694A"/>
          <path d="M313 276c-26-6-34-34-28-54 24 6 34 30 28 54z" fill="#6DBE86"/>
          <path d="M313 276c6-24 24-40 48-42 2 24-18 40-48 42z" fill="#8ED0A0"/>
          <path d="M313 276c-4-22 0-44 10-60 12 18 8 42-10 60z" fill="#4C9168"/>
        </g>

        <g transform="rotate(-30 232 252)">
          <rect x="200" y="244" width="86" height="16" fill="#FFD66B"/>
          <rect x="274" y="244" width="12" height="16" fill="#F4A6B8"/>
          <path d="M200 244l-22 8 22 8z" fill="#F7DDB0"/>
        </g>

        <g class="hw-float">
          <g transform="rotate(-8 208 118)">
            <rect x="140" y="70" width="136" height="96" rx="12" fill="#FFFEFA"/>
            <rect x="188" y="60" width="42" height="16" fill="#FFE29A" stroke-width="1.5" transform="rotate(-4 209 68)"/>
            <text x="208" y="136" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-size="56" font-weight="700" fill="#3B2F2A" stroke="none">Aa</text>
          </g>
        </g>
        <g class="hw-float b" transform="rotate(10 322 120)">
          <rect x="300" y="96" width="44" height="48" rx="9" fill="#E9E2FA"/>
          <text x="322" y="130" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-size="30" font-weight="700" fill="#3B2F2A" stroke="none">A</text>
        </g>
        <g class="hw-float c" transform="rotate(-10 62 150)">
          <rect x="40" y="126" width="44" height="48" rx="9" fill="#FFDCE6"/>
          <text x="62" y="160" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-size="30" font-weight="700" fill="#3B2F2A" stroke="none">B</text>
        </g>
        <g class="hw-float b" transform="rotate(8 360 200)">
          <rect x="338" y="176" width="44" height="48" rx="9" fill="#D8F0DF"/>
          <text x="360" y="210" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-size="30" font-weight="700" fill="#3B2F2A" stroke="none">C</text>
        </g>

        <g transform="translate(96 62)"><polygon class="hw-spin" points="0,-10 3,-3 10,-3 4.5,2 6.5,9 0,5 -6.5,9 -4.5,2 -10,-3 -3,-3" fill="#FFD66B" stroke-width="2"/></g>
        <g transform="translate(250 38)"><polygon class="hw-spin" points="0,-7 2,-2 7,-2 3,1.5 4.5,6.5 0,3.5 -4.5,6.5 -3,1.5 -7,-2 -2,-2" fill="#F4A6B8" stroke-width="2"/></g>
      </g>
    </svg>`;

  function run() {
    // 1. Decoration layer
    if (!document.querySelector('.world-deco')) document.body.insertAdjacentHTML('afterbegin', DECO);

    // 2. Navigation: doodle icons + world names (ids, data-view and click handlers stay untouched)
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      const key = btn.dataset.view;
      if (!ICONS[key] || btn.querySelector('.nav-ico')) return;
      btn.insertAdjacentHTML('afterbegin',
        `<span class="nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[key]}</svg></span>`);
      const [full, short, original] = LABELS[key];
      const fullEl = btn.querySelector('.nav-full');
      const shortEl = btn.querySelector('.nav-short');
      if (fullEl) fullEl.textContent = full;
      if (shortEl) shortEl.textContent = short;
      btn.title = original;
      btn.setAttribute('aria-label', original);
    });

    // 3. Home hero: illustration + friendly copy (hero buttons keep their data-view)
    const hero = document.querySelector('.hero');
    if (hero) {
      const art = hero.querySelector('.hero-art');
      if (art) art.outerHTML = HERO_ART;
      const title = hero.querySelector('.hero-title');
      if (title) title.innerHTML = 'Learn <span class="scribble">English.</span><br>Play. Explore.';
      const tagline = hero.querySelector('.hero-tagline');
      if (tagline) tagline.textContent = 'Welcome to LexiLand, your little world of words';
      const desc = hero.querySelector('.hero-desc');
      if (desc) desc.textContent = 'Pick a game, flip a few cards, and grow your vocabulary one friendly round at a time.';
    }

    // 4. Game park: stagger entrance of the cards rendered by app.js
    document.querySelectorAll('#games-catalog-container .game-card').forEach((card, i) => {
      card.style.setProperty('--i', i);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();