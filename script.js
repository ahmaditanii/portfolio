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
