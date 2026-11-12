// Ahmad Itani — small enhancements. The site works without this file.
document.documentElement.classList.add('js');

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

// Career scroller arrows
const scroller = document.getElementById('job-scroller');
const arrows = document.querySelectorAll('.arrow');
if (scroller && arrows.length) {
  const step = () => {
    const card = scroller.querySelector('.job');
    return card ? card.getBoundingClientRect().width + 18 : 340;
  };
  const update = () => {
    const max = scroller.scrollWidth - scroller.clientWidth - 2;
    arrows.forEach((a) => {
      const dir = Number(a.dataset.dir);
      a.disabled = dir < 0 ? scroller.scrollLeft <= 2 : scroller.scrollLeft >= max;
    });
    // Hide arrows entirely when everything fits
    const fits = scroller.scrollWidth <= scroller.clientWidth + 2;
    arrows[0].parentElement.style.visibility = fits ? 'hidden' : 'visible';
  };
  arrows.forEach((a) => a.addEventListener('click', () => {
    scroller.scrollBy({ left: Number(a.dataset.dir) * step(), behavior: 'smooth' });
  }));
  scroller.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
