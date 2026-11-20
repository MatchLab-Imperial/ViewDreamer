(() => {
  'use strict';

  const METHODS = ['Ground truth', 'ViewDreamer', 'Wan2.2-5B (FT)', 'Cosmos3-Nano'];
  const AC_EPISODES = [
    { id: 'acwm_stack', label: 'Stack two blocks', task: 'stack_blocks_two' },
    { id: 'acwm_bottle', label: 'Pick up a bottle', task: 'pick_diverse_bottles' },
    { id: 'acwm_shake', label: 'Shake a bottle', task: 'shake_bottle' },
    { id: 'acwm_hammer', label: 'Hammer the block', task: 'beat_block_hammer' },
  ];
  const EPISODES = [
    { id: "thermos", label: "Pour from the thermos", views: ["Head", "Chest", "Left wrist"], robot: "AlphaBot 2",
      instruction: "Grasp the thermos with one hand and pour water into the cup lid." },
    { id: "red_block", label: "Move the red block", views: ["Head", "Chest", "Right wrist"], robot: "AgileX Cobot Magic",
      instruction: "Put the red build block in the center of the table." },
    { id: "tape_box", label: "Tape into the box", views: ["Head", "Chest", "Left wrist"], robot: "AlphaBot 2",
      instruction: "Pick up the white tape and place it into the black box, pick up the silver tape and place it into the brown box." },
    { id: "paper_ball", label: "Hand over a paper ball", views: ["Head", "Chest", "Left wrist"], robot: "AlphaBot 2",
      instruction: "Pass the paper ball to the right gripper." },
    { id: "dolls_box", label: "Dolls into the box", views: ["Head", "Chest", "Left wrist", "Right wrist"], robot: "AlphaBot 2",
      instruction: "Pick up the two dolls from the table and place them into the box." },
  ];

  // RoboView-Bench (paper Tab. 1). LPIPS, FID and FVD: lower is better.
  const BENCH = {
    3: [
      ['Wan2.2-5B', 0.510, 0.537, 23.92, 272.02, 56.166],
      ['Wan2.1-14B', 0.484, 0.570, 24.99, 261.73, 58.314],
      ['Wan2.2-A14B', 0.495, 0.559, 20.84, 247.55, 55.341],
      ['Genie-Envisioner', 0.686, 0.420, 33.20, 184.73, 71.750],
      ['Cosmos3-Edge', 0.590, 0.530, 40.85, 392.89, 53.760],
      ['Cosmos3-Nano', 0.635, 0.429, 19.25, 89.57, 71.632],
      ['Wan2.2-5B (FT)', 0.662, 0.363, 9.92, 32.93, 69.316],
      ['ViewDreamer', 0.687, 0.330, 8.47, 25.41, 75.693],
    ],
    4: [
      ['Wan2.2-5B', 0.509, 0.540, 22.31, 259.90, 56.284],
      ['Wan2.1-14B', 0.483, 0.572, 23.75, 254.20, 58.715],
      ['Wan2.2-A14B', 0.491, 0.566, 20.06, 253.16, 53.640],
      ['Genie-Envisioner', 0.657, 0.452, 61.28, 429.01, 71.100],
      ['Cosmos3-Edge', 0.646, 0.460, 28.42, 309.27, 65.128],
      ['Cosmos3-Nano', 0.675, 0.379, 13.71, 88.16, 77.714],
      ['Wan2.2-5B (FT)', 0.658, 0.371, 8.58, 29.50, 69.901],
      ['ViewDreamer', 0.688, 0.332, 7.13, 21.26, 75.150],
    ],
  };
  const HIGHER = [true, false, false, false, true];
  const DIGITS = [3, 3, 2, 2, 3];

  // Policy success (paper Tabs. 3-5 and Fig. 1).
  const BARS = [
    { title: 'LIBERO-Plus', sub: 'perturbed scenes, success %', vals: ['51.5', '70.0', '74.9'] },
    { title: 'RoboTwin 2.0', sub: 'randomized scenes, success %', vals: ['1.9', '6.2', '14.8'] },
    { title: 'RoboDojo', sub: 'bimanual tasks, success %', vals: ['2.03', '7.18', '9.83'] },
    { title: 'Real Franka', sub: 'four tasks, average success %', vals: ['25.0', '30.0', '67.5'] },
  ];
  const POLICIES = ['FastWAM', 'FastWAM-Joint', 'Ours'];

  const ROBOT = [
    { id: 'robot_cup_into_box', label: 'Cup into box', text: 'Put the blue cup in the box.' },
    { id: 'robot_cubes_into_cups', label: 'Cubes into cups', text: 'Put the red cube in the red cup and the blue cube in the blue cup.' },
    { id: 'robot_stack_cups', label: 'Stack cups', text: 'Stack the orange cup in the red cup, then the red cup in the blue cup.' },
  ];

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // active section in the top bar
  const links = $$('.toplinks a');
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => secObs.observe(s));
  const firstSec = $('#method');
  window.addEventListener('scroll', () => {
    if (window.scrollY < firstSec.offsetTop - window.innerHeight * 0.5) links.forEach((a) => a.classList.remove('active'));
  }, { passive: true });

  // play videos only while visible (and never on their own when the reader prefers reduced motion)
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm) document.querySelectorAll('video[autoplay]').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
  const vidObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { if (!v.dataset.userPaused && !calm) v.play().catch(() => {}); } else { v.pause(); }
    });
  }, { threshold: 0.2 });

  // ---------------- multi-view viewer ----------------
  const tabs = $('#episode-tabs');
  const video = $('#mv-video');
  let slow = false;
  function showEpisode(i) {
    const ep = EPISODES[i];
    $$('.tab', tabs).forEach((t, j) => t.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    video.poster = `assets/video/${ep.id}.jpg`;
    video.src = `assets/video/${ep.id}.mp4`;
    delete video.dataset.userPaused;
    $('#mv-play').textContent = 'Pause';
    video.play().catch(() => {});
    const unseen = ep.views.length === 4 ? '<span class="unseen">4 views, unseen in training</span>' : '';
    $('#mv-instr').innerHTML = `“${ep.instruction}”<span class="src">${ep.robot}</span>${unseen}`;
  }
  EPISODES.forEach((ep, i) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.innerHTML = `<span>${ep.label}</span><span class="tsub">${ep.views.length} views · ${ep.robot}</span>`;
    b.addEventListener('click', () => showEpisode(i));
    tabs.appendChild(b);
  });
  $('#mv-play').addEventListener('click', (e) => {
    if (video.paused) { video.play(); delete video.dataset.userPaused; e.target.textContent = 'Pause'; }
    else { video.pause(); video.dataset.userPaused = '1'; e.target.textContent = 'Play'; }
  });
  $('#mv-slow').addEventListener('click', (e) => {
    slow = !slow;
    video.playbackRate = slow ? 0.5 : 1;
    e.target.textContent = slow ? '1× speed' : '0.5× speed';
  });
  video.addEventListener('loadeddata', () => { video.playbackRate = slow ? 0.5 : 1; });
  vidObs.observe(video);
  showEpisode(0);

  // ---------------- AC-WM rollouts ----------------
  (function acViewer() {
    const acTabs = $('#ac-tabs');
    if (!acTabs || !AC_EPISODES.length) return;
    const acVideo = $('#ac-video');
    let acSlow = false;
    function show(i) {
      const ep = AC_EPISODES[i];
      $$('.tab', acTabs).forEach((t, k) => t.setAttribute('aria-selected', k === i ? 'true' : 'false'));
      acVideo.poster = `assets/video/${ep.id}.jpg`;
      acVideo.src = `assets/video/${ep.id}.mp4`;
      delete acVideo.dataset.userPaused;
      $('#ac-play').textContent = 'Pause';
      acVideo.play().catch(() => {});
      $('#ac-instr').innerHTML = `${ep.label}<span class="src">RoboTwin 2.0 task ${ep.task}, clean scene, recorded actions as input</span>`;
    }
    AC_EPISODES.forEach((ep, i) => {
      const b = document.createElement('button');
      b.className = 'tab';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.innerHTML = `<span>${ep.label}</span><span class="tsub">clean scene</span>`;
      b.addEventListener('click', () => show(i));
      acTabs.appendChild(b);
    });
    $('#ac-play').addEventListener('click', (e) => {
      if (acVideo.paused) { acVideo.play(); delete acVideo.dataset.userPaused; e.target.textContent = 'Pause'; }
      else { acVideo.pause(); acVideo.dataset.userPaused = '1'; e.target.textContent = 'Play'; }
    });
    $('#ac-slow').addEventListener('click', (e) => {
      acSlow = !acSlow;
      acVideo.playbackRate = acSlow ? 0.5 : 1;
      e.target.textContent = acSlow ? '1\u00d7 speed' : '0.5\u00d7 speed';
    });
    acVideo.addEventListener('loadeddata', () => { acVideo.playbackRate = acSlow ? 0.5 : 1; });
    vidObs.observe(acVideo);
    show(0);
  })();

  // ---------------- RoboView-Bench table ----------------
  const tbody = $('#bench-table tbody');
  function renderTable(prof) {
    const rows = BENCH[prof];
    const best = HIGHER.map((hi, c) => {
      const col = rows.map((r) => r[c + 1]);
      return hi ? Math.max(...col) : Math.min(...col);
    });
    tbody.innerHTML = rows.map((r) => {
      let cls = '';
      if (r[0] === 'ViewDreamer') cls = ' class="ours"';
      else if (r[0] === 'Wan2.2-5B (FT)') cls = ' class="sep-top"';
      const name = r[0] === 'Wan2.2-5B (FT)' ? `${r[0]}<span class="sub">same data</span>` : r[0];
      const cells = r.slice(1).map((v, c) => `<td${v === best[c] ? ' class="best"' : ''}>${v.toFixed(DIGITS[c])}</td>`).join('');
      return `<tr${cls}><td>${name}</td>${cells}</tr>`;
    }).join('');
    $$('#table-tabs .chip').forEach((t) => t.setAttribute('aria-pressed', t.dataset.prof === String(prof) ? 'true' : 'false'));
  }
  $$('#table-tabs .chip').forEach((t) => t.addEventListener('click', () => renderTable(Number(t.dataset.prof))));
  renderTable(3);

  // ---------------- policy bars ----------------
  const barsEl = $('#bench-bars');
  barsEl.innerHTML = BARS.map((b) => {
    const max = Math.max(...b.vals.map(Number));
    const rows = b.vals.map((v, i) => `
      <div class="hbar m${i}"><span class="nm">${POLICIES[i]}</span><span class="v">${v}</span>
        <div class="track"><div class="fill" data-w="${(100 * Number(v) / max).toFixed(1)}"></div></div></div>`).join('');
    return `<figure class="chart-card"><div class="cap"><b>${b.title}</b><span>${b.sub}</span></div>${rows}</figure>`;
  }).join('');
  const barObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      $$('.fill', e.target).forEach((f) => { f.style.width = f.dataset.w + '%'; });
      barObs.unobserve(e.target);
    });
  }, { threshold: 0.3 });
  $$('.chart-card', barsEl).forEach((el) => barObs.observe(el));

  // ---------------- real-robot clips ----------------
  const rtabs = $('#robot-tabs');
  const rvideo = $('#robot-video');
  function showRobot(i) {
    const r = ROBOT[i];
    $$('.case-btn', rtabs).forEach((t, j) => t.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    rvideo.poster = `assets/video/${r.id}.jpg`;
    rvideo.src = `assets/video/${r.id}.mp4`;
    rvideo.play().catch(() => {});
    $('#robot-instr').textContent = `“${r.text}”`;
  }
  ROBOT.forEach((r, i) => {
    const b = document.createElement('button');
    b.className = 'case-btn';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.textContent = r.label;
    b.addEventListener('click', () => showRobot(i));
    rtabs.appendChild(b);
  });
  vidObs.observe(rvideo);
  showRobot(0);

  // ---------------- BibTeX copy ----------------
  $('#copy-bib').addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText($('#bib-text').textContent);
      e.target.textContent = 'Copied';
    } catch (err) {
      e.target.textContent = 'Select and copy';
    }
    setTimeout(() => { e.target.textContent = 'Copy'; }, 1600);
  });

  // ---------------- lightbox ----------------
  const lb = $('#lightbox');
  $$('img[data-zoom]').forEach((img) => img.addEventListener('click', () => {
    $('img', lb).src = img.src;
    lb.classList.add('open');
  }));
  lb.addEventListener('click', () => lb.classList.remove('open'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.remove('open'); });
})();

