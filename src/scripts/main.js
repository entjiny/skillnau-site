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

// 슬라이드/페이드 모션 (섹션 순차 + 되감기 안정화)
/* =========================
   슬라이드/리빌 모션 (reveal 전용)
   - 섹션 보이면 즉시 실행
   - 위로 완전히 벗어나면 되감기(옵션)
   - 요소는 자동 스태거(개별 --delay / data-delay 없을 때)
========================= */
(() => {
  // ===== 옵션 =====
  const REPLAY_ON_SCROLL    = true;   // 위로 완전히 벗어나면 되감기
  const SEQUENTIAL_SECTIONS = false;  // true면 섹션 순차 재생, false면 보이는 즉시
  const SECTION_THRESHOLD   = 0.10;   // 섹션이 이 비율 이상 보이면 play
  const DEFAULT_STAGGER_MS  = 200;    // 자동 스태거 간격
  const SAFETY              = 80;     // 타임아웃 여유

  // 📱 PC/모바일 분기 (rootMargin 차등)
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const ROOT_MARGIN = isMobile ? '0px 0px 20% 0px' : '0px 0px -6% 0px';

  // 섹션이 "완전히 화면 위로" 사라졌는지 (되감기 조건)
  const isFullyAboveViewport = (el) => el.getBoundingClientRect().bottom <= 0;

  // 총 지속시간(ms) 계산: --reveal-dur + --delay(or data-delay)
  const getTotalMs = (el) => {
    const cs        = getComputedStyle(el);
    const dur       = parseFloat(cs.getPropertyValue('--reveal-dur')) || 1500;
    const delayVar  = parseFloat(cs.getPropertyValue('--delay')) || 0;
    const delayAttr = parseFloat(el.dataset.delay || '0') || 0;
    const delay     = Math.max(delayVar, delayAttr);
    return dur + delay + SAFETY;
  };

  // 섹션 내부 .reveal 항목들 재생
  const playSection = (section) => {
    if (section.__played) return;

    const items = [...section.querySelectorAll('.reveal')];
    if (!items.length) { section.__played = true; return; }

    let idx = 0;
    items.forEach(el => {
      // 1) 개별 delay가 없으면 자동 스태거 부여
      if (!el.style.getPropertyValue('--delay') && !el.dataset.delay) {
        el.style.setProperty('--delay', `${idx * DEFAULT_STAGGER_MS}ms`);
      }
      idx++;

      // 2) transition-delay에 반영 (CSS var 또는 data-delay)
      const cs        = getComputedStyle(el);
      const varDelay  = cs.getPropertyValue('--delay').trim();
      const finalDelay= (el.dataset.delay || varDelay || '0ms').trim();
      el.style.transitionDelay = finalDelay;

      // 3) 레이아웃 확정 후 가시화
      void el.getBoundingClientRect();
      el.classList.add('is-visible');

      // 4) 애니메 종료 플래그(호버 등 정상화)
      setTimeout(() => el.classList.add('reveal-done'), getTotalMs(el));
    });

    section.__played = true;
  };

  // 섹션 되감기(위로 완전히 벗어났을 때만)
  const resetSection = (section) => {
    section.querySelectorAll('.reveal').forEach(el => {
      el.classList.remove('is-visible', 'reveal-done');
      // 필요하면 delay 초기화: el.style.transitionDelay = '';
    });
    section.__played = false;
  };

  // 대상 섹션 수집
  const sections = [...document.querySelectorAll('[data-reveal-section]')];
  if (!sections.length) return;

  let nextIndex   = 0;               // (순차 모드일 때) 다음 재생할 섹션 인덱스
  let lastScrollY = window.scrollY;

  const io = new IntersectionObserver((entries) => {
    const currentY    = window.scrollY;
    const scrollingUp = currentY < lastScrollY;
    lastScrollY       = currentY;

    entries.forEach(entry => {
      const section = entry.target;
      const index   = sections.indexOf(section);

      // 보이면 재생 (순차 모드면 index 체크)
      if (entry.isIntersecting && entry.intersectionRatio >= SECTION_THRESHOLD) {
        if (!SEQUENTIAL_SECTIONS || index === nextIndex) {
          playSection(section);
          nextIndex = Math.min(nextIndex + 1, sections.length - 1);
        }
        return;
      }

      // 되감기: 위로 스크롤 + 섹션이 완전히 화면 위로 나감
      if (REPLAY_ON_SCROLL && scrollingUp && section.__played && isFullyAboveViewport(section)) {
        resetSection(section);
        nextIndex = Math.min(nextIndex, index); // 포인터 되감기
      }
    });
  }, {
    threshold: [0, SECTION_THRESHOLD, 1],
    rootMargin: ROOT_MARGIN
  });

  sections.forEach(sec => io.observe(sec));
})();



