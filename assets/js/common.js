document.addEventListener("DOMContentLoaded", function () {
  if (typeof Lenis === "undefined") return;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: true,
  });

  window.lenis = lenis;

  // GSAP와 연결
  lenis.on('scroll', ScrollTrigger.update);

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  

  // 네비게이션 부드러운 이동
  document.querySelectorAll('.main-logo').forEach(link => {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      lenis.scrollTo("#comp-keyword", {
        duration: 1.5,
        easing: (t) => 1 - Math.pow(1 - t, 3)
      });
    });
  });

  // Lenis 기반 내부 앵커 링크 스크롤 처리
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();

      if (window.lenis?.isStopped) {
        window.lenis.start();
      }

      window.lenis.scrollTo(targetEl, {
        duration: 1.5,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        onComplete: () => {
          if (targetId === "#comp-skills") {
            const compSkillSection = document.querySelector("#comp-skills");
            const compSkillTrigger = ScrollTrigger.getById("comp-skill-pin");

            if (compSkillSection && compSkillTrigger) {
              e.preventDefault();

              // Step 1: 먼저 세로 스크롤로 comp-skill 섹션 상단까지 이동
              window.lenis.scrollTo(compSkillSection, {
                duration: 1.5,
                easing: (t) => 1 - Math.pow(1 - t, 3),
                onComplete: () => {
                  // Step 2: 도달 후, 가로 스크롤 애니메이션을 0으로 이동
                  const timeline = compSkillTrigger.animation;
                  if (timeline) {
                    gsap.to(timeline, {
                      progress: 0,
                      duration: 1,
                      ease: "power2.out"
                    });
                  }
                }
              });
            }
          }
        }
      });
    });
  });

  
  lenis.on("scroll", () => {
    ScrollTrigger.update();

    if (typeof window.timelineScrollHandler === "function") {
      window.timelineScrollHandler();
    }
  });

  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      return arguments.length
        ? window.lenis.scrollTo(value)
        : window.lenis.scroll.instance.scroll.y;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight
      };
    },
    pinType: document.body.style.transform ? "transform" : "fixed"
  });

});
