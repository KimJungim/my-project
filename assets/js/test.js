const sectionPin = document.querySelector("#section-pin");
const pinWrap = document.querySelector(".pin-wrap");
const compWorkflow = document.querySelector(".comp-workflow");
const compMindset = document.querySelector(".comp-mindset");

const mindsetPanels = compMindset?.children.length || 3;
const mindsetScrollWidth = window.innerWidth * mindsetPanels;
const workflowScrollHeight = compWorkflow.offsetHeight;
const totalScrollLength = workflowScrollHeight + mindsetScrollWidth;

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: sectionPin,
    start: "top top",
    end: "+=" + totalScrollLength,
    scrub: true,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  },
});

// 1. 세로 스크롤 동안 y 이동
tl.to(pinWrap, {
  y: () => -workflowScrollHeight + window.innerHeight,
  ease: "none",
});

// ✅ 2. y 다시 복귀 (아래로 내려오게 함)
tl.to(pinWrap, {
  y: 0,
  ease: "none",
});

// 3. 가로 스크롤 시 전체 pin-wrap을 x로 이동
tl.to(pinWrap, {
  x: () => -mindsetScrollWidth,
  ease: "none",
});