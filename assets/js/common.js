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
