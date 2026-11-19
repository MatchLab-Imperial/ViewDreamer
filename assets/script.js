(() => {
  'use strict';

  const METHODS = ['Ground truth', 'ViewDreamer', 'Wan2.2-5B (FT)', 'Cosmos3-Nano'];
  const AC_EPISODES = [
    { id: 'acwm_roller', label: 'Grab the roller', split: 'clean', instruction: 'Securely grab the cylindrical roller with tapered ends using both arms.' },
    { id: 'acwm_can_pot', label: 'Can beside the pot', split: 'clean', instruction: 'Place the small metal sauce container next to the pot with round lid.' },
    { id: 'acwm_hammer', label: 'Hammer the block', split: 'clean', instruction: 'Pick the grippy handle hammer and smash the block.' },
    { id: 'acwm_bottle', label: 'Pick up a bottle', split: 'clean', instruction: 'Grab the plastic bottle with bright red color and pick up the plastic bottle.' },
  ];
  const EPISODES = [
    { id: "thermos", label: "Pour from the thermos", views: ["Head", "Chest", "Left wrist"], robot: "AlphaBot 2",
      instruction: "Grasp the thermos with one hand and pour water into the cup lid." },
    { id: "red_block", label: "Move the red block", views: ["Head", "Chest", "Right wrist"], robot: "AgileX Cobot Magic",
      instruction: "Put the red build block in the center of the table." },
    { id: "beaker", label: "Shake the beaker", views: ["Head", "Chest", "Left wrist"], robot: "AlphaBot 2",
      instruction: "Pick up the beaker with the right gripper, shake it three times, and then put it down." },
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
    { id: 'robot_cubes_into_cups', label: 'Cubes into cups', text: 'Put the red cube in the red cup and the blue cube in the blue cup.' },
    { id: 'robot_stack_cups', label: 'Stack cups', text: 'Stack the orange cup in the red cup, then the red cup in the blue cup.' },
    { id: 'robot_cup_into_box', label: 'Cup into box', text: 'Put the blue cup in the box.' },
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

  // play videos only while visible
  const vidObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { if (!v.dataset.userPaused) v.play().catch(() => {}); } else { v.pause(); }
    });
  }, { threshold: 0.2 });

  // ---------------- multi-view viewer ----------------
  const tabs = $('#episode-tabs');
  const video = $('#mv-video');
  const colheads = $('#mv-colheads');
  const rowheads = $('#mv-rowheads');
  let slow = false;
  METHODS.forEach((m, i) => {
    const d = document.createElement('div');
    d.textContent = m;
    if (i === 1) d.className = 'ours';
    rowheads.appendChild(d);
  });
  function showEpisode(i) {
    const ep = EPISODES[i];
    $$('.tab', tabs).forEach((t, j) => t.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    colheads.style.setProperty('--cols', ep.views.length);
    colheads.innerHTML = ep.views.map((v) => `<div>${v}</div>`).join('');
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
    b.innerHTML = `<span>${ep.label}</span><span class="tsub">${ep.robot} · ${ep.views.length} views</span>`;
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
    ['Ground truth', 'Our AC-WM', 'Wan2.2-5B', 'Cosmos3-Nano'].forEach((m, i) => {
      const d = document.createElement('div');
      d.textContent = m;
      if (i === 1) d.className = 'ours';
      $('#ac-rowheads').appendChild(d);
    });
    $('#ac-colheads').style.setProperty('--cols', 3);
    $('#ac-colheads').innerHTML = ['Head', 'Left wrist', 'Right wrist'].map((v) => `<div>${v}</div>`).join('');
    let acSlow = false;
    function show(i) {
      const ep = AC_EPISODES[i];
      $$('.tab', acTabs).forEach((t, k) => t.setAttribute('aria-selected', k === i ? 'true' : 'false'));
      acVideo.poster = `assets/video/${ep.id}.jpg`;
      acVideo.src = `assets/video/${ep.id}.mp4`;
      delete acVideo.dataset.userPaused;
      $('#ac-play').textContent = 'Pause';
      acVideo.play().catch(() => {});
      $('#ac-instr').innerHTML = `\u201c${ep.instruction}\u201d<span class="src">RoboTwin 2.0, ${ep.split} scene</span>`;
    }
    AC_EPISODES.forEach((ep, i) => {
      const b = document.createElement('button');
      b.className = 'tab';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.innerHTML = `<span>${ep.label}</span><span class="tsub">${ep.split} scene</span>`;
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

// Keep at least three words on the last line of every text block: bind the last three
// words with no-break spaces (skipped when they are long, e.g. e-mail addresses).
(function widont() {
  const blocks = document.querySelectorAll('p, figcaption, li, .lede, .instr');
  blocks.forEach((el) => {
    const texts = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) texts.push(n);
    const full = texts.map((t) => t.textContent).join('').trim();
    const words = full.split(/\s+/);
    if (words.length < 6 || words.slice(-3).join(' ').length > 34) return;
    let need = 2;
    for (let i = texts.length - 1; i >= 0 && need > 0; i--) {
      let s = texts[i].textContent;
      let end = s.length;
      if (i === texts.length - 1) end = s.replace(/\s+$/, '').length;
      for (let k = end - 1; k >= 0 && need > 0; k--) {
        if (/\s/.test(s[k])) {
          let j = k;
          while (j > 0 && /\s/.test(s[j - 1])) j--;
          s = s.slice(0, j) + '\u00a0' + s.slice(k + 1);
          k = j;
          need--;
        }
      }
      texts[i].textContent = s;
    }
  });
})();
