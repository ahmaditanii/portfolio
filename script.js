// Ahmad Itani — small enhancements. The site works without this file.
document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Footer year
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// Reveal sections as they scroll into view
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* ---------------------------------------------------------
   Hero card stack: gentle 3D tilt that follows the mouse
   --------------------------------------------------------- */
const stack = document.getElementById('hero-stack');
if (stack && !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const area = stack.parentElement;
  area.addEventListener('pointermove', (e) => {
    const r = area.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    stack.style.setProperty('--tilt-y', (x * 12).toFixed(2) + 'deg');
    stack.style.setProperty('--tilt-x', (-y * 10).toFixed(2) + 'deg');
  });
  area.addEventListener('pointerleave', () => {
    stack.style.setProperty('--tilt-y', '0deg');
    stack.style.setProperty('--tilt-x', '0deg');
  });
}

/* ---------------------------------------------------------
   Hero ID card: role glitches between
   "Cloud Core Engineer" and "Growth Operator".
   The text decodes letter by letter while the photo
   splits and a scanline sweeps the card.
   --------------------------------------------------------- */
const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEFXYZ';
const esc = (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c);

// Morph el's text into `to` over ~`dur` ms, each letter settling at its own moment
const scramble = (el, to, dur = 620) => {
  if (el._raf) cancelAnimationFrame(el._raf);
  const from = el.textContent;
  const len = Math.max(from.length, to.length);
  const queue = [];
  for (let i = 0; i < len; i++) {
    const start = Math.random() * dur * 0.35;
    const end = start + dur * (0.35 + Math.random() * 0.3);
    queue.push({ from: from[i] || '', to: to[i] || '', start, end, ch: '' });
  }
  const t0 = performance.now();
  const tick = (now) => {
    const t = now - t0;
    let out = '', done = 0;
    for (const q of queue) {
      if (t >= q.end) { done++; out += esc(q.to); }
      else if (t >= q.start) {
        if (!q.ch || Math.random() < 0.28) q.ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        out += `<span class="g">${esc(q.ch)}</span>`;
      } else out += esc(q.from);
    }
    el.innerHTML = out;
    if (done < queue.length) el._raf = requestAnimationFrame(tick);
    else el.textContent = to;
  };
  el._raf = requestAnimationFrame(tick);
};

if (stack) {
  const labels = [...stack.querySelectorAll('.scr')];
  let alt = false, glitchTimer;
  const setAlt = (on) => {
    if (alt === on) return;
    alt = on;
    stack.classList.toggle('is-alt', on);
    labels.forEach((el) => {
      const to = on ? el.dataset.b : el.dataset.a;
      if (reduceMotion) el.textContent = to; else scramble(el, to);
    });
    if (reduceMotion) return;
    stack.classList.remove('glitching');
    void stack.offsetWidth;                  // restart the CSS glitch even mid-animation
    stack.classList.add('glitching');
    clearTimeout(glitchTimer);
    glitchTimer = setTimeout(() => stack.classList.remove('glitching'), 650);
  };
  if (window.matchMedia('(hover: hover)').matches) {
    stack.addEventListener('pointerenter', () => setAlt(true));
    stack.addEventListener('pointerleave', () => setAlt(false));
  } else {
    // Phones: flip every few seconds, or on tap
    const flip = () => setAlt(!alt);
    let cycle = setInterval(flip, 3600);
    stack.addEventListener('click', () => { clearInterval(cycle); flip(); cycle = setInterval(flip, 3600); });
  }
}

/* ---------------------------------------------------------
   Career deck: drag/swipe the top card away; it flies off,
   then tucks in at the back of the pile.
   --------------------------------------------------------- */
