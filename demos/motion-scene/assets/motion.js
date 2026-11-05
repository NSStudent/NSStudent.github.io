/* Motion scenes for the onboarding and What's New (1.3 and 1.4), after motion/mindchess (one canvas, one pure draw(t)).
   Every value is a closed-form spring (S) or a smoothstep of the scene time: nothing is carried between frames, so a
   frame can be drawn at any t (snapshots, Reduce Motion) and the loop has no seam. The SwiftUI port (MotionKit in
   Styleguide) mirrors this file scene by scene: same box, same timings, same data.

   <canvas class="mc-motion" data-scene="coins" data-opts='{"fold":true}'></canvas> anywhere inside a [data-scheme]
   element; the canvas fills its parent. ?motion=still draws every scene at its still frame (the Reduce Motion frame),
   ?motion=<seconds> at that time. */
(function () {
  const M = (window.MOTION = { scenes: {} });
  const Q = (location.search.match(/[?&]motion=([^&]+)/) || [])[1];
  M.fixed = Q === 'still' ? 'still' : Q != null && !isNaN(+Q) ? +Q : null;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- springs and easing (as in motion/mindchess) ---------- */
  const S = (M.S = (x, w = 14) => {
    if (x <= 0) return 0;
    const z = 0.78, wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * x);
    return 1 - e * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x));
  });
  const clamp = (M.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)));
  const smooth = (M.smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); });
  const lerp = (M.lerp = (a, b, k) => a + (b - a) * k);
  const bump = (M.bump = (t, c, len = 0.14, w = 30) => S(t - c, w) - S(t - c - len, w));
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (M.mix = (a, b, k) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; });
  const alpha = (M.alpha = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; });

  /* ---------- ThemeColors (Color+Root.swift) ---------- */
  const C = (M.C = {
    accent: '#3B82F6', accentLight: '#60A5FA', ok: '#34D399', wrong: '#F97316', carrot: '#FB923C', violet: '#8B5CF6',
    helio: '#A78BFA', pink: '#F472B6', froly: '#F87171', gold: '#DEBA13', periwinkle: '#C7D2FE', red: '#EF4444',
    paper: '#F4EFE3', inkL: '#F7F3EA', inkD: '#B9B2A3',
  });
  M.theme = (scheme) => scheme === 'light'
    ? { dark: false, bg: '#FFFFFF', surface: '#E5E7EB', skel: '#D1D5DB', text: '#111827', text2: '#6B7280', hiArea: 'rgba(255,255,255,0.92)', loArea: 'rgba(17,24,39,0.55)' }
    : { dark: true, bg: '#111827', surface: '#1F2937', skel: '#374151', text: '#FFFFFF', text2: '#9CA3AF', hiArea: 'rgba(255,255,255,0.72)', loArea: 'rgba(0,0,0,0.42)' };
  /* the four training categories (TrainingCategory.barColor) and their 13 games, in Home order */
  M.CATS = [
    { key: 'boardVision', color: '#3B82F6', games: ['squareColor', 'coordinates', 'sameColor', 'diagonal', 'knightDistance'] },
    { key: 'memory', color: '#A78BFA', games: ['memory', 'pieceSnapshot', 'openingMemoryFlash'] },
    { key: 'calculation', color: '#FB923C', games: ['knight', 'bishopCaptures'] },
    { key: 'tacticalAwareness', color: '#F87171', games: ['collision', 'forkFinder', 'mateIn1'] },
  ];
  M.PRO_SETS = [['modern', 'Modern'], ['brisa', 'Brisa'], ['atelier', 'Atelier'], ['nord', 'Nord'], ['bauhaus', 'Bauhaus'], ['deco', 'Deco'], ['pebble', 'Pebble'], ['origami', 'Origami'], ['arcade', 'Arcade'], ['ribbon', 'Ribbon'], ['citadel', 'Citadel']];
  const FONT = '-apple-system, "SF Pro Display", system-ui, "Segoe UI", sans-serif';
  const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
  const font = (M.font = (wt, px, mono) => `${wt} ${px}px ${mono ? MONO : FONT}`);

  /* ---------- images ---------- */
  const IMG = {};
  const loadImg = (key, src) => { if (!IMG[key]) { const i = new Image(); i.onload = () => (i.ready = true); i.src = src; IMG[key] = i; } return IMG[key]; };
  const base = () => (window.UI && window.UI.base) || (/design-platforms/.test(location.pathname) ? '../design-iphone/' : '');
  M.piece = (code, set) => loadImg(`p:${set || 'resourchess'}:${code}`, `${base()}assets/pieces/${set || 'resourchess'}/${code}.svg`);
  M.proKnight = (set) => loadImg(`pro:${set}`, `${base()}assets/pieces-pro/${set}-wN.svg`);
  M.badge = (id, variant) => {
    const B = window.BADGES; if (!B || !B.svg[id]) return null;
    return loadImg(`b:${id}:${variant}`, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(B.svg[id][variant]));
  };
  const draw = (g, img, x, y, w, h) => { if (img && img.ready) g.drawImage(img, x, y, w, h); };

  /* ---------- drawing helpers ---------- */
  const rr = (M.rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); });
  const text = (M.text = (g, s, x, y, f, c, align = 'left', base = 'alphabetic') => { g.font = f; g.fillStyle = c; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); });
  const circle = (g, x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } };
  const check = (g, x, y, s, color, w = 2.2) => { g.save(); g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - s * 0.45, y); g.lineTo(x - s * 0.1, y + s * 0.35); g.lineTo(x + s * 0.5, y - s * 0.35); g.stroke(); g.restore(); };
  const flame = (g, x, y, s, color) => {
    g.save(); g.translate(x, y); g.scale(s / 20, s / 20); g.beginPath();
    g.moveTo(0, -10); g.bezierCurveTo(6, -4, 9, 1, 7, 6); g.bezierCurveTo(5, 11, -5, 11, -7, 6); g.bezierCurveTo(-9, 1, -5, -2, -3, -6);
    g.bezierCurveTo(-2, -2, -1, 0, 1, 1); g.bezierCurveTo(2, -3, 1, -7, 0, -10); g.closePath(); g.fillStyle = color; g.fill(); g.restore();
  };
  const fenBoard = (M.fenBoard = (fen) => {
    const b = {}; fen.split(' ')[0].split('/').forEach((row, r) => { let f = 0; for (const ch of row) {
      if (/\d/.test(ch)) f += +ch; else { b['abcdefgh'[f] + (8 - r)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase(); f++; }
    } }); return b;
  });
  const BOARD = { light: '#EEEED5', dark: '#7C955D' }; // the kit's default board theme (green)
  const sqXY = (s, x0, y0, sq) => [x0 + 'abcdefgh'.indexOf(s[0]) * sq, y0 + (8 - +s[1]) * sq];
  const squares = (g, x0, y0, sq, colorOf) => { for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { g.fillStyle = colorOf(f, 7 - r, (f + r) % 2 === 1); g.fillRect(x0 + f * sq, y0 + r * sq, sq + 0.5, sq + 0.5); } };
  M.helpers = { rr, text, circle, check, flame, sqXY, squares, draw };

  /* ---------- scene registry ---------- */
  /* speed: the scene plays faster than it was drawn (its time is t × speed, the loop lasts dur / speed). */
  M.define = (name, def) => (M.scenes[name] = Object.assign({ box: [360, 280], dur: 6, still: 3, speed: 1 }, def));

  /* =========================================================================================================
     coins · onboarding «feedback»: every completed game is a coin; ten coins forge the first badge
     (2026-10-badges, «Contador»). Ring of 10 slots around the locked Square Color · 10 badge. */
  M.define('coins', { dur: 6, still: 4.4, draw(g, t, e) {
    const { th } = e, cx = 180, cy = 124, R = 88, FORGE = 2.75;
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(5.4, 5.9, t));
    const melt = smooth(FORGE, FORGE + 0.3, t);
    let landed = 0;
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 10, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      g.save(); g.globalAlpha *= 1 - melt; g.lineWidth = 2; g.strokeStyle = th.skel; circle(g, x, y, 12); g.stroke(); g.restore();
      const ti = 0.35 + i * 0.2, k = S(t - ti, 16);
      if (t > ti) {
        if (k > 0.6) landed++;
        g.save(); g.globalAlpha *= clamp((t - ti) * 6) * (1 - melt);
        const yy = lerp(y - 64, y, k);
        circle(g, x, yy, 10.5, C.accent); circle(g, x - 3, yy - 3, 3.2, alpha('#FFFFFF', 0.45)); g.restore();
      }
    }
    // the ring pours into the badge
    if (t > FORGE) {
      const k = S(t - FORGE, 10);
      g.save(); g.globalAlpha *= 1 - smooth(FORGE + 0.45, FORGE + 0.75, t); g.strokeStyle = C.accent; g.lineWidth = lerp(5, 14, k);
      circle(g, cx, cy, lerp(R, 54, k)); g.stroke(); g.restore();
    }
    // badge: locked, flips to earned with a pop and sparks
    const flip = clamp((t - (FORGE + 0.4)) / 0.3), earned = flip >= 0.5;
    const sx = Math.abs(Math.cos(Math.PI * flip)) || 0.001, pop = 1 + 0.14 * bump(t, FORGE + 0.7, 0.25, 22), size = 112 * pop;
    g.save(); g.translate(cx, cy); g.scale(sx, 1);
    draw(g, M.badge('squareColor-10', earned ? 'earned' : 'locked'), -size / 2, -size / 2, size, size); g.restore();
    if (t > FORGE + 0.7) {
      const k = clamp((t - FORGE - 0.7) / 0.55);
      g.save(); g.globalAlpha *= 1 - k; g.strokeStyle = C.gold; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 + 0.39, r0 = 62 + 18 * k, r1 = r0 + 14 * (1 - k * 0.6);
        g.beginPath(); g.moveTo(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)); g.lineTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); g.stroke(); }
      g.restore();
    }
    const n = t > FORGE ? 10 : landed;
    text(g, `${n}/10`, cx, cy + R + 44, font(650, 17), t > FORGE ? C.accent : th.text2, 'center');
  } });

  /* =========================================================================================================
     gym · onboarding «Tu gimnasio diario»: the 13 drills fall into their four skills (2026-10-gym-grows), three of them
     get the daily challenge's check and the streak flame lights up. */
  M.define('gym', { dur: 6, still: 4.6, draw(g, t, e) {
    const { th } = e, colW = 78, gap = 9, x0 = (360 - (4 * colW + 3 * gap)) / 2, y0 = 40, tileH = 34, tileGap = 8;
    g.globalAlpha = 1 - smooth(5.4, 5.9, t);
    const daily = [[0, 0, 2.3], [1, 1, 2.75], [3, 2, 3.2]]; // [category, row, time]
    M.CATS.forEach((cat, ci) => {
      const x = x0 + ci * (colW + gap), hk = S(t - 0.1 - ci * 0.06, 16);
      g.save(); g.globalAlpha *= clamp(hk); circle(g, x + 11, 18, 9, cat.color); rr(g, x + 26, 15, colW - 34, 6, 3); g.fillStyle = alpha(th.dark ? '#FFFFFF' : '#111827', 0.22); g.fill(); g.restore();
      cat.games.forEach((_, j) => {
        const k = S(t - 0.3 - (j * 4 + ci) * 0.065, 15), y = y0 + j * (tileH + tileGap) - 22 * (1 - k);
        g.save(); g.globalAlpha *= clamp(k * 1.4);
        rr(g, x, y, colW, tileH, 10); g.fillStyle = th.surface; g.fill();
        circle(g, x + 15, y + tileH / 2, 7.5, cat.color);
        rr(g, x + 28, y + 11, colW - 42, 5, 2.5); g.fillStyle = alpha(th.dark ? '#FFFFFF' : '#111827', 0.5); g.fill();
        rr(g, x + 28, y + 20, colW - 54, 4, 2); g.fillStyle = alpha(th.dark ? '#FFFFFF' : '#111827', 0.22); g.fill();
        const d = daily.find(([c, r]) => c === ci && r === j);
        if (d && t > d[2]) {
          const p = S(t - d[2], 18);
          g.lineWidth = 2; g.strokeStyle = alpha(C.ok, p); rr(g, x, y, colW, tileH, 10); g.stroke();
          g.save(); g.translate(x + colW - 4, y + 4); g.scale(p, p); circle(g, 0, 0, 8, C.ok); check(g, 0, 0.5, 9, '#FFFFFF', 2); g.restore();
        }
        g.restore();
      });
    });
    // streak capsule: the flame lights when the three drills of the day are done
    const sk = S(t - 3.65, 14), cw = 92, cx = 180 - cw / 2, cy = 252;
    g.save(); g.globalAlpha *= clamp(sk * 1.3); g.translate(180, cy + 14); g.scale(0.85 + 0.15 * sk, 0.85 + 0.15 * sk); g.translate(-180, -cy - 14);
    rr(g, cx, cy, cw, 28, 14); g.fillStyle = alpha(C.carrot, 0.18); g.fill();
    flame(g, cx + 24, cy + 14, 20, C.carrot); text(g, '3/3', cx + 40, cy + 19.5, font(700, 15), C.carrot); g.restore();
  } });

  /* =========================================================================================================
     repertoire · «Aperturas que no olvidas»: you play your line move by move (each answer, a check) and the calendar
     marks the next reviews (SM-2 with «Good»: today, tomorrow and in a week): the hop between them grows. */
  const REP = {
    moves: [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4']],
    rows: [['1.', 'e4', 0], ['2.', 'Nf3', 2], ['3.', 'Bc4', 4]], // number, SAN, ply that answers it
    at: (i) => 0.5 + i * 0.4, // ply i starts
    days: [0, 1, 7], // review days (cell index in the two weeks)
  };
  M.REP = REP;
  M.define('repertoire', { dur: 4.8, still: 4.0, draw(g, t, e) {
    const { th } = e, sq = 22, bx = 24, by = 46;
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(4.35, 4.75, t));
    // board with the line
    rr(g, bx - 3, by - 3, sq * 8 + 6, sq * 8 + 6, 8); g.fillStyle = th.surface; g.fill();
    squares(g, bx, by, sq, (f, r, light) => (light ? BOARD.light : BOARD.dark));
    const pos = fenBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'), flying = [];
    let cur = -1;
    REP.moves.forEach(([from, to], i) => { const ti = REP.at(i); if (t >= ti) { cur = i; const p = pos[from]; delete pos[from]; pos[to] = p; const k = S(t - ti, 18); if (k < 0.999) flying.push({ p, from, to, k }); } });
    if (cur >= 0) REP.moves[cur].forEach((s) => { const [x0, y0] = sqXY(s, bx, by, sq); g.fillStyle = alpha('#FFD60A', 0.32); g.fillRect(x0, y0, sq, sq); });
    const flyTo = new Set(flying.map((f) => f.to));
    Object.entries(pos).forEach(([s, p]) => { if (flyTo.has(s)) return; const [x0, y0] = sqXY(s, bx, by, sq); draw(g, M.piece(p), x0, y0, sq, sq); });
    flying.forEach(({ p, from, to, k }) => { const [a, b] = sqXY(from, bx, by, sq), [c, d] = sqXY(to, bx, by, sq); draw(g, M.piece(p), lerp(a, c, k), lerp(b, d, k) - Math.sin(Math.PI * clamp(k)) * 6, sq, sq); });
    // the card: your moves, each one a question until you play it
    rr(g, 214, 43, 134, 182, 14); g.fillStyle = th.surface; g.fill();
    REP.rows.forEach(([num, san, ply], i) => {
      const y = 70 + i * 32, ta = REP.at(ply), k = S(t - ta - 0.2, 16), ck = S(t - ta - 0.3, 20);
      text(g, num, 226, y + 5, font(600, 14, true), th.text2);
      g.save(); g.globalAlpha *= clamp(1 - k * 1.5); rr(g, 250, y - 10, 46, 20, 6); g.fillStyle = th.skel; g.fill();
      text(g, '?', 273, y + 5, font(700, 13), th.text2, 'center'); g.restore();
      g.save(); g.globalAlpha *= clamp(k); text(g, san, 250, y + 5 + 6 * (1 - k), font(700, 15, true), th.text); g.restore();
      circle(g, 328, y, 9, th.skel);
      if (ck > 0) { circle(g, 328, y, 9 * ck, C.ok); if (ck > 0.6) check(g, 328, y, 8, '#FFFFFF', 2); }
    });
    // two weeks: today turns green, then the review hops to tomorrow and on to next week
    const cw = 13, gap = 4, cx0 = 222, cy0 = 172, cell = (d) => [cx0 + (d % 7) * (cw + gap), cy0 + Math.floor(d / 7) * (cw + gap)];
    const t0 = 2.6, hops = [[t0 + 0.25, 0.3], [t0 + 0.7, 0.45]]; // start, length
    rr(g, cx0, cy0 - 12, 7 * cw + 6 * gap, 5, 2.5); g.fillStyle = alpha(C.accent, 0.5); g.fill();
    for (let d = 0; d < 14; d++) {
      const [x, y] = cell(d), ri = REP.days.indexOf(d);
      rr(g, x, y, cw, cw, 3.5); g.fillStyle = th.skel; g.fill();
      const lit = ri === 0 ? S(t - t0, 16) : ri > 0 ? S(t - hops[ri - 1][0] - hops[ri - 1][1], 18) : 0;
      if (lit > 0) { const s = cw * lit; rr(g, x + (cw - s) / 2, y + (cw - s) / 2, s, s, 3.5); g.fillStyle = ri === 0 ? C.ok : C.accent; g.fill(); }
    }
    hops.forEach(([h0, len], i) => {
      const k = clamp((t - h0) / len); if (k <= 0 || k >= 1) return;
      const [ax, ay] = cell(REP.days[i]), [bx2, by2] = cell(REP.days[i + 1]);
      const x = lerp(ax, bx2, k) + cw / 2, y = lerp(ay, by2, k) + cw / 2 - Math.sin(Math.PI * k) * (14 + 10 * i);
      circle(g, x, y, 4, C.accent);
    });
  } });

  /* =========================================================================================================
     games · «Tus partidas, analizadas» (2026-10-import-anywhere + the report chart of the UI loop): the PGN tape slides in,
     each move jumps onto the board and the evaluation chart of Megdadi – Ruiz draws itself with its two blunders. */
  const GAME = {
    tape: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6',
    tokens: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'],
    moves: [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['f8', 'c5'], ['c2', 'c3'], ['g8', 'f6']],
    // Stockfish 19 (fischer-engine), depth 20, centipawns from White, plies 0–30 (motion/mindchess/2026-10-ui-loop)
    evals: [34, 29, 32, 20, 23, 23, 24, 21, 19, 0, 14, 0, -7, -7, 10, 8, 1, 0, 5, 0, 0, 0, 40, 51, 46, 35, 29, 24, 618, -14, 30],
    blunders: [28, 29],
  };
  M.GAME = GAME;
  M.define('games', { dur: 7, still: 5.6, speed: 1.35, draw(g, t, e) {
    const { th } = e, sq = 21, bx = 14, by = 62;
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(6.4, 6.9, t));
    // tape
    rr(g, 10, 12, 340, 32, 16); g.fillStyle = th.surface; g.fill();
    g.save(); rr(g, 10, 12, 340, 32, 16); g.clip();
    const tx = lerp(360, 22, S(t - 0.15, 7)); g.font = font(600, 12.5, true);
    let cur = -1; GAME.moves.forEach((_, i) => { if (t >= 1.3 + i * 0.42) cur = i; });
    // highlight the current token
    let x = tx; const parts = GAME.tape.split(' '); let tok = 0;
    parts.forEach((p) => { const w = g.measureText(p + ' ').width; if (!/^\d+\.$/.test(p)) { if (tok === cur) { rr(g, x - 3, 17, g.measureText(p).width + 6, 22, 6); g.fillStyle = alpha(C.accent, 0.28); g.fill(); } tok++; } x += w; });
    text(g, GAME.tape, tx, 33, font(600, 12.5, true), th.text);
    g.restore();
    // board with the moves
    rr(g, bx - 3, by - 3, sq * 8 + 6, sq * 8 + 6, 8); g.fillStyle = th.surface; g.fill();
    squares(g, bx, by, sq, (f, r, light) => (light ? BOARD.light : BOARD.dark));
    const pos = fenBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    const flying = [];
    GAME.moves.forEach(([from, to], i) => { const ti = 1.3 + i * 0.42; if (t >= ti) { const p = pos[from]; delete pos[from]; pos[to] = p; const k = S(t - ti, 18); if (k < 0.999) flying.push({ p, from, to, k }); } });
    const flyTo = new Set(flying.map((f) => f.to));
    Object.entries(pos).forEach(([s, p]) => { if (flyTo.has(s)) return; const [x0, y0] = sqXY(s, bx, by, sq); draw(g, M.piece(p), x0, y0, sq, sq); });
    flying.forEach(({ p, from, to, k }) => { const [a, b] = sqXY(from, bx, by, sq), [c, d] = sqXY(to, bx, by, sq); draw(g, M.piece(p), lerp(a, c, k), lerp(b, d, k) - Math.sin(Math.PI * clamp(k)) * 6, sq, sq); });
    if (cur >= 0) { const [a, b] = GAME.moves[cur]; [a, b].forEach((s) => { const [x0, y0] = sqXY(s, bx, by, sq); g.fillStyle = alpha('#FFD60A', 0.32); g.fillRect(x0, y0, sq, sq); }); }
    // evaluation chart (ReportEvaluationChart: win-chance scale 0.004, White's area above the dashed zero line)
    const ck = S(t - 3.5, 12), GX = 196, GY = 62, GW = 152, GH = 168;
    g.save(); g.globalAlpha *= clamp(ck * 1.2); g.translate(0, 12 * (1 - ck));
    rr(g, GX, GY, GW, GH, 12); g.fillStyle = th.surface; g.fill();
    const L = GX + 10, Rr = GX + GW - 10, zero = GY + GH / 2, half = GH / 2 - 14;
    const gx = (p) => L + ((Rr - L) * p) / 30, gy = (cp) => zero - (2 / (1 + Math.exp(-0.004 * cp)) - 1) * half;
    const front = smooth(3.8, 5.3, t) * 30, n = Math.floor(front), fr = front - n;
    const pts = GAME.evals.map((cp, p) => [gx(p), gy(cp)]);
    const path = pts.slice(0, n + 1); if (n < 30) { const a = pts[n], b = pts[n + 1]; path.push([lerp(a[0], b[0], fr), lerp(a[1], b[1], fr)]); }
    const area = () => { g.beginPath(); g.moveTo(path[0][0], zero); path.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(path[path.length - 1][0], zero); g.closePath(); };
    g.save(); g.beginPath(); g.rect(GX, GY, GW, zero - GY); g.clip(); area(); g.fillStyle = th.hiArea; g.fill(); g.restore();
    g.save(); g.beginPath(); g.rect(GX, zero, GW, GH / 2); g.clip(); area(); g.fillStyle = th.loArea; g.fill(); g.restore();
    g.save(); g.setLineDash([3, 4]); g.lineWidth = 1; g.strokeStyle = alpha('#9CA3AF', 0.55); g.beginPath(); g.moveTo(L, zero); g.lineTo(Rr, zero); g.stroke(); g.restore();
    g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = 2; g.lineJoin = 'round'; g.strokeStyle = th.dark ? 'rgba(255,255,255,0.8)' : 'rgba(17,24,39,0.75)'; g.stroke();
    if (front < 30) { g.fillStyle = C.accent; g.fillRect(gx(front) - 1, GY + 8, 2, GH - 16); }
    GAME.blunders.forEach((p) => { if (front >= p) { const k = S(t - (3.8 + (p / 30) * 1.5), 20); circle(g, pts[p][0], pts[p][1], 4.5 * k, C.red); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke(); } });
    g.restore();
  } });

  /* =========================================================================================================
     paper · «Del papel a la posición» (2026-10-paper-to-win): a printed diagram, crooked, straightens; the corners lock,
     the scan line passes and the squares turn into the app's board in a diagonal wave; Stockfish's bar rises. */
  const PAPER_FEN = 'r4rk1/pp3ppp/2p1b3/n2q4/Q2P4/5N2/PP1N1PPP/R3R1K1'; // Megdadi – Ruiz after 14…Be6
  M.define('paper', { dur: 5.6, still: 4.6, speed: 1.12, draw(g, t, e) {
    const { th } = e, sq = 23, B = sq * 8, bx = 180 - B / 2, by = 136 - B / 2, pos = fenBoard(PAPER_FEN);
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(5.05, 5.5, t));
    const st = S(t - 0.6, 7), rot = lerp(-0.17, 0, st), sc = lerp(0.88, 1, st);
    const paperA = 1 - smooth(3.5, 4.1, t);
    g.save(); g.translate(180, 136); g.rotate(rot); g.scale(sc, sc); g.translate(-180, -136);
    if (paperA > 0) { g.save(); g.globalAlpha *= paperA; g.shadowColor = 'rgba(0,0,0,0.28)'; g.shadowBlur = 18; g.shadowOffsetY = 6; rr(g, bx - 16, by - 16, B + 32, B + 32, 6); g.fillStyle = C.paper; g.fill(); g.restore(); }
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const rank = 7 - r, light = (f + rank) % 2 === 1, tw = 2.75 + (f + rank) * 0.065, k = smooth(tw, tw + 0.16, t);
      g.fillStyle = mix(light ? C.inkL : C.inkD, light ? BOARD.light : BOARD.dark, k); g.fillRect(bx + f * sq, by + r * sq, sq + 0.5, sq + 0.5);
      const s = 'abcdefgh'[f] + (rank + 1), p = pos[s];
      if (p) {
        const img = M.piece(p);
        if (k < 1) { g.save(); g.filter = 'grayscale(1) contrast(1.15)'; g.globalAlpha *= 1 - k; draw(g, img, bx + f * sq, by + r * sq, sq, sq); g.restore(); }
        if (k > 0) { g.save(); g.globalAlpha *= k; draw(g, img, bx + f * sq, by + r * sq, sq, sq); g.restore(); }
      }
    }
    g.restore();
    // corner brackets
    const ca = smooth(1.15, 1.45, t) * (1 - smooth(3.6, 3.9, t));
    if (ca > 0) {
      const lock = S(t - 1.15, 16), o = lerp(16, 3, lock), L = 18;
      g.save(); g.globalAlpha *= ca; g.strokeStyle = C.accent; g.lineWidth = 3.2; g.lineCap = 'round';
      [[bx - o, by - o, 1, 1], [bx + B + o, by - o, -1, 1], [bx - o, by + B + o, 1, -1], [bx + B + o, by + B + o, -1, -1]].forEach(([x, y, dx, dy]) => { g.beginPath(); g.moveTo(x + dx * L, y); g.lineTo(x, y); g.lineTo(x, y + dy * L); g.stroke(); });
      g.restore();
    }
    // scan line
    if (t > 1.8 && t < 2.75) {
      const y = lerp(by, by + B, smooth(1.85, 2.7, t)), grad = g.createLinearGradient(0, y - 22, 0, y);
      grad.addColorStop(0, alpha(C.accent, 0)); grad.addColorStop(1, alpha(C.accent, 0.35));
      g.fillStyle = grad; g.fillRect(bx, y - 22, B, 22); g.fillStyle = C.accent; g.fillRect(bx - 6, y - 1, B + 12, 2);
    }
    // evaluation bar (+6.43 for White)
    const ek = S(t - 4.05, 12);
    if (ek > 0) {
      const ex = bx - 16, wc = 2 / (1 + Math.exp(-0.004 * 643)) - 1, white = (B * (1 + wc)) / 2 * ek + (B / 2) * (1 - ek);
      g.save(); g.globalAlpha *= clamp(ek * 1.5); rr(g, ex, by, 8, B, 4); g.fillStyle = '#1F2937'; g.fill(); rr(g, ex, by + B - white, 8, white, 4); g.fillStyle = '#F3F4F6'; g.fill(); g.restore();
    }
  } });

  /* =========================================================================================================
     clock · «Un reloj para la partida en mesa» (2026-10-duo-clock): taps alternate and the accent is the side that runs.
     On iPhone and the Duo's outer display the clock is face to face; with a fold (opts.fold) it is the real tabletop:
     both times standing side by side on the raised half, the two tap zones on the base. */
  const clockAt = (t) => {
    // 3 + 2, game time ×8; Black starts White's clock with the first tap
    const taps = [0.5, 1.25, 2.0, 2.75, 3.5, 4.25], tm = { w: 180, b: 180 }; let run = null, last = 0, moves = 0;
    for (const tp of taps) { if (tp > t) break; if (run) { tm[run] -= (tp - last) * 8; tm[run] += 2; } run = run === 'w' ? 'b' : 'w'; last = tp; moves++; }
    if (run) tm[run] -= (t - last) * 8;
    return { tm, run, taps, moves };
  };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  M.define('clock', { dur: 5.2, still: 3.0, draw(g, t, e) {
    const { th } = e, { tm, run, taps } = clockAt(t);
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(4.75, 5.15, t));
    const ripple = (x, y, tap) => { const k = (t - tap) / 0.45; if (k > 0 && k < 1) { g.save(); g.globalAlpha *= (1 - k) * 0.6; g.strokeStyle = th.text; g.lineWidth = 2.5; circle(g, x, y, 10 + 34 * k); g.stroke(); g.restore(); } };
    const side = (x, y, w, h, who, rotate) => {
      const on = run === who; rr(g, x, y, w, h, 18); g.fillStyle = on ? C.accent : th.surface; g.fill();
      g.save(); g.translate(x + w / 2, y + h / 2); if (rotate) g.rotate(Math.PI);
      text(g, fmt(tm[who]), 0, 2, font(700, Math.min(34, h * 0.36), false), on ? '#FFFFFF' : th.text, 'center', 'middle'); g.restore();
    };
    if (!e.opts.fold) {
      const dx = 105, dy = 12, dw = 150, dh = 256;
      rr(g, dx, dy, dw, dh, 30); g.fillStyle = th.dark ? '#0B1120' : '#F3F4F6'; g.fill(); g.lineWidth = 2; g.strokeStyle = th.skel; g.stroke();
      side(dx + 8, dy + 8, dw - 16, dh / 2 - 12, 'b', true);
      side(dx + 8, dy + dh / 2 + 4, dw - 16, dh / 2 - 12, 'w', false);
      taps.forEach((tp, i) => ripple(dx + dw / 2, i % 2 === 0 ? dy + dh / 4 : dy + (3 * dh) / 4, tp));
    } else {
      const x0 = 40, w = 280, top = [14, 118], base = [152, 118];
      rr(g, x0, top[0], w, top[1], 20); g.fillStyle = th.dark ? '#0B1120' : '#F3F4F6'; g.fill();
      side(x0 + 8, top[0] + 8, w / 2 - 12, top[1] - 16, 'w', false); side(x0 + w / 2 + 4, top[0] + 8, w / 2 - 12, top[1] - 16, 'b', false);
      const grad = g.createLinearGradient(0, 136, 0, 148); grad.addColorStop(0, alpha('#000000', 0)); grad.addColorStop(0.5, alpha('#000000', th.dark ? 0.55 : 0.18)); grad.addColorStop(1, alpha('#000000', 0));
      g.fillStyle = grad; g.fillRect(x0 - 10, 136, w + 20, 12);
      ['w', 'b'].forEach((who, i) => { const x = x0 + i * (w / 2 + 4), on = run === who; rr(g, x, base[0], w / 2 - 4, base[1], 18); g.fillStyle = on ? alpha(C.accent, 0.22) : th.surface; g.fill(); g.lineWidth = 2; g.strokeStyle = on ? C.accent : 'transparent'; g.stroke(); circle(g, x + w / 4 - 2, base[0] + base[1] / 2, 16, on ? C.accent : th.skel); });
      taps.forEach((tp, i) => ripple(x0 + (i % 2 === 0 ? (3 * w) / 4 : w / 4), base[0] + base[1] / 2, tp));
    }
  } });

  /* =========================================================================================================
     pieces · onboarding «Premium» (2026-10-piece-by-piece): one knight through the 11 Pro sets, a diagonal wave on the
     board behind it at every change. */
  M.define('pieces', { dur: 6.6, still: 0.45, speed: 1.3, draw(g, t, e) {
    const { th } = e, step = 0.6, i = Math.floor(t / step) % 11, u = t - Math.floor(t / step) * step, sq = 22, bx = 92, by = 26;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const rank = 7 - r, light = (f + rank) % 2 === 1, h = bump(u, (f + rank) * 0.022, 0.1, 40);
      g.fillStyle = mix(th.dark ? (light ? '#1F2937' : '#18212F') : (light ? '#F3F4F6' : '#E5E7EB'), C.accent, 0.5 * h);
      g.fillRect(bx + f * sq, by + r * sq, sq + 0.5, sq + 0.5);
    }
    const s = 0.8 + 0.2 * S(u, 22), size = 150 * s;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
    draw(g, M.proKnight(M.PRO_SETS[i][0]), 180 - size / 2, 114 - size / 2, size, size); g.restore();
    const name = M.PRO_SETS[i][1]; g.font = font(650, 18); const w = g.measureText(name).width, x = 180 - (w + 46) / 2;
    text(g, name, x, 260, font(650, 18), th.text);
    rr(g, x + w + 8, 245, 38, 19, 9.5); g.fillStyle = alpha(C.accent, 0.18); g.fill(); text(g, 'PRO', x + w + 27, 258.5, font(800, 11), C.accent, 'center');
  } });

  /* =========================================================================================================
     sun · onboarding «Recordatorio» (2026-10-day-with-mindchess): the accent is a sun that crosses the sky and rests at the
     chosen reminder hour (opts.hour, 0–24); after 20:00 it turns into the moon. */
  M.define('sun', { dur: 8, still: 0, draw(g, t, e) {
    const { th } = e, h = e.opts.hour != null ? e.opts.hour : 20.5, cx = 180, cy = 214, R = 146;
    const day = smooth(6, 9, h) * (1 - smooth(18, 21, h)), night = 1 - smooth(5, 7, h) + smooth(19.5, 21.5, h);
    g.save(); rr(g, 8, 8, 344, 264, 26); g.clip();
    const sky = g.createLinearGradient(0, 8, 0, 272);
    const top = th.dark ? mix('#0B1120', '#1E3A8A', day) : mix('#E0E7FF', '#BFDBFE', day), bot = th.dark ? mix('#111827', '#1F2937', day) : mix('#F3F4F6', '#EFF6FF', day);
    sky.addColorStop(0, top); sky.addColorStop(1, bot); g.fillStyle = sky; g.fillRect(8, 8, 344, 264);
    // arc and horizon
    g.save(); g.setLineDash([4, 6]); g.strokeStyle = alpha(th.dark ? '#9CA3AF' : '#6B7280', 0.45); g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R, Math.PI, 0); g.stroke(); g.restore();
    g.fillStyle = th.dark ? '#1F2937' : '#E5E7EB'; g.fillRect(8, cy, 344, 272 - cy);
    for (const hh of [6, 9, 12, 15, 18, 21]) { const a = Math.PI * (1 - (hh - 6) / 16); g.fillStyle = alpha(th.dark ? '#9CA3AF' : '#6B7280', 0.6); circle(g, cx + R * Math.cos(a), cy - R * Math.sin(a), 2.5); g.fill(); }
    const a = Math.PI * (1 - (clamp(h, 5, 23) - 6) / 16), x = cx + R * Math.cos(a), y = cy - R * Math.sin(a);
    g.save(); g.beginPath(); g.rect(8, 8, 344, cy - 8); g.clip();
    const glow = g.createRadialGradient(x, y, 4, x, y, 56); const sc = night > 0.5 ? C.periwinkle : mix(C.gold, C.carrot, smooth(15, 19, h));
    glow.addColorStop(0, alpha(night > 0.5 ? '#C7D2FE' : '#FB923C', 0.5)); glow.addColorStop(1, alpha('#FB923C', 0)); g.fillStyle = glow; circle(g, x, y, 56); g.fill();
    if (night > 0.5) { circle(g, x, y, 17, sc); circle(g, x + 7, y - 5, 14, top); }
    else {
      g.save(); g.translate(x, y); g.rotate(t * 0.35); g.strokeStyle = sc; g.lineWidth = 2.5; g.lineCap = 'round';
      for (let k = 0; k < 8; k++) { const b = (k * Math.PI) / 4; g.beginPath(); g.moveTo(24 * Math.cos(b), 24 * Math.sin(b)); g.lineTo(31 * Math.cos(b), 31 * Math.sin(b)); g.stroke(); }
      g.restore(); circle(g, x, y, 17, sc);
    }
    g.restore();
    // stars at night
    if (night > 0) { g.save(); g.globalAlpha *= night; [[60, 50], [110, 84], [258, 40], [300, 96], [210, 70], [150, 36]].forEach(([sx, sy], k) => { circle(g, sx, sy, 1.4 + 0.6 * Math.sin(t * 2 + k), th.dark ? '#E5E7EB' : '#6B7280'); }); g.restore(); }
    // bell on the base
    g.save(); g.translate(180, 244); g.fillStyle = C.accent; g.beginPath(); g.moveTo(-9, 4); g.quadraticCurveTo(-9, -12, 0, -12); g.quadraticCurveTo(9, -12, 9, 4); g.lineTo(11, 7); g.lineTo(-11, 7); g.closePath(); g.fill(); circle(g, 0, 10, 3, C.accent); g.restore();
    g.restore();
  } });

  /* =========================================================================================================
     cover · Settings › What's New: the release number with the drills orbiting it. The release is content
     (opts.release, «1.4» by default), not a fixed «13 → 1.3»: the left part and the right part split and the dot drops. */
  M.define('cover', { dur: 5, still: 3.2, draw(g, t, e) {
    const { th, opts } = e, cx = 180, cy = 140, [major, minor = ''] = String(opts.release || '1.4').split('.');
    g.globalAlpha = smooth(0, 0.3, t) * (1 - smooth(4.55, 4.95, t));
    const tiles = M.CATS.flatMap((c) => c.games.map(() => c.color)), open = S(t - 1.35, 10);
    tiles.forEach((c, i) => {
      const k = S(t - 0.1 - i * 0.05, 14), a = (i / tiles.length) * Math.PI * 2 + t * 0.3, r = lerp(70, 112, k) + 10 * open;
      g.save(); g.globalAlpha *= clamp(k * 1.2); g.translate(cx + r * Math.cos(a), cy + r * 0.82 * Math.sin(a)); g.rotate(a + Math.PI / 4);
      rr(g, -9, -9, 18, 18, 5); g.fillStyle = c; g.fill(); g.restore();
    });
    const sep = 20 * open, f = font(800, 92, false);
    g.font = f; const w1 = g.measureText(major).width, base = cy + 32;
    text(g, major, cx - w1 - 2 - sep * 0.6, base, f, th.text);
    text(g, minor, cx + 2 + sep * 0.6, base, f, th.text);
    const dk = S(t - 1.55, 13);
    if (t > 1.5) circle(g, cx, lerp(cy - 120, base - 9, dk), 9.5 * clamp(dk * 2), C.accent);
  } });

  /* ---------- 1.4 shared data ---------- */
  /* Three rivals, one per tier (BotCatalog: name, accent c1, tier), with the avatar art in the «pieces» style (D47). */
  M.BOTS = [{ id: 'pip', name: 'Pip', c: '#34D399', tier: 1 }, { id: 'sofia', name: 'Sofía', c: '#2DD4BF', tier: 2 }, { id: 'viktor', name: 'Viktor', c: '#F87171', tier: 3 }];
  M.avatar = (id) => loadImg(`av:${id}`, `${base()}assets/bot-avatars/pieces/${id}@3x.png`);
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  /* A board at (x0, y0) with `sq` squares after playing `moves` ([from, to, time]) from `fen`; each move springs and
     the last one played gets the yellow squares (as the app's last move, D40). */
  const playBoard = (g, t, x0, y0, sq, fen, moves, th) => {
    rr(g, x0 - 3, y0 - 3, sq * 8 + 6, sq * 8 + 6, 8); g.fillStyle = th.surface; g.fill();
    squares(g, x0, y0, sq, (f, r, light) => (light ? BOARD.light : BOARD.dark));
    const pos = fenBoard(fen), flying = []; let last = null;
    moves.forEach(([from, to, at]) => {
      if (t < at || !pos[from]) return; const code = pos[from]; delete pos[from]; pos[to] = code; last = [from, to];
      const k = S(t - at, 18); if (k < 0.999) flying.push({ code, from, to, k });
    });
    if (last) last.forEach((s) => { const [x, y] = sqXY(s, x0, y0, sq); g.fillStyle = 'rgba(255,214,10,0.32)'; g.fillRect(x, y, sq, sq); });
    const landing = new Set(flying.map((f) => f.to));
    Object.entries(pos).forEach(([s, code]) => { if (landing.has(s)) return; const [x, y] = sqXY(s, x0, y0, sq); draw(g, M.piece(code), x, y, sq, sq); });
    flying.forEach((f) => { const [ax, ay] = sqXY(f.from, x0, y0, sq), [bx, by] = sqXY(f.to, x0, y0, sq), lift = Math.sin(Math.PI * clamp(f.k)) * 6;
      draw(g, M.piece(f.code), lerp(ax, bx, f.k), lerp(ay, by, f.k) - lift, sq, sq); });
  };
  const checkBadge = (g, x, y, r, k, color = C.ok) => {
    if (k <= 0) return; g.save(); g.translate(x, y); g.scale(Math.max(0.001, k), Math.max(0.001, k)); circle(g, 0, 0, r, color); check(g, 0, 0.5, r * 1.05, '#FFFFFF', r / 7); g.restore();
  };
  /* circular arrow (review), centred at x, y */
  const again = (g, x, y, r, color) => {
    g.save(); g.strokeStyle = color; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, -Math.PI * 0.35, Math.PI * 1.25); g.stroke();
    const a = -Math.PI * 0.35, px = x + r * Math.cos(a), py = y + r * Math.sin(a);
    g.beginPath(); g.moveTo(px - 4.5, py - 1.5); g.lineTo(px + 0.5, py); g.lineTo(px - 0.5, py + 5); g.stroke(); g.restore();
  };

  /* =========================================================================================================
     bots · What's New «Encuentra tu rival», onboarding «Encuentra tu rival»: three rivals (one per tier) appear,
     Sofía is chosen, she takes her seat beside the board and answers 1.e4 with 1…e5 (a1 dark, White below). */
  M.define('bots', { dur: 6, still: 4.6, speed: 1.2, draw(g, t, e) {
    const { th } = e, SEL = 1.35, MOVE = 2.0, W = 92, H = 132;
    g.globalAlpha = smooth(0, 0.2, t) * (1 - smooth(5.45, 5.95, t));
    const card = (b, cx, top, scale, ring, think) => {
      g.save(); g.translate(cx, top + H / 2); g.scale(scale, scale); g.translate(-cx, -top - H / 2);
      rr(g, cx - W / 2, top, W, H, 18); g.fillStyle = th.surface; g.fill();
      if (ring > 0) { g.save(); g.globalAlpha *= clamp(ring); rr(g, cx - W / 2, top, W, H, 18); g.lineWidth = 2.5; g.strokeStyle = b.c; g.stroke(); g.restore(); }
      const ay = top + 40; circle(g, cx, ay, 29, th.bg);
      g.save(); g.beginPath(); g.arc(cx, ay, 27, 0, Math.PI * 2); g.clip(); draw(g, M.avatar(b.id), cx - 27, ay - 27, 54, 54); g.restore();
      g.save(); g.strokeStyle = b.c; g.lineWidth = 2.2; circle(g, cx, ay, 28.5); g.stroke(); g.restore();
      text(g, b.name, cx, top + 94, font(650, 15), th.text, 'center');
      for (let i = 0; i < 3; i++) { rr(g, cx - 25 + i * 18, top + 108, 14, 5, 2.5); g.fillStyle = i < b.tier ? b.c : th.skel; g.fill(); }
      if (think > 0) { g.save(); g.globalAlpha *= clamp(think); for (let i = 0; i < 3; i++) circle(g, cx - 10 + i * 10, top - 10 - 4 * Math.max(0, Math.sin(t * 9 - i * 0.9)), 3, th.text2); g.restore(); }
      g.restore();
    };
    const leave = smooth(SEL + 0.3, SEL + 0.75, t), m = S(t - MOVE, 9);
    M.BOTS.forEach((b, i) => {
      const k = S(t - 0.15 - i * 0.12, 14); if (i === 1 || k <= 0) return;
      g.save(); g.globalAlpha *= clamp(k * 1.4) * (1 - leave); card(b, [72, 180, 288][i], 62 + 24 * (1 - k) + 30 * leave, 1, 0, 0); g.restore();
    });
    // the board, once Sofía takes her seat
    const bk = S(t - MOVE - 0.15, 12);
    if (bk > 0) { g.save(); g.globalAlpha *= clamp(bk * 1.3); g.translate(0, 14 * (1 - bk));
      playBoard(g, t, 132, 40, 25, START, [['e2', 'e4', 2.75], ['e7', 'e5', 3.65]], th); g.restore(); }
    const k = S(t - 0.27, 14), think = smooth(3.0, 3.15, t) * (1 - smooth(3.5, 3.65, t));
    g.save(); g.globalAlpha *= clamp(k * 1.4);
    card(M.BOTS[1], lerp(180, 62, m), lerp(62 + 24 * (1 - k), 74, m), lerp(1 + 0.06 * bump(t, SEL, 0.2, 24), 0.86, m), S(t - SEL, 16), think);
    g.restore();
  } });

  /* =========================================================================================================
     tactics · «Entrena tu táctica»: a back-rank mate (6k1/5ppp/8/8/8/8/5PPP/4R1K1 w, 1.Re8#, the only solution) is solved
     on the board, the session's results fill in and the one missed is kept for review (no score in the review). */
  M.define('tactics', { dur: 6, still: 4.7, speed: 1.2, draw(g, t, e) {
    const { th } = e, x0 = 22, y0 = 48, sq = 23, SEL = 0.7, MOVE = 1.15, MATE = 1.55;
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(5.45, 5.95, t));
    playBoard(g, t, x0, y0, sq, '6k1/5ppp/8/8/8/8/5PPP/4R1K1', [['e1', 'e8', MOVE]], th);
    if (t > SEL && t < MOVE) { const [x, y] = sqXY('e1', x0, y0, sq); g.fillStyle = `rgba(255,214,10,${0.45 * smooth(SEL, SEL + 0.12, t)})`; g.fillRect(x, y, sq, sq);
      const [tx, ty] = sqXY('e8', x0, y0, sq); circle(g, tx + sq / 2, ty + sq / 2, 4 * smooth(SEL + 0.1, SEL + 0.25, t), 'rgba(0,0,0,0.28)'); }
    const mk = S(t - MATE, 18);
    if (mk > 0) { const [x, y] = sqXY('g8', x0, y0, sq); g.save(); g.globalAlpha *= clamp(mk);
      const glow = g.createRadialGradient(x + sq / 2, y + sq / 2, 2, x + sq / 2, y + sq / 2, sq * 0.75); glow.addColorStop(0, alpha(C.red, 0.85)); glow.addColorStop(1, alpha(C.red, 0));
      g.fillStyle = glow; g.fillRect(x - 4, y - 4, sq + 8, sq + 8); draw(g, M.piece('bK'), x, y, sq, sq); g.restore(); }
    checkBadge(g, x0 + sq * 6.5, y0 + sq * 4, 17, S(t - 1.75, 16)); // on the empty g4–g5, clear of the mate
    // the session: one row per puzzle, the theme as a bar; ✓ / ✗ and the missed one back for review
    const px = 222, pw = 124, rows = [[1.9, true, 56], [2.35, true, 44], [2.8, false, 60], [3.25, true, 38], [3.7, true, 50]];
    rr(g, px, y0 - 3, pw, sq * 8 + 6, 14); g.fillStyle = th.surface; g.fill();
    const ink = th.dark ? '#FFFFFF' : '#111827';
    rows.forEach(([at, ok, w], i) => {
      const y = y0 + 22 + i * 35, k = S(t - at, 18), cur = t < at && (i === 0 || t >= rows[i - 1][0]);
      circle(g, px + 20, y, 10.5, th.skel);
      if (cur) { g.save(); g.strokeStyle = C.accent; g.lineWidth = 2; circle(g, px + 20, y, 10.5 + 1.5 * Math.sin(t * 6) ** 2); g.stroke(); g.restore(); }
      if (k > 0) { g.save(); g.translate(px + 20, y); g.scale(k, k); circle(g, 0, 0, 10.5, ok ? C.ok : C.wrong);
        if (ok) check(g, 0, 0.5, 9, '#FFFFFF', 2); else { g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-3.5, -3.5); g.lineTo(3.5, 3.5); g.moveTo(3.5, -3.5); g.lineTo(-3.5, 3.5); g.stroke(); }
        g.restore(); }
      rr(g, px + 38, y - 3, w, 6, 3); g.fillStyle = alpha(ink, 0.35); g.fill();
      if (!ok) { const ak = S(t - 4.05, 16); if (ak > 0) { g.save(); g.translate(px + pw - 18, y); g.scale(ak, ak); again(g, 0, 0, 6.5, C.wrong); g.restore(); } }
    });
  } });

  /* =========================================================================================================
     accounts · «Trae tus partidas»: games travel by turns from two account decks (no logos: a light deck and a green
     one) into the MindChess library, which syncs and stops. Import only: nothing goes back to the accounts. */
  M.define('accounts', { dur: 6, still: 4.8, speed: 1.2, draw(g, t, e) {
    const { th } = e, ink = th.dark ? '#FFFFFF' : '#111827', decks = [{ y: 46, c: th.dark ? '#E5E7EB' : '#374151' }, { y: 160, c: '#7FA650' }];
    const lib = { x: 164, y: 26, w: 180, h: 228 }, N = 6, at = (i) => 0.55 + i * 0.36, bars = [92, 70, 104, 80, 64, 96];
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(5.45, 5.95, t));
    decks.forEach((d, di) => {
      const k = S(t - 0.1 - di * 0.1, 14), pulse = [0, 1, 2, 3, 4, 5].filter((i) => i % 2 === di).reduce((p, i) => p + bump(t, at(i), 0.12, 34), 0);
      g.save(); g.globalAlpha *= clamp(k * 1.3); g.translate(0, 18 * (1 - k));
      for (let j = 2; j >= 0; j--) { rr(g, 22 + j * 5, d.y - j * 5, 104, 74, 14); g.fillStyle = j ? mix(th.surface, th.bg, 0.35 * j) : th.surface; g.fill(); }
      g.save(); g.translate(74, d.y + 37); g.scale(1 + 0.05 * pulse, 1 + 0.05 * pulse); g.translate(-74, -d.y - 37);
      circle(g, 44, d.y + 22, 10, d.c); circle(g, 44, d.y + 22, 4, th.surface);
      rr(g, 60, d.y + 19, 52, 6, 3); g.fillStyle = alpha(ink, 0.45); g.fill();
      rr(g, 34, d.y + 44, 78, 5, 2.5); g.fillStyle = alpha(ink, 0.2); g.fill(); rr(g, 34, d.y + 55, 56, 5, 2.5); g.fill();
      g.restore(); g.restore();
    });
    // the library
    const lk = S(t - 0.2, 12);
    g.save(); g.globalAlpha *= clamp(lk * 1.3);
    rr(g, lib.x, lib.y, lib.w, lib.h, 16); g.fillStyle = th.surface; g.fill();
    rr(g, lib.x + 14, lib.y + 14, 24, 24, 7); g.fillStyle = C.accent; g.fill();
    g.save(); g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.lineCap = 'round'; [0, 6, 12].forEach((dx) => { g.beginPath(); g.moveTo(lib.x + 20 + dx, lib.y + 20); g.lineTo(lib.x + 20 + dx, lib.y + 32); g.stroke(); }); g.restore();
    rr(g, lib.x + 46, lib.y + 23, 64, 6, 3); g.fillStyle = alpha(ink, 0.45); g.fill();
    const landed = [...Array(N).keys()].filter((i) => S(t - at(i), 11) > 0.98).length, done = smooth(3.05, 3.25, t), sx = lib.x + lib.w - 26, sy = lib.y + 26;
    if (landed) text(g, String(landed), sx - 18, sy + 5, font(700, 14), th.text2, 'right');
    if (done < 1) { g.save(); g.globalAlpha *= 1 - done; g.translate(sx, sy); g.rotate(t * 5); g.strokeStyle = C.accent; g.lineWidth = 2.2; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 1.2); g.stroke(); g.beginPath(); g.arc(0, 0, 7, Math.PI, Math.PI * 2.2); g.stroke(); g.restore(); }
    checkBadge(g, sx, sy, 9, S(t - 3.1, 18));
    const slot = (i) => ({ x: lib.x + 12, y: lib.y + 52 + i * 28, w: lib.w - 24, h: 22 });
    for (let i = 0; i < N; i++) { const s = slot(i); rr(g, s.x, s.y, s.w, s.h, 7); g.fillStyle = alpha(ink, 0.05); g.fill(); }
    g.restore();
    for (let i = 0; i < N; i++) {
      const k = S(t - at(i), 11); if (t < at(i)) continue;
      const d = decks[i % 2], s = slot(i), from = { x: 34, y: d.y + 26, w: 80, h: 22 }, kk = clamp(k);
      const x = lerp(from.x, s.x, k), y = lerp(from.y, s.y, k) - Math.sin(Math.PI * kk) * 22, w = lerp(from.w, s.w, kk), h = s.h;
      g.save(); g.globalAlpha *= clamp((t - at(i)) * 8);
      rr(g, x, y, w, h, 7); g.fillStyle = k > 0.98 ? th.bg : mix(th.bg, d.c, 0.18); g.fill();
      [[0, 0, 1], [1, 0, 0], [0, 1, 0], [1, 1, 1]].forEach(([fx, fy, light]) => { g.fillStyle = light ? BOARD.light : BOARD.dark; g.fillRect(x + 7 + fx * 6, y + 5 + fy * 6, 6, 6); }); // a game: a tiny board
      rr(g, x + 24, y + 8, Math.min(bars[i], w - 46), 6, 3); g.fillStyle = alpha(ink, 0.4); g.fill();
      circle(g, x + w - 11, y + h / 2, 4, d.c);
      g.restore();
    }
  } });

  /* =========================================================================================================
     progress · «Descubre qué mejorar»: sessions fill twelve weeks of activity, the weekly accuracy draws itself and the
     skills' bars grow; the weakest skill is singled out with «train it». Illustrative data, never a promised rise. */
  M.define('progress', { dur: 6.4, still: 5.0, speed: 1.25, draw(g, t, e) {
    const { th } = e, ink = th.dark ? '#FFFFFF' : '#111827';
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(5.85, 6.35, t));
    const plate = (x, y, w, h, k) => { g.globalAlpha *= clamp(k * 1.3); rr(g, x, y, w, h, 14); g.fillStyle = th.surface; g.fill(); };
    // twelve weeks
    g.save(); plate(18, 22, 160, 108, S(t - 0.05, 14));
    const cell = 9.5, gap = 2.6, ox = 28, oy = 36, level = (c, r) => { const v = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1; return c > 9 ? (v < 0.2 ? 1 : v < 0.6 ? 2 : 3) : v < 0.32 ? 0 : v < 0.62 ? 1 : v < 0.86 ? 2 : 3; };
    for (let c = 0; c < 12; c++) for (let r = 0; r < 7; r++) {
      if (c === 11 && r > 3) continue;
      const k = S(t - 0.25 - c * 0.07 - r * 0.012, 18), lv = level(c, r), x = ox + c * (cell + gap), y = oy + r * (cell + gap);
      rr(g, x, y, cell, cell, 2.5); g.fillStyle = th.skel; g.fill();
      if (lv && k > 0) { const s = cell * clamp(k); rr(g, x + (cell - s) / 2, y + (cell - s) / 2, s, s, 2.5); g.fillStyle = alpha(C.accent, [0, 0.38, 0.65, 1][lv]); g.fill(); }
    }
    const tk = S(t - 1.25, 16); if (tk > 0) { g.save(); g.globalAlpha *= clamp(tk); g.strokeStyle = C.carrot; g.lineWidth = 2; rr(g, ox + 11 * (cell + gap) - 2.5, oy + 3 * (cell + gap) - 2.5, cell + 5, cell + 5, 4); g.stroke(); g.restore(); }
    g.restore();
    // weekly accuracy, eight weeks
    g.save(); plate(186, 22, 156, 108, S(t - 0.15, 14));
    const acc = [0.64, 0.6, 0.67, 0.63, 0.69, 0.62, 0.66, 0.68], lx = (i) => 202 + i * 18, ly = (v) => 112 - (v - 0.5) * 300, front = smooth(0.95, 2.0, t) * 7;
    g.save(); g.setLineDash([3, 4]); g.strokeStyle = alpha('#9CA3AF', 0.55); g.lineWidth = 1; g.beginPath(); g.moveTo(198, ly(0.65)); g.lineTo(330, ly(0.65)); g.stroke(); g.restore();
    g.save(); g.strokeStyle = C.accent; g.lineWidth = 2.4; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= Math.floor(front); i++) (i ? g.lineTo : g.moveTo).call(g, lx(i), ly(acc[i]));
    const n = Math.floor(front); if (n < 7) g.lineTo(lerp(lx(n), lx(n + 1), front - n), lerp(ly(acc[n]), ly(acc[n + 1]), front - n)); g.stroke(); g.restore();
    for (let i = 0; i <= n; i++) circle(g, lx(i), ly(acc[i]), i === 7 ? 4.5 : 2.6, i === 7 ? C.accent : alpha(C.accent, 0.7));
    g.restore();
    // skills: the weakest one, singled out
    g.save(); plate(18, 140, 324, 120, S(t - 0.3, 14));
    const vals = [0.82, 0.68, 0.74, 0.46], FOCUS = 3.0, fk = smooth(FOCUS, FOCUS + 0.35, t);
    M.CATS.forEach((cat, i) => {
      const y = 162 + i * 25, k = S(t - 1.7 - i * 0.12, 12), weak = i === 3;
      g.save(); if (!weak) g.globalAlpha *= 1 - 0.55 * fk;
      circle(g, 36, y, 6, cat.color); rr(g, 50, y - 5, 196, 10, 5); g.fillStyle = alpha(ink, 0.08); g.fill();
      if (k > 0) { rr(g, 50, y - 5, Math.max(10, 196 * vals[i] * k), 10, 5); g.fillStyle = cat.color; g.fill(); }
      g.restore();
      if (weak && fk > 0) {
        g.save(); g.globalAlpha *= fk; g.strokeStyle = cat.color; g.lineWidth = 2; rr(g, 26, y - 11, 228, 22, 11); g.stroke(); g.restore();
        const pk = S(t - FOCUS - 0.3, 16); if (pk > 0) { g.save(); g.translate(296, y); g.scale(pk, pk); rr(g, -32, -12, 64, 24, 12); g.fillStyle = cat.color; g.fill();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-5, -6); g.lineTo(7, 0); g.lineTo(-5, 6); g.closePath(); g.fill(); g.restore(); }
      }
    });
    g.restore();
  } });

  /* =========================================================================================================
     widgets · «Tu próxima sesión, más cerca»: today's review card shrinks into a widget on the Home Screen (added by
     the user, never by the app); a tap opens the line on the board and the answer is played (3.Bc4). */
  M.define('widgets', { dur: 6, still: 4.9, speed: 1.2, draw(g, t, e) {
    const { th } = e, ink = th.dark ? '#FFFFFF' : '#111827', SHRINK = 1.3, TAP = 2.6, OPEN = 2.95;
    g.globalAlpha = smooth(0, 0.25, t) * (1 - smooth(5.45, 5.95, t));
    const phone = { x: 26, y: 12, w: 140, h: 256 }, pk = smooth(SHRINK - 0.2, SHRINK + 0.25, t);
    const icon = 28, gap = 12, ix = phone.x + 16, iy = phone.y + 34, slot = (c, r) => ({ x: ix + c * (icon + gap), y: iy + r * (icon + gap) });
    // the Home Screen
    if (pk > 0) {
      g.save(); g.globalAlpha *= pk; rr(g, phone.x, phone.y, phone.w, phone.h, 28); g.fillStyle = th.dark ? '#0B1120' : '#F3F4F6'; g.fill();
      g.lineWidth = 2; g.strokeStyle = th.skel; g.stroke();
      const tints = [C.helio, C.carrot, C.froly, C.ok, C.accentLight, C.gold, C.pink, C.violet, C.helio, C.ok, C.carrot];
      const cells = [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [0, 3], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4]];
      cells.forEach(([c, r], i) => { const k = S(t - SHRINK - 0.15 - i * 0.04, 16), s = slot(c, r), z = icon * clamp(k);
        rr(g, s.x + (icon - z) / 2, s.y + (icon - z) / 2, z, z, 8); g.fillStyle = alpha(tints[i], 0.85); g.fill(); });
      g.restore();
    }
    // the review card → the 2 × 2 widget
    const sk = S(t - SHRINK, 10), big = { x: 100, y: 74, w: 160, h: 132 }, w0 = slot(0, 0), small = { x: w0.x, y: w0.y, w: icon * 2 + gap, h: icon * 2 + gap };
    const press = 1 - 0.07 * bump(t, TAP, 0.16, 30), k0 = S(t - 0.1, 14);
    const r = { x: lerp(big.x, small.x, sk), y: lerp(big.y, small.y, sk), w: lerp(big.w, small.w, sk), h: lerp(big.h, small.h, sk) }, z = r.w / big.w;
    g.save(); g.globalAlpha *= clamp(k0 * 1.3); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(press, press); g.translate(-r.x - r.w / 2, -r.y - r.h / 2);
    g.translate(0, 16 * (1 - k0));
    rr(g, r.x, r.y, r.w, r.h, lerp(20, 14, sk)); g.fillStyle = th.surface; g.fill();
    g.save(); g.translate(r.x, r.y); g.scale(z, z);
    circle(g, 28, 28, 15, alpha(C.accent, 0.22)); draw(g, M.piece('wN'), 17, 17, 22, 22); // the repertoire's knight
    text(g, '3', 18, 96, font(800, 48), th.text);
    rr(g, 60, 66, 80, 7, 3.5); g.fillStyle = alpha(ink, 0.4); g.fill(); rr(g, 60, 82, 56, 7, 3.5); g.fillStyle = alpha(ink, 0.2); g.fill();
    for (let i = 0; i < 3; i++) circle(g, 24 + i * 14, 116, 4.5, i === 0 ? C.accent : th.skel);
    g.restore(); g.restore();
    // tap
    const rk = (t - TAP) / 0.45; if (rk > 0 && rk < 1) { g.save(); g.globalAlpha *= (1 - rk) * 0.6; g.strokeStyle = th.text; g.lineWidth = 2.5; circle(g, small.x + small.w / 2, small.y + small.h / 2, 10 + 30 * rk); g.stroke(); g.restore(); }
    // the line on the board
    const ok = S(t - OPEN, 11);
    if (ok > 0) {
      const dest = { x: 186, y: 50, w: 156, h: 180 }, rx = lerp(small.x, dest.x, ok), ry = lerp(small.y, dest.y, ok), rw = lerp(small.w, dest.w, clamp(ok)), rh = lerp(small.h, dest.h, clamp(ok));
      g.save(); g.globalAlpha *= clamp(ok * 1.5); rr(g, rx, ry, rw, rh, 16); g.fillStyle = th.surface; g.fill();
      const sq = 17 * (rw / dest.w); g.beginPath(); g.rect(rx, ry, rw, rh); g.clip();
      playBoard(g, t, rx + (rw - sq * 8) / 2, ry + 12 * (rh / dest.h), sq, 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R', [['f1', 'c4', 3.75]], th);
      g.restore();
      const ck = S(t - 4.0, 18); checkBadge(g, dest.x + dest.w / 2, dest.y + dest.h - 18, 11, ck);
    }
  } });

  /* =========================================================================================================
     runtime: one requestAnimationFrame for every visible canvas */
  const live = new Set();
  const vis = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((x) => (x.target._visible = x.isIntersecting)), { rootMargin: '200px' }) : null;
  M.mount = (cv) => {
    if (cv._motion) return; const def = M.scenes[cv.dataset.scene]; if (!def) return;
    let opts = {}; try { opts = JSON.parse(cv.dataset.opts || '{}'); } catch (err) {}
    cv._motion = { def, opts, t0: performance.now() - Math.random() * 400 }; cv._visible = true; live.add(cv); if (vis) vis.observe(cv);
    if (M.wake) M.wake();
  };
  M.render = (cv, t) => {
    const { def, opts } = cv._motion, dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d'), [bw, bh] = def.box, s = Math.min(w / bw, h / bh) * dpr;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.globalAlpha = 1; g.filter = 'none';
    g.setTransform(s, 0, 0, s, (cv.width - bw * s) / 2, (cv.height - bh * s) / 2);
    const sch = (cv.closest('[data-scheme]') || {}).dataset; const th = M.theme(sch ? sch.scheme : 'dark');
    def.draw(g, t, { th, opts });
  };
  /* A fixed frame (?motion=…, Reduce Motion) is redrawn for a moment, until the images load, and then stops: headless
     captures with a virtual time budget never finish while a requestAnimationFrame loop is running. */
  const fixedFrames = M.fixed != null || reduce;
  let stopAt = performance.now() + 1500;
  const frame = (now) => {
    live.forEach((cv) => {
      if (!cv.isConnected) { live.delete(cv); return; }
      if (!cv._visible && !fixedFrames) return;
      const d = cv._motion.def, loop = d.dur / d.speed, t = M.fixed === 'still' || (reduce && M.fixed == null) || cv._motion.opts.still ? d.still : M.fixed != null ? M.fixed % d.dur : ((((now - cv._motion.t0) / 1000) % loop) * d.speed);
      M.render(cv, t);
    });
    if (!fixedFrames || now < stopAt) requestAnimationFrame(frame); else M.idle = true;
  };
  M.wake = () => { if (M.idle) { M.idle = false; stopAt = performance.now() + 1500; requestAnimationFrame(frame); } };
  const scan = (root) => (root.querySelectorAll ? root.querySelectorAll('canvas.mc-motion') : []).forEach(M.mount);
  const start = () => { scan(document); new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && (n.matches('canvas.mc-motion') ? M.mount(n) : scan(n))))).observe(document.body, { childList: true, subtree: true }); requestAnimationFrame(frame); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  M.canvas = (scene, opts, style = '') => `<canvas class="mc-motion" data-scene="${scene}"${opts ? ` data-opts='${JSON.stringify(opts)}'` : ''} style="display:block;width:100%;height:100%;${style}"></canvas>`;
})();