// Justified text that never shows big word gaps or a one- or two-word last line.
// Browsers break lines greedily, so for every justified block we measure the real layout (this browser,
// this width, this zoom, with or without hyphenation) and, if a line would be stretched too far or the
// last line would be short, try a few imperceptible spacing tweaks (like LaTeX's microtype) and an
// unbreakable last three words. A block that still does not fit is set ragged-right.
(function fitText() {
  const SEL = '.sec p, .sec figcaption, .sec li, .abstract p';
  const MAX_STRETCH = 0.55;                 // a justified space may grow to 1.55x its natural width
  const LETTER = [0, -0.12, 0.12, -0.24, 0.24];   // px
  const WORD = [0, -0.8, 0.8];                     // px
  const spaceCache = new Map();
  const state = new WeakMap();

  function textNodes(el) {
    const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) out.push(n);
    return out;
  }
  function bind(el, on) {
    // Glue the last three words: no-break spaces between them and no-break hyphens inside them
    // (a hyphen is otherwise a break opportunity that would split the glued group).
    const st = state.get(el);
    if (st.saved) { st.saved.forEach(([node, text]) => { node.textContent = text; }); st.saved = null; }
    if (!on) return true;
    const nodes = textNodes(el);
    const words = nodes.map((t) => t.textContent).join('').trim().split(/\s+/);
    if (words.length < 6 || words.slice(-3).join(' ').length > 34) return false;
    const saved = []; let runs = 0; let started = false;
    for (let i = nodes.length - 1; i >= 0 && runs < 3; i--) {
      const orig = nodes[i].textContent; const chars = orig.split('');
      for (let k = chars.length - 1; k >= 0; k--) {
        const ws = /[ \t\n\u00a0]/.test(chars[k]);
        if (!started) { if (ws) continue; started = true; }
        if (ws) {
          let j = k; while (j > 0 && /[ \t\n\u00a0]/.test(chars[j - 1])) j--;
          runs++;
          if (runs >= 3) break;
          chars.splice(j, k - j + 1, '\u00a0'); k = j;
        } else if (chars[k] === '-') chars[k] = '\u2011';
      }
      const s = chars.join('');
      if (s !== orig) { saved.push([nodes[i], orig]); nodes[i].textContent = s; }
    }
    st.saved = saved;
    return true;
  }
  function spaceWidth(el) {
    const cs = getComputedStyle(el);
    const key = cs.font + '|' + cs.letterSpacing + '|' + cs.wordSpacing;
    if (!spaceCache.has(key)) {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
      probe.textContent = 'a a';
      el.appendChild(probe);
      const w2 = probe.getBoundingClientRect().width;
      probe.textContent = 'aa';
      const w1 = probe.getBoundingClientRect().width;
      probe.remove();
      spaceCache.set(key, Math.max(1, w2 - w1));
    }
    return spaceCache.get(key);
  }
  function measure(el) {
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const width = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const lines = [];
    textNodes(el).forEach((node) => {
      const re = /\S+/g; let m;
      while ((m = re.exec(node.textContent))) {
        const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
        for (const rc of r.getClientRects()) {
          const t = Math.round(rc.top);
          const ln = lines.length && Math.abs(lines[lines.length - 1].t - t) <= 4 ? lines[lines.length - 1] : null;
          if (ln) { ln.n++; ln.w += rc.width; } else lines.push({ t, n: 1, w: rc.width });
        }
      }
    });
    return { lines, width, sp: spaceWidth(el) };
  }
  function ok(el, wantJustify) {
    const { lines, width, sp } = measure(el);
    if (lines.length < 2) return true;
    if (lines[lines.length - 1].n < 3) return false;
    if (!wantJustify) return true;
    for (let i = 0; i < lines.length - 1; i++) {
      const ln = lines[i];
      if (ln.n < 2) return false;
      const stretch = (width - (ln.w + (ln.n - 1) * sp)) / (ln.n - 1);
      if (stretch / sp > MAX_STRETCH) return false;
    }
    return true;
  }
  function fit(el) {
    if (!state.has(el)) state.set(el, { saved: null });
    el.style.letterSpacing = ''; el.style.wordSpacing = ''; el.style.textAlign = ''; bind(el, false);
    const justify = getComputedStyle(el).textAlign === 'justify';
    const words = el.textContent.trim().split(/\s+/).length;
    if (words < 4) return;
    for (const b of [false, true]) {
      if (b && !bind(el, true)) break;
      for (const ws of WORD) for (const ls of LETTER) {
        el.style.letterSpacing = ls ? ls + 'px' : '';
        el.style.wordSpacing = ws ? ws + 'px' : '';
        if (ok(el, justify)) return;
        if (!justify) break;   // ragged text: only the binding matters
      }
      el.style.letterSpacing = ''; el.style.wordSpacing = '';
      if (!justify) break;
    }
    if (justify) el.style.textAlign = 'left';
    bind(el, true);
  }
  let timer = null, lastW = 0;
  function run() {
    lastW = window.innerWidth;
    document.querySelectorAll(SEL).forEach((el) => { if (el.offsetParent) fit(el); });
  }
  const start = () => run();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastW) < 2) return;
    clearTimeout(timer); timer = setTimeout(run, 180);
  });
  window.__fitText = run;   // used by the layout checks
})();

