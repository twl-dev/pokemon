(() => {
  'use strict';

  const DATA = Array.isArray(window.POKEDEX_DATA) ? window.POKEDEX_DATA : [];
  const FAV_KEY = 'pokedex.favourites.v1';
  const LANG_KEY = 'pokedex.lang.v1';

  const TYPES = {
    normal: { en: 'Normal', zh: '一般', color: '#9fa07a' },
    fire: { en: 'Fire', zh: '火', color: '#ee8130' },
    water: { en: 'Water', zh: '水', color: '#5b8ce8' },
    electric: { en: 'Electric', zh: '電', color: '#e3b71c' },
    grass: { en: 'Grass', zh: '草', color: '#6cbf47' },
    ice: { en: 'Ice', zh: '冰', color: '#5fbdc0' },
    fighting: { en: 'Fighting', zh: '格鬥', color: '#c0392b' },
    poison: { en: 'Poison', zh: '毒', color: '#a33ea1' },
    ground: { en: 'Ground', zh: '地面', color: '#c9a227' },
    flying: { en: 'Flying', zh: '飛行', color: '#8f7ee0' },
    psychic: { en: 'Psychic', zh: '超能力', color: '#f0537f' },
    bug: { en: 'Bug', zh: '蟲', color: '#96a71a' },
    rock: { en: 'Rock', zh: '岩石', color: '#a8902f' },
    ghost: { en: 'Ghost', zh: '幽靈', color: '#6b5390' },
    dragon: { en: 'Dragon', zh: '龍', color: '#6a3ef0' },
    dark: { en: 'Dark', zh: '惡', color: '#5f5045' },
    steel: { en: 'Steel', zh: '鋼', color: '#8e8ea8' },
    fairy: { en: 'Fairy', zh: '妖精', color: '#d178a8' },
  };

  const $ = (id) => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function typeInk(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 168 ? '#3a2f10' : '#ffffff';
  }

  // Safari 開 file:// 時 localStorage 可能被禁用，失敗就退回記憶體
  const store = {
    get(key, fallback) {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* 忽略：無痕模式或 file:// 限制 */
      }
    },
  };

  const state = {
    lang: store.get(LANG_KEY, 'both'),
    view: 'all',
    type: null,
    query: '',
    favs: new Set(JSON.parse(store.get(FAV_KEY, '[]'))),
    currentId: null,
    list: [],
  };

  /* ---------------- 篩選與渲染 ---------------- */

  function matches(p) {
    if (state.view === 'fav' && !state.favs.has(p.id)) return false;
    if (state.type && !p.types.includes(state.type)) return false;

    const q = state.query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.en.toLowerCase().includes(q) ||
      p.zhHK.includes(q) ||
      p.zhOfficial.includes(q) ||
      String(p.id) === q ||
      String(p.id).padStart(3, '0') === q
    );
  }

  function visibleList() {
    return DATA.filter(matches);
  }

  function typeBadge(type) {
    const info = TYPES[type] || { en: type, zh: type, color: '#9aa3c0' };
    const badge = el('span', 'badge');
    badge.style.setProperty('--type', info.color);
    badge.style.setProperty('--type-ink', typeInk(info.color));
    badge.append(el('span', 'lang-zh', info.zh), el('span', 'lang-en', info.en));
    return badge;
  }

  function spriteImage(p, className) {
    const wrap = el('div', className === 'card__img' ? 'card__img-wrap' : 'detail__art-wrap');
    const img = new Image();
    img.className = className;
    img.src = p.sprite;
    img.alt = `${p.en} ${p.zhHK}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      img.remove();
      const fallback = el('span', 'img-fallback', `#${String(p.id).padStart(3, '0')}`);
      fallback.style.setProperty('--type', TYPES[p.types[0]]?.color || '#dfe6ff');
      fallback.style.setProperty('--type-ink', typeInk(TYPES[p.types[0]]?.color || '#dfe6ff'));
      wrap.append(fallback);
    });
    wrap.append(img);
    return wrap;
  }

  function renderGrid() {
    const grid = $('grid');
    const list = visibleList();
    state.list = list;
    grid.textContent = '';

    const frag = document.createDocumentFragment();
    for (const p of list) {
      const card = el('div', 'card');
      card.style.setProperty('--type', TYPES[p.types[0]]?.color || '#dfe6ff');

      const main = el('button', 'card__main');
      main.type = 'button';
      main.dataset.id = p.id;
      main.setAttribute('aria-label', `${p.en} ${p.zhHK}，查看詳情`);

      main.append(el('span', 'card__num', `#${String(p.id).padStart(3, '0')}`));
      main.append(spriteImage(p, 'card__img'));
      main.append(el('span', 'card__en lang-en', p.en));
      main.append(el('span', 'card__zh lang-zh', p.zhHK));

      const badges = el('span', 'card__badges');
      for (const t of p.types) badges.append(typeBadge(t));
      main.append(badges);

      main.addEventListener('click', () => openDetail(p.id));

      const fav = state.favs.has(p.id);
      const heart = el('button', `card__heart${fav ? ' is-fav' : ''}`, fav ? '♥' : '♡');
      heart.type = 'button';
      heart.setAttribute('aria-label', fav ? `取消收藏 ${p.zhHK}` : `收藏 ${p.zhHK}`);
      heart.addEventListener('click', () => toggleFav(p.id));

      card.append(main, heart);
      frag.append(card);
    }
    grid.append(frag);

    $('empty').hidden = list.length > 0;
    updateCount(list.length);
  }

  function updateCount(shown) {
    const total = DATA.length;
    const count = $('count');
    count.textContent = '';
    count.append(
      el('span', 'lang-zh', `共 ${total} 隻 · 顯示 ${shown} 隻`),
      el('span', 'lang-en', `${shown} of ${total} Pokémon`)
    );
  }

  /* ---------------- 語言 ---------------- */

  function applyLang(lang) {
    state.lang = lang;
    document.body.dataset.lang = lang;
    store.set(LANG_KEY, lang);
    document.querySelectorAll('.lang-switch button').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.lang === lang);
    });
  }

  /* ---------------- 屬性篩選 ---------------- */

  function renderTypeFilters() {
    const box = $('typeFilters');
    const all = el('button', 'type-chip is-active');
    all.type = 'button';
    all.dataset.type = '';
    all.append(el('span', 'lang-zh', '全部'), el('span', 'lang-en', 'All'));
    all.addEventListener('click', () => selectType(null));
    box.append(all);

    const present = new Set(DATA.flatMap((p) => p.types));
    for (const [key, info] of Object.entries(TYPES)) {
      if (!present.has(key)) continue; // 第一世代沒有惡系，不顯示空篩選
      const chip = el('button', 'type-chip');
      chip.type = 'button';
      chip.dataset.type = key;
      chip.style.setProperty('--type', info.color);
      chip.style.setProperty('--type-ink', typeInk(info.color));
      const dot = el('span', 'dot');
      chip.append(dot, el('span', 'lang-zh', info.zh), el('span', 'lang-en', info.en));
      chip.addEventListener('click', () => selectType(key));
      box.append(chip);
    }
  }

  function selectType(type) {
    state.type = type;
    document.querySelectorAll('.type-chip').forEach((chip) => {
      chip.classList.toggle('is-active', (chip.dataset.type || null) === type);
    });
    renderGrid();
  }

  /* ---------------- 收藏 ---------------- */

  function saveFavs() {
    store.set(FAV_KEY, JSON.stringify([...state.favs]));
    $('favCount').textContent = state.favs.size;
  }

  function toggleFav(id) {
    if (state.favs.has(id)) state.favs.delete(id);
    else state.favs.add(id);
    saveFavs();
    renderGrid();
    if (state.currentId === id) updateFavButton(id);
  }

  function updateFavButton(id) {
    const fav = state.favs.has(id);
    const btn = $('detailFav');
    btn.classList.toggle('is-fav', fav);
    btn.firstChild.textContent = fav ? '♥ ' : '♡ ';
  }

  /* ---------------- 詳情 ---------------- */

  const dialog = $('detail');

  function openDetail(id) {
    state.list = visibleList();
    state.currentId = id;
    renderDetail(id);
    if (!dialog.open) dialog.showModal();
  }

  function moveDetail(step) {
    const list = visibleList();
    if (!list.length) return;
    const index = list.findIndex((p) => p.id === state.currentId);
    const next = list[(index + step + list.length) % list.length];
    state.currentId = next.id;
    renderDetail(next.id);
  }

  function renderDetail(id) {
    const p = DATA.find((item) => item.id === id);
    if (!p) return;

    const color = TYPES[p.types[0]]?.color || '#dfe6ff';
    $('detailHero').style.setProperty('--type', color);
    $('detailNum').textContent = `#${String(p.id).padStart(3, '0')}`;

    const art = $('detailArt');
    art.src = p.art;
    art.alt = `${p.en} ${p.zhHK}`;

    $('detailEn').textContent = p.en;
    $('detailZh').textContent = p.zhHK;

    const official = $('detailOfficial');
    if (p.zhOfficial && p.zhOfficial !== p.zhHK) {
      official.textContent = `官方統一譯名 Official name：${p.zhOfficial}`;
      official.hidden = false;
    } else {
      official.hidden = true;
    }

    const meta = $('detailMeta');
    meta.textContent = '';
    for (const t of p.types) meta.append(typeBadge(t));
    const height = el('span', 'meta-box');
    height.append(
      el('span', 'lang-zh', '身高'),
      el('span', 'lang-en', 'Height'),
      el('b', '', `${(p.heightDm / 10).toFixed(1)} m`)
    );
    const weight = el('span', 'meta-box');
    weight.append(
      el('span', 'lang-zh', '體重'),
      el('span', 'lang-en', 'Weight'),
      el('b', '', `${(p.weightHg / 10).toFixed(1)} kg`)
    );
    meta.append(height, weight);

    $('descEn').textContent = p.descEn;
    $('descZh').textContent = p.descZh;
    updateFavButton(p.id);
  }

  /* ---------------- 語音與叫聲 ---------------- */

  let voices = [];
  function refreshVoices() {
    voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  }
  if (window.speechSynthesis) {
    refreshVoices();
    speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    speechSynthesis.onvoiceschanged = refreshVoices;
  }

  function pickVoice(lang) {
    const lower = lang.toLowerCase();
    const exact = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === lower);
    if (exact.length) return exact[0];
    const prefix = lower.slice(0, 2);
    const loose = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
    if (lower.startsWith('zh')) {
      return (
        loose.find((v) => /HK|yue|cantonese/i.test(v.lang + v.name)) ||
        loose.find((v) => /TW|Hant/i.test(v.lang + v.name)) ||
        loose[0] ||
        null
      );
    }
    return loose[0] || null;
  }

  function speak(text, lang) {
    if (!window.speechSynthesis || !text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    speechSynthesis.speak(utterance);
  }

  function playCry(p) {
    if (!p?.cry) return;
    const audio = new Audio(p.cry);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  }

  /* ---------------- 猜謎 ---------------- */

  const quiz = { score: 0, streak: 0, current: null, answered: false };

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function renderQuizShell() {
    const box = $('quiz');
    box.textContent = '';
    const card = el('div', 'quiz__card');

    const score = el('div', 'quiz__score');
    score.innerHTML =
      '<span><span class="lang-zh">得分</span><span class="lang-en">Score</span> <b id="quizScore">0</b></span>' +
      '<span><span class="lang-zh">連擊</span><span class="lang-en">Streak</span> <b id="quizStreak">0</b></span>';

    const silhouette = el('div', 'quiz__silhouette');
    silhouette.id = 'quizSilhouette';
    const img = new Image();
    img.id = 'quizImg';
    img.alt = '寶可夢剪影';
    silhouette.append(img);

    const hint = el('p', 'quiz__hint');
    hint.id = 'quizHint';
    hint.innerHTML = '<span class="lang-zh">看看剪影，猜猜是哪一隻？</span><span class="lang-en">Look at the silhouette. Who is it?</span>';

    const options = el('div', 'quiz__options');
    options.id = 'quizOptions';

    const next = el('button', 'quiz__next');
    next.type = 'button';
    next.id = 'quizNext';
    next.hidden = true;
    next.innerHTML = '<span class="lang-zh">下一題 →</span><span class="lang-en">Next →</span>';
    next.addEventListener('click', newQuestion);

    card.append(score, silhouette, hint, options, next);
    box.append(card);
  }

  function newQuestion() {
    const pool = DATA;
    if (!pool.length) return;
    let pick = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (pick.id === quiz.current?.id && guard++ < 20) {
      pick = pool[Math.floor(Math.random() * pool.length)];
    }
    quiz.current = pick;
    quiz.answered = false;

    const silhouette = $('quizSilhouette');
    silhouette.classList.remove('is-revealed');
    const img = $('quizImg');
    img.src = pick.art;
    img.alt = '寶可夢剪影';

    const hint = $('quizHint');
    hint.innerHTML = '<span class="lang-zh">看看剪影，猜猜是哪一隻？</span><span class="lang-en">Look at the silhouette. Who is it?</span>';

    const wrong = shuffle(pool.filter((p) => p.id !== pick.id)).slice(0, 3);
    const options = shuffle([pick, ...wrong]);
    const box = $('quizOptions');
    box.textContent = '';

    for (const option of options) {
      const btn = el('button', 'quiz__option');
      btn.type = 'button';
      btn.dataset.id = option.id;
      btn.append(el('span', 'opt-zh lang-zh', option.zhHK), el('span', 'opt-en lang-en', option.en));
      btn.addEventListener('click', () => answer(option, btn));
      box.append(btn);
    }

    $('quizNext').hidden = true;
    $('quizScore').textContent = quiz.score;
    $('quizStreak').textContent = quiz.streak;
  }

  function answer(option, btn) {
    if (quiz.answered || !quiz.current) return;
    quiz.answered = true;
    const correct = option.id === quiz.current.id;

    document.querySelectorAll('.quiz__option').forEach((node) => {
      node.disabled = true;
    });

    if (correct) {
      quiz.score += 1;
      quiz.streak += 1;
      btn.classList.add('is-correct');
      $('quizSilhouette').classList.add('is-revealed');
      $('quizHint').innerHTML = '<span class="lang-zh">答對了！好厲害！🎉</span><span class="lang-en">Correct! Well done! 🎉</span>';
      playCry(quiz.current);
    } else {
      quiz.streak = 0;
      btn.classList.add('is-wrong');
      document.querySelector(`.quiz__option[data-id="${quiz.current.id}"]`)?.classList.add('is-correct');
      $('quizSilhouette').classList.add('is-revealed');
      $('quizHint').innerHTML = `<span class="lang-zh">是「${quiz.current.zhHK}」才對，再試一次！</span><span class="lang-en">It was ${quiz.current.en}. Try again!</span>`;
    }

    $('quizScore').textContent = quiz.score;
    $('quizStreak').textContent = quiz.streak;
    $('quizNext').hidden = false;
  }

  /* ---------------- 檢視切換 ---------------- */

  function setView(view) {
    state.view = view;
    document.querySelectorAll('.view-btn').forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    const isQuiz = view === 'quiz';
    $('grid').hidden = isQuiz;
    $('quiz').hidden = !isQuiz;
    $('typeFilters').hidden = isQuiz;
    $('count').hidden = isQuiz;
    $('empty').hidden = true;

    if (isQuiz) {
      renderQuizShell();
      newQuestion();
    } else {
      renderGrid();
    }
  }

  /* ---------------- 事件綁定 ---------------- */

  function bindEvents() {
    $('search').addEventListener('input', (event) => {
      state.query = event.target.value;
      if (state.view === 'quiz') setView('all');
      renderGrid();
    });

    document.querySelectorAll('.lang-switch button').forEach((btn) => {
      btn.addEventListener('click', () => applyLang(btn.dataset.lang));
    });

    document.querySelectorAll('.view-btn').forEach((btn) => {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    $('detailClose').addEventListener('click', () => dialog.close());

    const about = $('about');
    $('aboutBtn').addEventListener('click', () => about.showModal());
    $('aboutClose').addEventListener('click', () => about.close());
    about.addEventListener('click', (event) => {
      if (event.target === about) about.close();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    $('prevBtn').addEventListener('click', () => moveDetail(-1));
    $('nextBtn').addEventListener('click', () => moveDetail(1));

    $('detailFav').addEventListener('click', () => {
      if (state.currentId != null) toggleFav(state.currentId);
    });

    $('playCry').addEventListener('click', () => {
      const p = DATA.find((item) => item.id === state.currentId);
      playCry(p);
    });

    $('speakEn').addEventListener('click', () => {
      const p = DATA.find((item) => item.id === state.currentId);
      if (p) speak(`${p.en}. ${p.descEn}`, 'en-US');
    });

    $('speakZh').addEventListener('click', () => {
      const p = DATA.find((item) => item.id === state.currentId);
      if (p) speak(`${p.zhHK}。${p.descZh}`, 'zh-HK');
    });

    document.addEventListener('keydown', (event) => {
      if (!dialog.open) return;
      if (event.key === 'ArrowLeft') moveDetail(-1);
      if (event.key === 'ArrowRight') moveDetail(1);
    });

    // 圖片載入失敗時換成佔位圖（詳情大圖）
    $('detailArt').addEventListener('error', (event) => {
      event.target.style.visibility = 'hidden';
    });
  }

  /* ---------------- 啟動 ---------------- */

  function init() {
    applyLang(state.lang);
    renderTypeFilters();
    saveFavs();
    bindEvents();

    if (!DATA.length) {
      $('count').textContent = '資料尚未產生，請先執行 node scripts/build-data.js';
      return;
    }

    const params = new URLSearchParams(location.search);
    if (params.get('view') === 'quiz') {
      setView('quiz');
      return;
    }

    renderGrid();

    const id = Number(params.get('id'));
    if (id && DATA.some((p) => p.id === id)) openDetail(id);
  }

  init();
})();