const deck = document.getElementById('deck');
if (deck) {
  const cards = [...deck.querySelectorAll('.job')];
  const n = cards.length;
  let order = cards.map((_, i) => i);        // order[0] is the top card
  let busy = false;

  const count = document.getElementById('deck-count');
  const indexBtns = [...document.querySelectorAll('#deck-index [data-go]')];
  const pad = (v) => String(v).padStart(2, '0');

  // Resting pose for a card at depth k (0 = top)
  const pose = (k) => {
    if (k === 0) return 'translate3d(0,0,0) rotate(0deg) scale(1)';
    const tilt = k % 2 ? 2.4 : -2.4;
    return `translate3d(0, ${k * 18}px, 0) rotate(${tilt}deg) scale(${1 - k * 0.05})`;
  };

  const layout = () => {
    order.forEach((ci, k) => {
      const c = cards[ci];
      c.style.zIndex = String(n - k);
      c.style.transform = pose(k);
      c.style.opacity = k > 2 ? '0' : '1';
      c.classList.toggle('is-top', k === 0);
      c.setAttribute('aria-hidden', k === 0 ? 'false' : 'true');
      c.inert = k !== 0;
    });
    const top = order[0];
    if (count) count.textContent = `${pad(top + 1)} / ${pad(n)}`;
    indexBtns.forEach((b) => b.setAttribute('aria-current', String(Number(b.dataset.go) === top)));
  };

  // Throw the top card off-screen, then slide it to the back
  const next = (dir = -1, speed = 1) => {
    if (busy) return;
    busy = true;
    const card = cards[order[0]];
    card.classList.remove('dragging');
    card.style.transition = `transform ${0.42 / speed}s cubic-bezier(.3,.6,.4,1), opacity .3s ease`;
    card.style.transform = `translate3d(${dir * 135}%, -4%, 0) rotate(${dir * 20}deg)`;
    setTimeout(() => {
      order.push(order.shift());
      card.style.transition = '';            // back to the CSS ease for the tuck-in
      card.style.zIndex = '0';
      layout();
      setTimeout(() => { busy = false; }, 120 / speed);
    }, 360 / speed);
  };

  // Bring the bottom card back on top, coming in from the side
  const prev = () => {
    if (busy) return;
    busy = true;
    const ci = order[n - 1];
    const card = cards[ci];
    card.style.transition = 'none';
    card.style.zIndex = String(n + 1);
    card.style.opacity = '1';
    card.style.transform = 'translate3d(-135%, -4%, 0) rotate(-20deg)';
    card.getBoundingClientRect();            // apply the start position before animating
    card.style.transition = '';
    order.unshift(order.pop());
    layout();
    setTimeout(() => { busy = false; }, 450);
  };

  const goTo = (target) => {
    const steps = order.indexOf(target);
    if (steps <= 0) return;
    let i = 0;
    const step = () => {
      if (i++ >= steps) return;
      next(-1, 1.8);
      setTimeout(step, 280);
    };
    step();
  };

  // Dragging
  let drag = null;
  deck.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.job');
    if (!card || busy || card !== cards[order[0]]) return;
    if (e.target.closest('button, a')) return;   // let buttons inside the card work normally
    if (e.button !== undefined && e.button !== 0) return;
    drag = { card, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, dy: 0, id: e.pointerId };
    card.setPointerCapture(e.pointerId);
    card.classList.add('dragging');
  });

  deck.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    const rot = drag.dx * 0.07;
    drag.card.style.transform = `translate3d(${drag.dx}px, ${drag.dy * 0.2}px, 0) rotate(${rot}deg)`;

    // The card underneath rises as you pull
    const p = Math.min(Math.abs(drag.dx) / 160, 1);
    const under = cards[order[1]];
    if (under) {
      under.style.transition = 'none';
      under.style.transform = `translate3d(0, ${18 * (1 - p)}px, 0) rotate(${2.4 * (1 - p)}deg) scale(${0.95 + 0.05 * p})`;
    }
  });

  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, dx } = drag;
    const dt = Math.max(performance.now() - drag.t, 1);
    const v = dx / dt;                        // px per ms
    drag = null;
    card.classList.remove('dragging');
    const under = cards[order[1]];
    if (under) under.style.transition = '';
    if (Math.abs(dx) > 110 || Math.abs(v) > 0.6) {
      next(Math.sign(dx) || -1, Math.min(Math.max(Math.abs(v), 1), 2));
    } else {
      layout();                               // not far enough: spring back
    }
  };
  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);

  // Buttons, keys, index
  document.getElementById('deck-next')?.addEventListener('click', () => next(-1));
  document.getElementById('deck-prev')?.addEventListener('click', prev);
  deck.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(-1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });
  indexBtns.forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.go))));

  layout();
}