// ---------------- Cross-View Interaction animation (READ -> MIX -> WRITE) ----------------
(function cviAnim() {
  const root = document.getElementById('cvi-anim');
  if (!root) return;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const capEl = root.querySelector('.anim-cap');
  const bar = root.querySelector('.anim-progress i');
  const playBtn = root.querySelector('.anim-play');
  const stepBtns = [...root.querySelectorAll('.astep')];

  const LW = 1200, LH = 470;
  const V = 3, T = 4, K = 4, GX = 6, GY = 4;
  // patch -> slot labels per view and latent frame (row-major, GY x GX); illustrative grouping of similar regions
  const LABELS = [
    ['222222222222220022221122', '222222222222220122221122', '222222222222220122221122', '222222222222220022221122'],
    ['222222222222220022231122', '222222222222220322231122', '222222222222220322231102', '222222222222220322231122'],
    ['222222222222222000220001', '222222222222222102220001', '222222222222222132220001', '222222222222222100220001'],
  ];
  const COLORS = ['#2f6fed', '#12a39a', '#9aa5b5', '#f29d0b'];
  const INK = '#171e27', INK2 = '#4a5260', INK3 = '#737a86', BRAND = '#1f6bff', BRAND_INK = '#0f4fcc';
  const FONT = '"IBM Plex Sans", system-ui, sans-serif';

  // geometry (logical units)
  const TW = 168, TH = 126, TY = [46, 188, 330];
  const LX = 96, RX = 936;
  const CELL = 44, CGAP = 16, GX0 = 488, GY0 = 139;
  const CARD = { x: 430, y: 92, w: 340, h: 312 };
  const cellXY = (k, t) => [GX0 + t * (CELL + CGAP) + CELL / 2, GY0 + k * (CELL + CGAP) + CELL / 2];
  const patchXY = (x0, v, gy, gx) => [x0 + (gx + 0.5) * TW / GX, TY[v] + (gy + 0.5) * TH / GY];
  const label = (v, t, gy, gx) => +LABELS[v][t][gy * GX + gx];

  // timeline (ms)
  const P = {
    intro: [0, 500], read: [500, 5300], mixs: [5300, 7500], mixt: [7500, 9700], write: [9700, 13700], hold: [13700, 14600],
  };
  const TOTAL = 14600, READ_STEP = 1200, MIX_STEP = 550, WRITE_STEP = 1000, FLY = 650;
  const CAPS = {
    read: 'READ \u00b7 Shared slots gather the patches of all views, separately at each time step.',
    mixs: 'MIX \u2460 spatial \u00b7 Within each frame, the K slots exchange information.',
    mixt: 'MIX \u2461 temporal \u00b7 Each slot attends to itself across the T frames.',
    write: 'WRITE \u00b7 Every view reads the updated slots back through a zero-initialized projection.',
  };
  const phaseOf = (tau) => (tau < P.read[1] ? 'read' : tau < P.mixs[1] ? 'mixs' : tau < P.mixt[1] ? 'mixt' : 'write');

  // deterministic launch delays
  const rnd = (a, b, c, d) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.3) * 43758.5453; return x - Math.floor(x); };
  const flights = [];  // per time step: list of {v, gy, gx, k, delay}
  for (let t = 0; t < T; t++) {
    const list = [];
    for (let v = 0; v < V; v++) for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
      list.push({ v, gy, gx, k: label(v, t, gy, gx), delay: 380 * rnd(v, gy, gx, t) });
    }
    flights.push(list);
  }
  const counts = flights.map((list) => [0, 1, 2, 3].map((k) => list.filter((f) => f.k === k).length));

  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const bez = (p0, p1, p2, p3, u) => {
    const m = 1 - u;
    return m * m * m * p0 + 3 * m * m * u * p1 + 3 * m * u * u * p2 + u * u * u * p3;
  };
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  const sprite = new Image();
  sprite.src = 'assets/img/cvi_frames.webp';
  let ready = false;
  sprite.onload = () => { ready = true; draw(); };

  function thumb(x0, v, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    // stacked frames behind (time)
    ctx.lineWidth = 1; ctx.strokeStyle = '#d9dee6';
    ctx.fillStyle = '#eef1f5'; rr(x0 + 8.5, TY[v] - 7.5, TW, TH, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5f7fa'; rr(x0 + 4.5, TY[v] - 3.5, TW, TH, 7); ctx.fill(); ctx.stroke();
    rr(x0, TY[v], TW, TH, 7); ctx.save(); ctx.clip();
    if (ready) ctx.drawImage(sprite, t * 240, v * 180, 240, 180, x0, TY[v], TW, TH);
    // patch grid
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
    for (let gx = 1; gx < GX; gx++) { ctx.beginPath(); ctx.moveTo(x0 + gx * TW / GX, TY[v]); ctx.lineTo(x0 + gx * TW / GX, TY[v] + TH); ctx.stroke(); }
    for (let gy = 1; gy < GY; gy++) { ctx.beginPath(); ctx.moveTo(x0, TY[v] + gy * TH / GY); ctx.lineTo(x0 + TW, TY[v] + gy * TH / GY); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#d5dae2'; ctx.lineWidth = 1; rr(x0 + 0.5, TY[v] + 0.5, TW - 1, TH - 1, 7); ctx.stroke();
    ctx.restore();
  }
  function flashPatch(x0, v, gy, gx, color, a) {
    if (a <= 0.01) return;
    ctx.fillStyle = hexA(color, a);
    ctx.fillRect(x0 + gx * TW / GX + 1, TY[v] + gy * TH / GY + 1, TW / GX - 2, TH / GY - 2);
  }
  function particle(x, y, color, k, a) {
    const bg = k === 2;
    ctx.fillStyle = hexA(color, (bg ? 0.45 : 0.95) * a);
    ctx.beginPath(); ctx.arc(x, y, bg ? 2.4 : 3.6, 0, Math.PI * 2); ctx.fill();
  }
  function text(s, x, y, size, color, weight = 500, align = 'center', style = '') {
    ctx.font = `${style} ${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function viewLabel(x, y, v, tilde, align) {
    ctx.font = `italic 600 18px ${FONT}`; ctx.fillStyle = INK2; ctx.textAlign = align; ctx.textBaseline = 'middle';
    const sup = `(${v + 1})`;
    ctx.save();
    const wX = ctx.measureText('X').width;
    ctx.font = `500 12px ${FONT}`;
    const wS = ctx.measureText(sup).width;
    const total = wX + wS + 1;
    const left = align === 'right' ? x - total : x;
    ctx.font = `italic 600 18px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('X', left, y);
    if (tilde) { ctx.font = `600 15px ${FONT}`; ctx.fillText('~', left + 1.5, y - 13); }
    ctx.font = `500 12px ${FONT}`; ctx.fillText(sup, left + wX + 1, y - 7);
    ctx.restore();
  }

  let tau = 0, playing = true, last = null, visible = false, lastPhase = '';
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw() {
    const scale = canvas.width / LW;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, LW, LH);
    const ph = phaseOf(tau);

    // ---- frame indices and slot fills ----
    const tRead = tau < P.read[0] ? -1 : Math.min(T - 1, Math.floor((tau - P.read[0]) / READ_STEP));
    const tLeft = Math.max(0, tRead);
    const tWrite = tau < P.write[0] ? -1 : Math.min(T - 1, Math.floor((tau - P.write[0]) / WRITE_STEP));

    // ---- static labels ----
    text('per-view tokens', LX + TW / 2, 20, 15, INK3);
    text('shared slots', CARD.x + CARD.w / 2, 70, 15, INK3);
    text('updated tokens', RX + TW / 2, 20, 15, INK3);
    const on = (id) => ph === id;
    text('READ', 347, 236, 20, on('read') ? BRAND_INK : INK3, 700);
    text('tokens \u2192 slots', 347, 262, 14, on('read') ? INK2 : INK3);
    text('WRITE', 853, 236, 20, on('write') ? BRAND_INK : INK3, 700);
    text('slots \u2192 tokens', 853, 262, 14, on('write') ? INK2 : INK3);
    text('zero-init', 853, 286, 13, INK3, 400);

    // ---- left thumbnails ----
    for (let v = 0; v < V; v++) {
      thumb(LX, v, tLeft, 1);
      viewLabel(LX - 14, TY[v] + TH / 2, v, false, 'right');
    }
    // ---- right thumbnails (dim until written) ----
    for (let v = 0; v < V; v++) {
      const written = tau >= P.write[0];
      const tR = written ? Math.max(0, tWrite) : 0;
      thumb(RX, v, tR, written ? 1 : 0.32);
      viewLabel(RX + TW + 14, TY[v] + TH / 2, v, true, 'left');
    }

    // ---- slot card ----
    ctx.fillStyle = '#eef4ff'; rr(CARD.x, CARD.y, CARD.w, CARD.h, 16); ctx.fill();
    ctx.strokeStyle = '#cfdcf5'; ctx.lineWidth = 1; rr(CARD.x + 0.5, CARD.y + 0.5, CARD.w - 1, CARD.h - 1, 16); ctx.stroke();
    for (let t = 0; t < T; t++) {
      const [cx] = cellXY(0, t);
      text(`t${t + 1}`, cx, GY0 - 18, 15, INK2, 500, 'center', 'italic');
    }
    for (let k = 0; k < K; k++) {
      const [, cy] = cellXY(k, 0);
      text(`s${k + 1}`, GX0 - 26, cy, 16, COLORS[k], 700, 'center', 'italic');
    }
    // fills
    const fill = (k, t) => {
      if (tau < P.read[0]) return 0;
      const end = P.read[0] + (t + 1) * READ_STEP;
      if (tau >= end || tau >= P.read[1]) return 1;
      const start = P.read[0] + t * READ_STEP;
      if (tau < start) return 0;
      const u = tau - start;
      const n = counts[t][k];
      if (!n) return 1;
      return flights[t].filter((f) => f.k === k && f.delay + FLY <= u).length / n;
    };
    // MIX highlight bands
    if (ph === 'mixs') {
      const t = Math.min(T - 1, Math.floor((tau - P.mixs[0]) / MIX_STEP));
      const [cx] = cellXY(0, t);
      ctx.fillStyle = 'rgba(31,107,255,0.10)'; rr(cx - CELL / 2 - 8, GY0 - 8, CELL + 16, K * (CELL + CGAP) - CGAP + 16, 12); ctx.fill();
      ctx.strokeStyle = BRAND; ctx.lineWidth = 2; rr(cx - CELL / 2 - 8, GY0 - 8, CELL + 16, K * (CELL + CGAP) - CGAP + 16, 12); ctx.stroke();
      ctx.fillStyle = BRAND; ctx.beginPath(); ctx.arc(cx, GY0 + K * (CELL + CGAP) - CGAP + 12, 11, 0, Math.PI * 2); ctx.fill();
      text('1', cx, GY0 + K * (CELL + CGAP) - CGAP + 12, 13, '#fff', 700);
    }
    if (ph === 'mixt') {
      const k = Math.min(K - 1, Math.floor((tau - P.mixt[0]) / MIX_STEP));
      const [, cy] = cellXY(k, 0);
      ctx.fillStyle = 'rgba(23,30,39,0.06)'; rr(GX0 - 8, cy - CELL / 2 - 8, T * (CELL + CGAP) - CGAP + 16, CELL + 16, 12); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(GX0 - 8, cy - CELL / 2 - 8, T * (CELL + CGAP) - CGAP + 16, CELL + 16, 12); ctx.stroke();
      const bx = GX0 + T * (CELL + CGAP) - CGAP + 16;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(bx, cy, 11, 0, Math.PI * 2); ctx.fill();
      text('2', bx, cy, 13, '#fff', 700);
    }
    // MIX connectors (behind the cells)
    if (ph === 'mixs') {
      const t = Math.min(T - 1, Math.floor((tau - P.mixs[0]) / MIX_STEP));
      const [x, y1] = cellXY(0, t), [, y2] = cellXY(K - 1, t);
      ctx.strokeStyle = 'rgba(31,107,255,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
    }
    if (ph === 'mixt') {
      const k = Math.min(K - 1, Math.floor((tau - P.mixt[0]) / MIX_STEP));
      const [x1, y] = cellXY(k, 0), [x2] = cellXY(k, T - 1);
      ctx.strokeStyle = 'rgba(23,30,39,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    }
    // cells
    for (let k = 0; k < K; k++) for (let t = 0; t < T; t++) {
      const [cx, cy] = cellXY(k, t);
      let s = 1;
      if (ph === 'mixs') {
        const tt = Math.min(T - 1, Math.floor((tau - P.mixs[0]) / MIX_STEP));
        if (tt === t) s = 1 + 0.07 * Math.sin(Math.PI * (((tau - P.mixs[0]) % MIX_STEP) / MIX_STEP));
      }
      if (ph === 'mixt') {
        const kk = Math.min(K - 1, Math.floor((tau - P.mixt[0]) / MIX_STEP));
        if (kk === k) s = 1 + 0.07 * Math.sin(Math.PI * (((tau - P.mixt[0]) % MIX_STEP) / MIX_STEP));
      }
      const f = fill(k, t);
      const w = CELL * s;
      ctx.fillStyle = '#ffffff'; rr(cx - w / 2, cy - w / 2, w, w, 9); ctx.fill();
      ctx.fillStyle = hexA(COLORS[k], 0.14 + 0.86 * f); rr(cx - w / 2, cy - w / 2, w, w, 9); ctx.fill();
      ctx.strokeStyle = hexA(COLORS[k], 0.55); ctx.lineWidth = 1; rr(cx - w / 2 + 0.5, cy - w / 2 + 0.5, w - 1, w - 1, 9); ctx.stroke();
    }
    // MIX messages: every active slot sends a token to every other active slot
    const dot = (x, y, color) => {
      ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    };
    const ring = (k, t, a) => {
      const [cx, cy] = cellXY(k, t);
      ctx.strokeStyle = hexA(COLORS[k], a); ctx.lineWidth = 2.5;
      rr(cx - CELL / 2 - 5, cy - CELL / 2 - 5, CELL + 10, CELL + 10, 12); ctx.stroke();
    };
    if (ph === 'mixs') {
      const t = Math.min(T - 1, Math.floor((tau - P.mixs[0]) / MIX_STEP));
      const raw = ((tau - P.mixs[0]) % MIX_STEP) / MIX_STEP, u = ease(raw);
      for (let k = 0; k < K; k++) ring(k, t, 0.55 * Math.sin(Math.PI * raw));
      for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) {
        if (a === b) continue;
        const [x, ya] = cellXY(a, t), [, yb] = cellXY(b, t);
        dot(x + (a < b ? 7 : -7), ya + (yb - ya) * u, COLORS[a]);
      }
    }
    if (ph === 'mixt') {
      const k = Math.min(K - 1, Math.floor((tau - P.mixt[0]) / MIX_STEP));
      const raw = ((tau - P.mixt[0]) % MIX_STEP) / MIX_STEP, u = ease(raw);
      for (let t = 0; t < T; t++) ring(k, t, 0.55 * Math.sin(Math.PI * raw));
      for (let a = 0; a < T; a++) for (let b = 0; b < T; b++) {
        if (a === b) continue;
        const [xa, y] = cellXY(k, a), [xb] = cellXY(k, b);
        dot(xa + (xb - xa) * u, y + (a < b ? -7 : 7), COLORS[k]);
      }
    }

    // ---- READ flights ----
    if (ph === 'read' && tRead >= 0) {
      const u0 = tau - (P.read[0] + tRead * READ_STEP);
      for (const f of flights[tRead]) {
        const [x, y] = patchXY(LX, f.v, f.gy, f.gx);
        const [cx, cy] = cellXY(f.k, tRead);
        const age = u0 - f.delay;
        flashPatch(LX, f.v, f.gy, f.gx, COLORS[f.k], age >= 0 ? 0.6 * (1 - clamp(age / 520)) : 0);
        if (age < 0 || age > FLY) continue;
        const u = ease(age / FLY);
        const px = bez(x, x + 150, cx - 150, cx, u), py = bez(y, y, cy, cy, u);
        particle(px, py, COLORS[f.k], f.k, 1);
      }
    }
    // ---- WRITE flights ----
    if (ph === 'write' && tWrite >= 0 && tau < P.write[1]) {
      const u0 = tau - (P.write[0] + tWrite * WRITE_STEP);
      for (const f of flights[tWrite]) {
        const [x, y] = patchXY(RX, f.v, f.gy, f.gx);
        const [cx, cy] = cellXY(f.k, tWrite);
        const age = u0 - f.delay * 0.8;
        if (age > FLY) flashPatch(RX, f.v, f.gy, f.gx, COLORS[f.k], 0.55 * (1 - clamp((age - FLY) / 380)));
        if (age < 0 || age > FLY) continue;
        const u = ease(age / FLY);
        const px = bez(cx, cx + 150, x - 150, x, u), py = bez(cy, cy, y, y, u);
        particle(px, py, COLORS[f.k], f.k, 1);
      }
    }

    // ---- caption, steps, progress ----
    if (ph !== lastPhase) {
      lastPhase = ph;
      capEl.textContent = CAPS[ph];
      stepBtns.forEach((b) => b.setAttribute('aria-selected', b.dataset.phase === ph ? 'true' : 'false'));
      // on narrow screens the canvas scrolls sideways: keep the active stage in view
      const wrap = canvas.parentElement;
      const span = wrap.scrollWidth - wrap.clientWidth;
      if (span > 4 && visible) wrap.scrollTo({ left: ph === 'read' ? 0 : ph === 'write' ? span : span / 2, behavior: calm ? 'auto' : 'smooth' });
    }
    bar.style.width = `${(100 * tau) / TOTAL}%`;
  }

  function frame(now) {
    if (!visible || !playing) { last = null; return; }
    if (last != null) tau = (tau + (now - last)) % TOTAL;
    last = now;
    draw();
    requestAnimationFrame(frame);
  }
  function start() { if (visible && playing) { last = null; requestAnimationFrame(frame); } }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || LW;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr * LH / LW);
    draw();
  }
  window.addEventListener('resize', resize);

  if (calm) { playing = false; tau = P.read[1] - 1; playBtn.textContent = 'Play'; }
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
    start();
  });
  stepBtns.forEach((b) => b.addEventListener('click', () => {
    tau = P[b.dataset.phase][0] + 1;
    draw();
    start();
  }));
  new IntersectionObserver((entries) => {
    entries.forEach((e) => { visible = e.isIntersecting; start(); });
  }, { threshold: 0.15 }).observe(canvas);
  root.seek = (t) => { playing = false; playBtn.textContent = 'Play'; tau = t; draw(); };  // used by the screenshot checks
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(resize);
  resize();
})();
