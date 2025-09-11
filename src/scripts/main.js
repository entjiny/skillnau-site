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


// 스크롤 들어오면 부드럽게 카운트업 //
(() => {
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  // " +250 ", "97%", "72%" 처럼 적힌 기존 텍스트를
  // [prefix][숫자][suffix]로 분리해주는 파서
// 교체 버전
function parseParts(raw) {
  const s = String(raw).trim();
  // prefix(비숫자) / sign(+, -) / 정수 / 소수 / suffix(비숫자)
  const m = s.match(/^(\D*?)([+-]?)(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d+))?(\D*)$/);
  if (!m) return { prefix: "", value: 0, decimals: 0, suffix: "" };

  const [, pre, sign, intPart, fracPart, suf] = m;
  const base = Number((intPart || "0").replaceAll(",", "") + (fracPart ? "." + fracPart : ""));
  const decimals = (fracPart || "").length;

  // 숫자 값은 부호 반영
  const value = sign === "-" ? -base : base;

  // 시각적 '+'는 prefix로 붙여서 유지
  const prefix = (pre || "") + (sign === "+" ? "+" : "");

  return {
    prefix,
    value,
    decimals,
    suffix: suf || ""
  };
}


  function formatNumber(value, decimals) {
    return Number(value.toFixed(decimals))
      .toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function animateCount(el) {
    // 우선 HTML에 data-target이 있으면 그 값을 우선, 없으면 기존 텍스트를 파싱
    const hasAttr = el.hasAttribute("data-target");
    const { prefix, value: parsedVal, decimals } = hasAttr ? 
      { prefix: el.dataset.prefix || "", value: parseFloat(el.dataset.target || "0"), decimals: parseInt(el.dataset.decimals || "0", 10) } :
      parseParts(el.textContent);

    const suffix = hasAttr ? (el.dataset.suffix || "") : parseParts(el.textContent).suffix;
    const duration = parseInt(el.dataset.duration || "1200", 10);

    const target = isFinite(parsedVal) ? parsedVal : 0;
    const start = performance.now();
    const startVal = 0;

    // 초기 표시 0으로
    el.textContent = prefix + formatNumber(0, decimals) + suffix;

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      const current = startVal + (target - startVal) * eased;
      el.textContent = prefix + formatNumber(current, decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = prefix + formatNumber(target, decimals) + suffix; // 최종값 고정
    }
    requestAnimationFrame(step);
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    const nums = Array.from(document.querySelectorAll(".stat-num"));
    if (!nums.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      // 모션 최소화 또는 IO 미지원: 즉시 최종값만 표시
      nums.forEach(el => {
        const hasAttr = el.hasAttribute("data-target");
        const parts = hasAttr
          ? { prefix: el.dataset.prefix || "", value: parseFloat(el.dataset.target || "0"), decimals: parseInt(el.dataset.decimals || "0", 10), suffix: el.dataset.suffix || "" }
          : parseParts(el.textContent);
        el.textContent = (parts.prefix || "") + formatNumber(parts.value, parts.decimals || 0) + (parts.suffix || "");
      });
      return;
    }

    const seen = new WeakSet();
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !seen.has(entry.target)) {
          seen.add(entry.target);
          animateCount(entry.target);
        }
      });
    }, { threshold: 0.35 });

    nums.forEach(el => io.observe(el));
  });
})();