/* ---------------------------------------------------------
   Huawei project timeline: bars placed by date, so the
   current project keeps growing as the months pass.
   --------------------------------------------------------- */
const gantt = document.getElementById('huawei-timeline');
if (gantt) {
  const toMonths = (v) => {
    if (v === 'now') { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); }
    const [y, m] = v.split('-').map(Number);
    return y * 12 + (m - 1);
  };
  const from = toMonths(gantt.dataset.from);
  const to = Math.max(toMonths('now'), from + 1);
  const pct = (m) => (Math.min(Math.max((m - from) / (to - from), 0), 1) * 100).toFixed(1) + '%';
  gantt.querySelectorAll('.g-bar').forEach((bar) => {
    bar.style.left = pct(toMonths(bar.dataset.start));
    bar.style.right = (100 - parseFloat(pct(toMonths(bar.dataset.end)))).toFixed(1) + '%';
  });
  gantt.querySelectorAll('[data-year]').forEach((t) => {
    const y = Number(t.dataset.year);
    t.style.left = y * 12 <= from ? '0' : pct(y * 12);
  });
  // Summary / Timeline switch; bars draw in each time the timeline opens
  const tabs = [...document.querySelectorAll('.hw-switch [role="tab"]')];
  const show = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.classList.toggle('is-on', on);
      panel.inert = !on;
    });
    gantt.classList.remove('drawn');
    if (tab.id === 'hw-tab-time') {
      if (reduceMotion) gantt.classList.add('drawn');
      else requestAnimationFrame(() => requestAnimationFrame(() => gantt.classList.add('drawn')));
    }
  };
  tabs.forEach((t) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation();       // don't also flip the deck
      const next = tabs[(tabs.indexOf(t) + 1) % tabs.length];
      next.focus(); show(next);
    });
  });
  if (tabs.length) show(tabs[0]);
}

/* ---------------------------------------------------------
   "What I bring" folders: tabs bring a folder forward;
   the card's color slides and the content swaps in
   --------------------------------------------------------- */
