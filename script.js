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
   "Cloud Core Engineer" and "Growth Operator"
   --------------------------------------------------------- */
if (stack) {
  let glitchTimer;
  const setAlt = (on) => {
    if (stack.classList.contains('is-alt') === on) return;
    stack.classList.add('glitching');
    // swap the text halfway through the glitch, so the change hides inside the noise
    setTimeout(() => stack.classList.toggle('is-alt', on), reduceMotion ? 0 : 180);
    clearTimeout(glitchTimer);
    glitchTimer = setTimeout(() => stack.classList.remove('glitching'), 480);
  };
  if (window.matchMedia('(hover: hover)').matches) {
    stack.addEventListener('pointerenter', () => setAlt(true));
    stack.addEventListener('pointerleave', () => setAlt(false));
  } else {
    // Phones: flip every few seconds, or on tap
    let alt = false;
    const flip = () => { alt = !alt; setAlt(alt); };
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
