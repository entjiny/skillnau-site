/* =========================
   공통 인터랙션 스크립트 (v2 의존 제거)
========================= */

// DOM 도우미
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

// FAQ 아코디언
$$('.faq-question').forEach(btn => {
  on(btn, 'click', () => {
    const item = btn.parentElement;
    item && item.classList.toggle('active');
  });
});

// 모바일 메뉴 내 anchor 클릭 시 이동+닫힘
$$('.mobile-menu nav a').forEach(link => {
  on(link, 'click', e => {
    const hash = link.hash;
    if (hash && $(hash)) {
      e.preventDefault();
      $(hash).scrollIntoView({ behavior: 'smooth' });
    }
    closeMobileMenu();
  });
});

// 메뉴 열기/닫기
on($('.hamburger'), 'click', () => {
  $('.mobile-menu-overlay')?.classList.add('active');
  document.body.classList.add('menu-open');
  document.body.style.overflow = 'hidden';
});
on($('.close-menu'), 'click', closeMobileMenu);
on($('.mobile-menu-backdrop'), 'click', closeMobileMenu);

function closeMobileMenu() {
  $('.mobile-menu-overlay')?.classList.remove('active');
  document.body.classList.remove('menu-open');
  setTimeout(() => (document.body.style.overflow = ''), 350);
}

// 헤더 로고 클릭 시 페이지 상단으로 부드럽게 이동
on($('.logo a'), 'click', e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// 강제 가로 스크롤 방지
on(window, 'DOMContentLoaded', () => {
  document.body.style.overflowX = 'hidden';
});

// 빈 링크(#) 클릭 방지
$$('.pf-card[href="#"]').forEach(a => on(a, 'click', e => e.preventDefault()));

/* =========================
   리뷰 슬라이더 (드래그 스크러빙)
   - v2 가드 제거, 존재할 때만 자동 초기화
========================= */
(function () {
  function initReviewSlider(root) {
    const viewport = $('.slider-viewport', root);
    const track    = $('.slider-track', root);
    if (!viewport || !track) return;

    let isDown = false, startX = 0, startT = 0, current = 0;

    const bounds = () => {
      const vw = viewport.clientWidth;
      const tw = track.scrollWidth;
      const min = Math.min(vw - tw, 0);
      return { min, max: 0 };
    };

    const setX = (x, withTransition = false) => {
      const { min, max } = bounds();
      current = Math.max(min, Math.min(max, x));
      track.style.transition = withTransition ? 'transform .25s ease' : 'none';
      track.style.transform  = `translate3d(${current}px,0,0)`;
    };

    const clientX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);

    const onDown = (e) => {
      isDown = true;
      startX = clientX(e);
      const t = getComputedStyle(track).transform;
      startT = (t && t !== 'none') ? parseFloat(t.split(',')[4]) : 0;
      viewport.classList.add('dragging');
      track.style.cursor = 'grabbing';
    };

    const onMove = (e) => {
      if (!isDown) return;
      const x = clientX(e);
      setX(startT + (x - startX));
      if (e.cancelable) e.preventDefault();
    };

    const onUp = () => {
      if (!isDown) return;
      isDown = false;
      viewport.classList.remove('dragging');
      track.style.cursor = 'grab';
      setX(current, true);
    };

    track.style.cursor = 'grab';
    on(track, 'mousedown', onDown);
    on(track, 'touchstart', onDown, { passive: true });
    on(window, 'mousemove', onMove, { passive: false });
    on(window, 'touchmove', onMove, { passive: false });
    on(window, 'mouseup', onUp);
    on(window, 'touchend', onUp);
    on(viewport, 'mouseleave', onUp);
    on(window, 'resize', () => setX(current, true));

    // 초기 위치
    setX(0, true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // v2 여부와 무관하게, 존재할 때만 초기화
    $$('.review-slider').forEach(initReviewSlider);

    // 공용 CTA 트래킹 (있을 때만)
    $$('.cta-btn').forEach(btn => {
      on(btn, 'click', () => {
        window.gtag?.('event', 'lead_submit', { section: 'hero' });
      });
    });

    console.log('main.js loaded ✅ (v2 제거)');
  });
})();