const folders = document.querySelector('.folders');
if (folders) {
  const tabs = [...folders.querySelectorAll('.fd-tab')];
  const panel = folders.querySelector('.fd-panel');
  const body = folders.querySelector('.fd-body');
  let current = folders.dataset.k, swapTimer;
  const select = (tab, focus) => {
    const k = tab.dataset.k;
    tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    if (focus) tab.focus();
    if (k === current) return;
    current = k;
    folders.dataset.k = k;                      // color theme slides via CSS
    panel.setAttribute('aria-labelledby', tab.id);
    const fill = () => { body.replaceChildren(document.getElementById('fd-' + k).content.cloneNode(true)); };
    clearTimeout(swapTimer);
    if (reduceMotion) { fill(); return; }
    body.classList.remove('is-in');
    body.classList.add('is-out');               // old content fades out quickly
    swapTimer = setTimeout(() => {
      const from = panel.offsetHeight;
      panel.getAnimations().forEach((a) => a.cancel());
      fill();
      body.classList.remove('is-out');
      const to = panel.offsetHeight;
      void body.offsetWidth;                    // restart the entrance animation
      body.classList.add('is-in');              // new content rises in, one piece after another
      if (Math.abs(to - from) > 1) {            // the card eases to its new height instead of jumping
        panel.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 480, easing: 'cubic-bezier(.33,1,.68,1)' });
      }
    }, 180);
  };
  tabs.forEach((t, i) => {
    t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
}

/* ---------------------------------------------------------
   Research & credentials: swipeable cards with arrows,
   a counter and chips that jump to each type
   --------------------------------------------------------- */
const crTrack = document.getElementById('cr-track');
if (crTrack) {
  const cards = [...crTrack.querySelectorAll('.cr')];
  const count = document.getElementById('cr-count');
  const chips = [...document.querySelectorAll('.cr-filters [data-go]')];
  const pad = (v) => String(v).padStart(2, '0');
  const current = () => {
    const x = crTrack.scrollLeft;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - crTrack.offsetLeft - x); if (d < dist) { dist = d; best = i; } });
    // at the far end, the last card counts as current
    if (crTrack.scrollLeft + crTrack.clientWidth >= crTrack.scrollWidth - 4) best = cards.length - 1;
    return best;
  };
  // the selection pill moves like a drop of water. Each edge is a spring:
  // the front edge is quick, the tail is softer, so it stretches, then gathers itself.
  const drop = document.querySelector('.cr-drop');
  let lastChip = null, lockDrop = false, lockT;
  const sp = { l: 0, r: 0, vl: 0, vr: 0, tl: 0, tr: 0, top: 0, h: 40, on: false, init: false };
  const draw = () => {
    const w = Math.max(0, sp.r - sp.l), tw = sp.tr - sp.tl;
    const stretch = Math.min(1, Math.max(0, (w - tw) / 120));
    drop.style.width = w + 'px';
    drop.style.transform = `translate3d(${sp.l}px, ${sp.top}px, 0) scaleY(${1 - stretch * 0.22})`;
  };
  const step = () => {
    const goingRight = sp.tl >= sp.l;
    const kL = goingRight ? 0.06 : 0.11, kR = goingRight ? 0.11 : 0.06, damp = 0.7;
    sp.vl = (sp.vl + (sp.tl - sp.l) * kL) * damp; sp.l += sp.vl;
    sp.vr = (sp.vr + (sp.tr - sp.r) * kR) * damp; sp.r += sp.vr;
    draw();
    const still = Math.abs(sp.tl - sp.l) < 0.3 && Math.abs(sp.tr - sp.r) < 0.3 && Math.abs(sp.vl) < 0.05 && Math.abs(sp.vr) < 0.05;
    if (still) { sp.l = sp.tl; sp.r = sp.tr; draw(); sp.on = false; } else requestAnimationFrame(step);
  };
  const moveDrop = (chip, force) => {
    if (!drop || !chip || (chip === lastChip && !force)) return;
    sp.tl = chip.offsetLeft; sp.tr = chip.offsetLeft + chip.offsetWidth;
    sp.top = chip.offsetTop; drop.style.height = chip.offsetHeight + 'px';
    if (!sp.init || force || reduceMotion) {
      sp.l = sp.tl; sp.r = sp.tr; sp.vl = sp.vr = 0; sp.init = true; draw();
    } else if (!sp.on) { sp.on = true; requestAnimationFrame(step); }
    lastChip = chip;
  };
  const go = (i) => {
    const c = cards[Math.max(0, Math.min(cards.length - 1, i))];
    crTrack.scrollTo({ left: c.offsetLeft - crTrack.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const update = () => {
    const i = current();
    if (count) count.textContent = `${pad(i + 1)} / ${pad(cards.length)}`;
    const type = cards[i].dataset.type;
    chips.forEach((b) => b.classList.toggle('is-on', b.dataset.go === type));
    if (!lockDrop) moveDrop(chips.find((b) => b.dataset.go === type));
  };
  document.getElementById('cr-prev')?.addEventListener('click', () => go(current() - 1));
  document.getElementById('cr-next')?.addEventListener('click', () => go(current() + 1));
  chips.forEach((b) => b.addEventListener('click', () => {
    lockDrop = true; moveDrop(b);
    clearTimeout(lockT); lockT = setTimeout(() => { lockDrop = false; update(); }, 1000);
    go(cards.findIndex((c) => c.dataset.type === b.dataset.go));
  }));
  crTrack.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(current() - 1); }
  });
  let raf;
  crTrack.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', () => { update(); moveDrop(lastChip, true); });
  update();
}
