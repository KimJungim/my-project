// 1. scrollRestoration + scrollY 저장
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
  window.addEventListener("beforeunload", () => {
    sessionStorage.setItem("scrollY", window.scrollY);
  });
}
const loadingScreen = document.querySelector(".loading-screen");
const loadingFill = document.querySelector(".loading-screen-fill");

let time = 0;
let loadingStarted = false; // 중복 실행 방지용 변수

function animateScene() {
  if (!loadingFill) return; // `.loading-screen-fill` 요소가 없으면 함수 종료

  loadingFill.style.height = `${time}%`; // 로딩 바 높이 증가

  if (time < 100) {
    time += 1; // 로딩 진행률 증가
    setTimeout(animateScene, 10); // 10ms 간격으로 실행
  } else {
    setTimeout(hideLoader, 500); // 로딩 완료 후 `hideLoader()` 실행
  }
}

function hideLoader() {
  if (!loadingScreen) return;

  // ✅ 먼저 scroll 위치 복원
  const savedY = sessionStorage.getItem("scrollY");
  if (savedY !== null) {
    window.scrollTo(0, parseInt(savedY, 10));
  }

  // ✅ 그 다음에 loading 애니메이션 실행
  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 0.25,
    delay: 0.4,
    onComplete: () => {
      loadingScreen.style.display = "none";
    },
  });
}

// `readystatechange` 이벤트에서 중복 실행 방지
document.addEventListener("readystatechange", (e) => {
  if (!loadingStarted) {
    loadingStarted = true; // ✅ 중복 실행 방지
    animateScene();
  }

  if (e.target.readyState === "loading") {
    time = 31;
  } else if (e.target.readyState === "interactive") {
    time = 72;
  } else if (e.target.readyState === "complete") {
    time = 100;
    setTimeout(hideLoader, 500);
  }
});


// Splitting.js 초기화 후 ScrollTrigger 갱신
document.addEventListener("DOMContentLoaded", () => {
  Splitting();
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll(".project-item").forEach(createScrollRotateTitle);

  setTimeout(() => {
    ScrollTrigger.refresh();
  }, 100);

  const heroHeading = document.querySelector("[data-hero-heading]");

  if (heroHeading) {
    // Splitting.js 실행 (줄 단위)
    const splitText = Splitting({ target: heroHeading, by: "lines" });

    // `.dala-floda-span` 내부 텍스트도 `span.word`로 감싸도록 변경
    document.querySelectorAll(".dala-floda-span").forEach((span) => {
      if (!span.querySelector(".word")) {
        const wordSpan = document.createElement("span");
        wordSpan.classList.add("word");
        wordSpan.textContent = span.textContent.trim();
        span.innerHTML = "";
        span.appendChild(wordSpan);
      }
    });

    // GSAP 애니메이션 실행
    const loadingAnim = gsap.timeline({ duration: 1, delay: 0 });

    if (splitText[0]?.lines?.length > 0) {
      loadingAnim.fromTo(
        splitText[0].lines,
        { yPercent: 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power4.out",
          stagger: { each: 0.16 },
        }
      );
    }

    // 기존 네비게이션 및 화살표 애니메이션 유지
    loadingAnim.from(".nav", { yPercent: -100, ease: "circ.out" }, "<");
    loadingAnim.from(".i-chevron", { yPercent: 100, opacity: 0, ease: "circ.out" }, "<");
  }

  // comp-intro 고정
  ScrollTrigger.matchMedia({
    "(min-width: 768px)": function () {
      if (ScrollTrigger.isTouch !== 1) {
        gsap.timeline({
          scrollTrigger: {
            trigger: ".comp-keyword",
            pin: ".comp-keyword-content",
            start: "top top",
            end: "bottom top",
            pinType: "transform",
          },
        });

        window.addEventListener("resize", function () {
          ScrollTrigger.sort();
          ScrollTrigger.refresh();
        });
      }
    },
  });
    
  const videoPinWrapper = document.querySelector('.video-pin-wrapper');
  const spacer = document.createElement('div');

  spacer.style.height = `${window.innerHeight}px`; // 또는 필요에 따라 계산
  videoPinWrapper.parentElement.insertBefore(spacer, videoPinWrapper.nextSibling);

  // videoTextPin (비디오 고정)
  gsap.timeline({
    scrollTrigger: {
      trigger: ".comp-about",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      pin: ".video-pin-wrapper",
      invalidateOnRefresh: true,
      ignoreMobileResize: true,
    },
  });

  // videoText (비디오 축소 + 텍스트 애니메이션)
  const videoText = gsap.timeline({
    scrollTrigger: {
      trigger: ".comp-about",
      start: "top bottom",
      end: "bottom -=75%",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  // hero-video 축소 애니메이션
  videoText.fromTo(
    ".hero-video",
    { width: () => window.innerWidth, height: () => window.innerHeight },
    {
      width: () => 0,
      height: () => 0,
      scrollTrigger: {
        trigger: ".comp-about",
        start: "top 50%",
        end: "bottom 100%",
        scrub: true,
        ease: "power2.out",
      },
    }
  );

  // Splitting.js 적용 후 텍스트 애니메이션
  const splitWords = document.querySelectorAll("[data-text-fly-heading] .word");
  if (splitWords.length > 0) {
    videoText.fromTo(
      splitWords,
      {
        opacity: 0,
        scale: 2,
        x: gsap.utils.distribute({ base: -75, amount: 75 }),
        y: gsap.utils.distribute({ base: -25, amount: 25 }),
        z: gsap.utils.distribute({ base: 750, amount: 50 }),
      },
      {
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        z: 0,
        ease: "expo.inOut",
        stagger: { each: 0.006, from: "random" },
        scrollTrigger: {
          trigger: ".comp-about",
          start: "top bottom",
          end: "bottom 100%",
          scrub: true,
        },
      }
    );
  }

  // 텍스트 박스 이동 (텍스트 애니메이션 종료 후 실행)
  gsap.to(".text-fly-wrapper", {
    yPercent: -75,
    ease: "power1.inOut",
    scrollTrigger: {
      trigger: ".comp-about",
      start: "bottom 100%", 
      scrub: true,
    },
  });

  // 이미지 Fly-in 효과
  const flyInImages = gsap.utils.toArray(".fly-in-image");
  flyInImages.forEach((image) => {
    gsap.to(image.querySelector(".fly-in-tag"), {
      y: () =>
        (1 - parseFloat(image.getAttribute("data-speed"))) * window.innerHeight,
      scrollTrigger: {
        trigger: image,
        scrub: 0,
        start: "top bottom",
        end: () =>
          `bottom -=${
            (1 - parseFloat(image.getAttribute("data-speed"))) *
            window.innerHeight
          }px`,
        ease: "none",
      },
    });
  });

  // 메뉴 토글 애니메이션
  const menuTl = gsap.timeline({ paused: true });

  document.querySelectorAll(".contact-button").forEach((btn) => {
    btn.onclick = () => {
      menuTl.reversed(!menuTl.reversed());
      document.querySelector(".nav-wrapper").classList.toggle("menu-active");
    };
  });

  menuTl
  .to(".menu", {
    duration: 0.5,
    ease: "power2.inOut",
    height: "100%",
    display: "flex",
  })
  .from(".menu-content", {
    scale: 0.9,
    opacity: 0,
    duration: 0.5,
    ease: "power2.inOut",
  }, "<")
  .to(".hamburger-line.top", {
    rotation: 45,
    duration: 0.5,
    ease: "power2.inOut",
    y: 9,
  }, "<")
  .to(".hamburger-line.bottom", {
    rotation: -45,
    duration: 0.5,
    ease: "power2.inOut",
    y: -9,
  }, "<")
  .to(".hamburger-line.mid", {
    opacity: 0,
    ease: "power2.inOut",
    duration: 0.5,
  }, "<")
  .from(".menu-main-link-text", {
    yPercent: 100,
    duration: 0.5,
    ease: "power2.inOut",
    stagger: {
      each: 0.08,
    },
  }, "<")
  .reverse();

  // career
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const scrollBar = window.outerWidth - document.documentElement.clientWidth;
  const wwWithScroll = ww + scrollBar;
  const diagonal = Math.sqrt(wwWithScroll ** 2 + wh ** 2);
  const txtSize = diagonal * 0.118 * 2;

  const extraHeight = wh * 0.5;
  document.querySelector('.comp-career').style.paddingBottom = `${extraHeight}px`;

  // 초기값 세팅
  gsap.set('.comp-career .circle', { clipPath: 'circle(18%)' });
  gsap.set('.comp-career .circle .txt', { width: txtSize });

  // 원커지기
  const career = gsap.timeline({
    scrollTrigger: {
      trigger: '.comp-career',
      start: 'top+=30vh top',
      end: `+=${extraHeight}`,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    }
  });
  career
    .to('.comp-career .circle', {
      clipPath: 'circle(110%)',
      ease: 'none'
    }, 0)
    .to('.comp-career .circle .txt', {
      // scale: 6.44444,
      scale: 3.2,
      // opacity: 0,
      ease: 'none'
    }, 0);
    gsap.to('.comp-career .circle .txt', {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '.comp-career .pinBx',
        start: 'top top',
        end: 'bottom+=50% center',
        scrub: true
      }
    });

  // 핀 고정
	ScrollTrigger.create({
		trigger:'.comp-career',
		start:'top top',
		endTrigger:'footer',
		end:'top bottom',
		pin:'.comp-career .pinBx',
		pinSpacing:false,
	})

  // 배경색 전환 + 텍스트 효과
  ScrollTrigger.create({
    trigger: '.comp-career .pinBx',
    start: 'top top',
    end: 'bottom center',
    scrub: true,
    onUpdate: (self) => {
      const section = document.querySelector('.comp-career');
      if (self.progress > 0.2) {
        section?.classList.add('fadeOut');
      } else {
        section?.classList.remove('fadeOut');
      }
    }
  });

  // 올라가면서 텍스트 작게 + 고정
  gsap.to(".circle-text", {
    y: -350,
    scale: 0.5,
    ease: "power2.out",
    scrollTrigger: {
      trigger: ".comp-career .pinBx",
      start: "top top",
      end: "bottom+=150% center",
      scrub: true
    }
  });

  // opacity는 따로 제어 (progress > 0.8일 때부터)
  ScrollTrigger.create({
    trigger: ".comp-career .pinBx",
    start: "top top",
    end: "bottom+=150% center",
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress;
      const el = document.querySelector(".circle-text");

      if (progress > 0.8) {
        // 진행 후반부에만 opacity 줄이기
        gsap.to(el, {
          opacity: 0,
          ease: "power2.out",
          duration: 0.5
        });
      } else {
        // 다시 스크롤 되돌리면 opacity 복구
        gsap.to(el, {
          opacity: 1,
          ease: "power2.out",
          duration: 0.2
        });
      }
    }
  });

  // List 회전
  function createScrollRotateTitle(el) {
    const title = el.querySelector(".project-title");
    if (!title) return;

    ScrollTrigger.create({
      trigger: el,
      start: window.matchMedia("(orientation: portrait)").matches ? "top 60%" : "top 50%",
      end: window.matchMedia("(orientation: portrait)").matches ? "top 20%" : "top 10%",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(title, {
          rotateX: 90 * p,
          z: `${-0.6 * p}em`,
          opacity: 1 - p,
          transformOrigin: "center 270%"
        });
      }
    });
  }
  ScrollTrigger.matchMedia({
    "(orientation: landscape)": () => {
      document.querySelectorAll(".project-item").forEach(createScrollRotateTitle);
    },
    "(orientation: portrait)": () => {
      document.querySelectorAll(".project-item").forEach(createScrollRotateTitle);
    }
  });

  // project
  gsap.registerPlugin(CustomEase);

  // Create custom eases
  CustomEase.create("projectExpand", "0.42, 0, 1, 1"); // ease-in then linear
  CustomEase.create("projectCollapse", "0, 0, 0.58, 1"); // ease-out then linear
  CustomEase.create("textReveal", "0.25, 1, 0.5, 1");
  CustomEase.create("squareStretch", "0.22, 1, 0.36, 1");

  const projectItems = document.querySelectorAll(".project-item");
  let activeProject = null;
  let isClickAllowed = true;

  // Set initial invisibility of all project items for staggered reveal
  gsap.set(projectItems, {
    opacity: 0,
    y: 20,
    scale: 0.97
  });

  // Add staggered entrance animation on page load
  const entranceTl = gsap.timeline({
    defaults: {
      ease: "power1.out"
    }
  });

  entranceTl.to(projectItems, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.35,
    stagger: 0.04,
    clearProps: "opacity,y,scale",
    onComplete: function () {
      // Ensure all items are fully visible after animation completes
      gsap.set(projectItems, {
        clearProps: "all"
      });
    }
  });

  // Initialize text splitting
  projectItems.forEach((project) => {
    const detailElements = project.querySelectorAll(".project-details p");
    detailElements.forEach((p) => {
      // strong과 span 요소 추출
      const strong = p.querySelector("strong");
      const span = p.querySelector("span");

      // 둘 다 없으면 패스
      if (!strong && !span) return;

      // 기존 요소들 분리 저장
      const strongClone = strong?.cloneNode(true);
      const spanClone = span?.cloneNode(true);

      // <p> 비우기
      p.innerHTML = "";

      // wrapper 구성
      const lineWrapper = document.createElement("div");
      lineWrapper.className = "line-wrapper";
      lineWrapper.style.overflow = "hidden";

      const line = document.createElement("div");
      line.className = "line";

      // 원래의 <strong>, <span>을 다시 넣어줌
      if (strongClone) line.appendChild(strongClone);
      if (spanClone) line.appendChild(spanClone);

      lineWrapper.appendChild(line);
      p.appendChild(lineWrapper);

      // GSAP 초기 위치 세팅
      gsap.set(line, {
        y: "100%",
        opacity: 0
      });
    });

    // Set up hover indicators
    const titleContainer = project.querySelector(".project-title-container");
    const leftIndicator = project.querySelector(".hover-indicator.left");
    const rightIndicator = project.querySelector(".hover-indicator.right");

    // Set initial sizes
    gsap.set(leftIndicator, {
      width: "0px",
      height: "8px",
      opacity: 0,
      x: -10,
      zIndex: 20,
      background: "#f0ede8"
    });

    gsap.set(rightIndicator, {
      width: "0px",
      height: "8px",
      opacity: 0,
      x: 10,
      zIndex: 20,
      background: "#f0ede8"
    });

    // Add hover event listeners
    titleContainer.addEventListener("mouseenter", () => {
      // Only show hover effect on non-active projects
      if (project !== activeProject) {
        gsap.killTweensOf([leftIndicator, rightIndicator]);

        // Reset any previous animations
        gsap.set([leftIndicator, rightIndicator], {
          clearProps: "all",
          opacity: 0,
          width: "0px",
          height: "8px",
          x: function (i) {
            return i === 0 ? -10 : 10;
          }
        });

        // Left square animation - stretch then contract
        const leftTl = gsap.timeline();
        leftTl
          .set(leftIndicator, {
            opacity: 1,
            width: "0px"
          })
          .to(leftIndicator, {
            x: 0,
            width: "12px",
            duration: 0.15,
            ease: "power2.out"
          })
          .to(leftIndicator, {
            width: "8px",
            duration: 0.1,
            ease: "squareStretch"
          });

        // Right square animation - delayed, stretch then contract
        const rightTl = gsap.timeline({
          delay: 0.06
        });
        rightTl
          .set(rightIndicator, {
            opacity: 1,
            width: "0px"
          })
          .to(rightIndicator, {
            x: 0,
            width: "12px",
            duration: 0.15,
            ease: "power2.out"
          })
          .to(rightIndicator, {
            width: "8px",
            duration: 0.1,
            ease: "squareStretch"
          });
      }
    });

    titleContainer.addEventListener("mouseleave", () => {
      // Only animate out for non-active projects
      if (project !== activeProject) {
        gsap.killTweensOf([leftIndicator, rightIndicator]);

        // Reverse animation for left square
        const leftTl = gsap.timeline();
        leftTl
          .to(leftIndicator, {
            width: "12px",
            duration: 0.1,
            ease: "power1.in"
          })
          .to(leftIndicator, {
            width: "0px",
            x: -10,
            opacity: 0,
            duration: 0.15,
            ease: "power2.in"
          });

        // Reverse animation for right square (delayed)
        const rightTl = gsap.timeline({
          delay: 0.03
        });
        rightTl
          .to(rightIndicator, {
            width: "12px",
            duration: 0.1,
            ease: "power1.in"
          })
          .to(rightIndicator, {
            width: "0px",
            x: 10,
            opacity: 0,
            duration: 0.15,
            ease: "power2.in"
          });
      }
    });
  });

  // Function to apply scaling to projects with gradual opacity and blur
  const applyScaling = (activeIndex) => {
    projectItems.forEach((item, index) => {
      const titleContainer = item.querySelector(".project-title-container");
      const distance = Math.abs(index - activeIndex);

      if (index === activeIndex) {
        // Active project
        gsap.to(titleContainer, {
          scale: 1,
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          duration: 0.3,
          ease: "projectExpand"
        });
      } else if (distance === 1) {
        // Distance 1 projects
        gsap.to(titleContainer, {
          scale: 0.95,
          opacity: 0.7,
          filter: "blur(1px)",
          y: 0,
          duration: 0.3,
          ease: "projectExpand"
        });
      } else if (distance === 2) {
        // Distance 2 projects
        gsap.to(titleContainer, {
          scale: 0.9,
          opacity: 0.5,
          filter: "blur(2px)",
          y: 0,
          duration: 0.3,
          ease: "projectExpand"
        });
      } else {
        // Distance 3+ projects
        gsap.to(titleContainer, {
          scale: 0.85,
          opacity: 0.3,
          filter: "blur(4px)",
          y: 0,
          duration: 0.3,
          ease: "projectExpand"
        });
      }
    });
  };

  // Function to reset all scaling
  const resetScaling = () => {
    projectItems.forEach((item) => {
      const titleContainer = item.querySelector(".project-title-container");
      gsap.to(titleContainer, {
        scale: 1,
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 0.3,
        ease: "projectCollapse"
      });
    });
  };

  // Set initial states for images
  gsap.set(".image-wrapper img", {
    clipPath: "inset(100% 0 0 0)"
  });

  // 타이틀 회전
  let savedTransform = null;

  function rememberTitleTransform(el) {
    const title = el.querySelector(".project-title");
    if (!title) return;

    savedTransform = {
      transform: getComputedStyle(title).transform,
      opacity: getComputedStyle(title).opacity
    };
  }

  // Function to toggle project expansion
  const toggleProject = (project) => {
    // Debounce clicks
    if (!isClickAllowed) return;
    isClickAllowed = false;
    setTimeout(() => {
      isClickAllowed = true;
    }, 300);

    // If clicking the active project, close it
    if (activeProject === project) {
      const content = project.querySelector(".project-content");
      const image = project.querySelector(".image-wrapper img");
      const details = project.querySelectorAll(".project-details .line");
      const title = project.querySelector(".project-title");

      // Close animation with ease-out then linear for letter spacing
      gsap.to(title, {
        fontSize: "3rem",
        letterSpacing: "-0.02em",
        duration: 0.2,
        ease: "projectCollapse"
      });

      gsap.to(image, {
        clipPath: "inset(100% 0 0 0)",
        duration: 0.15,
        ease: "none"
      });

      // SLOWER ANIMATION for project details when closing
      gsap.to(details, {
        y: "100%",
        opacity: 0,
        duration: 0.5, // Increased from 0.15 to 0.5 for slower animation
        stagger: 0.05, // Increased from 0.015 to 0.05 for slower staggered effect
        ease: "projectCollapse"
      });

      gsap.to(content, {
        maxHeight: 0,
        opacity: 0,
        margin: 0,
        duration: 0.2,
        ease: "projectCollapse",
        onComplete: () => {
          activeProject.classList.remove("is-active");

          const title = activeProject.querySelector(".project-title");
          if (savedTransform) {
            title.style.transform = savedTransform.transform;
            title.style.opacity = savedTransform.opacity;
            savedTransform = null;
          }

          if (window.lenis && window.lenis.isStopped) {
            window.lenis.start();
          }

          activeProject = null;
          resetScaling();
          gsap.to(projectItems, {
            marginBottom: "1.5rem",
            duration: 0.3,
            ease: "projectExpand",
            stagger: 0.02
          });
          openNewProject();
        }
      });

      return; // 새로운 항목 열지 않음
    } else {
      // Close active project if exists
      if (activeProject) {
        const oldContent = activeProject.querySelector(".project-content");
        const oldImage = activeProject.querySelector(".image-wrapper img");
        const oldDetails = activeProject.querySelectorAll(
          ".project-details .line"
        );
        const oldTitle = activeProject.querySelector(".project-title");

        // Close previous project
        gsap.to(oldTitle, {
          fontSize: "3rem",
          letterSpacing: "-0.02em",
          duration: 0.2,
          ease: "projectCollapse"
        });

        gsap.to(oldImage, {
          clipPath: "inset(100% 0 0 0)",
          duration: 0.15,
          ease: "none"
        });

        // SLOWER ANIMATION for project details when closing previous project
        gsap.to(oldDetails, {
          y: "100%",
          opacity: 0,
          duration: 0.5, // Increased from 0.15 to 0.5 for slower animation
          stagger: 0.05, // Increased from 0.015 to 0.05 for slower staggered effect
          ease: "projectCollapse"
        });

        // gsap.to(oldContent, {
        //   maxHeight: 0,
        //   opacity: 0,
        //   margin: 0,
        //   duration: 0.2,
        //   ease: "projectCollapse",
        //   onComplete: () => openNewProject()
        // });
        gsap.to(content, {
          maxHeight: 0,
          opacity: 0,
          margin: 0,
          duration: 0.2,
          ease: "projectCollapse",
          onComplete: () => {
            activeProject.classList.remove("is-active");

            const title = activeProject.querySelector(".project-title");
            if (savedTransform) {
              title.style.transform = savedTransform.transform;
              title.style.opacity = savedTransform.opacity;
              savedTransform = null;
            }

            // 다시 스크롤 가능하게
            if (window.lenis && window.lenis.isStopped) {
              window.lenis.start();
            }

            activeProject = null;
            resetScaling();
            gsap.to(projectItems, {
              marginBottom: "1.5rem",
              duration: 0.3,
              ease: "projectExpand",
              stagger: 0.02
            });
          }
        });

      } else {
        openNewProject();
      }

      function openNewProject() {
        // Open new project
        activeProject = project;
        rememberTitleTransform(project);

        // Apply scaling with blur
        const activeIndex = Array.from(projectItems).indexOf(project);
        applyScaling(activeIndex);

        // Get elements to animate
        const content = project.querySelector(".project-content");
        const image = project.querySelector(".image-wrapper img");
        const details = project.querySelectorAll(".project-details .line");
        const title = project.querySelector(".project-title");

        // 선택 시 indicator 강제 숨김
        const leftIndicator = project.querySelector(".hover-indicator.left");
        const rightIndicator = project.querySelector(".hover-indicator.right");

        gsap.killTweensOf([leftIndicator, rightIndicator]);
        gsap.to([leftIndicator, rightIndicator], {
          width: "0px",
          opacity: 0,
          x: (i) => (i === 0 ? -10 : 10),
          duration: 0.2,
          overwrite: true
        });

        // Pre-render content to get accurate height
        gsap.set(content, {
          display: "flex",
          autoAlpha: 0,
          height: "auto",
          maxHeight: "none",
          overflow: "hidden"
        });

        // Get accurate measurement
        const contentHeight = content.offsetHeight;

        // Reset for animation
        gsap.set(content, {
          maxHeight: 0,
          height: "auto",
          autoAlpha: 0,
          overflow: "hidden"
        });

        // Create a timeline for synchronized animations
        const tl = gsap.timeline({
          defaults: {
            ease: "projectExpand"
          }
        });

        // Animate opening with ease-in then linear for letter spacing
        tl.to(
          title,
          {
            fontSize: window.innerWidth > 768 ? "3.5rem" : "2.5rem",
            letterSpacing: "0.01em",
            duration: 0.35,
            ease: "projectExpand"
          },
          0
        );

        tl.to(
          content,
          {
            maxHeight: contentHeight,
            autoAlpha: 1,
            margin: "2rem 0",
            duration: 0.4,
            pointerEvents: "auto"
          },
          0
        );

        tl.to(
          image,
          {
            clipPath: "inset(0% 0 0 0)",
            duration: 0.35,
            ease: "power2.out"
          },
          0.05
        );

        // SLOWER ANIMATION for project details when opening
        tl.to(
          details,
          {
            y: "0%",
            opacity: 1,
            duration: 0.8, // Increased from 0.3 to 0.8 for slower animation
            stagger: 0.08, // Increased from 0.025 to 0.08 for slower staggered effect
            ease: "textReveal"
          },
          0.2 // Slightly delayed start for better sequencing
        );

        // Adjust spacing for better visibility
        if (activeIndex > 0) {
          gsap.to(Array.from(projectItems).slice(0, activeIndex), {
            marginBottom: "0.5rem",
            duration: 0.3,
            ease: "projectCollapse",
            stagger: 0.02
          });
        }

        if (activeIndex < projectItems.length - 1) {
          gsap.to(Array.from(projectItems).slice(activeIndex + 1), {
            marginBottom: "0.5rem",
            duration: 0.3,
            ease: "projectCollapse",
            stagger: 0.02
          });
        }

        setTimeout(() => {
          const rect = project.getBoundingClientRect();
          const offset = rect.top + window.scrollY;
          const targetY = offset - (window.innerHeight / 2) + (rect.height / 2);

          if (window.lenis) {
            window.lenis.scrollTo(targetY, {
              duration: 1.2,
              easing: (t) => 1 - Math.pow(1 - t, 3)
            });

            // ✅ 부드럽게 살짝 이동 후 정지 (250ms 정도)
            setTimeout(() => {
              window.lenis.stop();
            }, 250); // ✅ 너무 짧으면 위치 이동 안함 / 너무 길면 너무 늦음
          } else {
            window.scrollTo({
              top: targetY,
              behavior: "smooth"
            });
          }
        }, 350); // ← 콘텐츠가 펼쳐진 이후에 실행

      }
    }
  };

  // Add click event listeners
  projectItems.forEach((item) => {
    item.addEventListener("click", () => {
      toggleProject(item);
    });
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    if (activeProject) {
      // Update content height on resize
      const content = activeProject.querySelector(".project-content");

      // Update title font size
      const title = activeProject.querySelector(".project-title");
      gsap.to(title, {
        fontSize: window.innerWidth > 768 ? "3.5rem" : "2.5rem",
        duration: 0.2
      });

      // Re-measure content height
      const currentHeight = parseFloat(getComputedStyle(content).height);
      gsap.set(content, {
        maxHeight: "none"
      });
      const autoHeight = content.offsetHeight;

      // If height changed, animate to new height
      if (Math.abs(currentHeight - autoHeight) > 1) {
        gsap.set(content, {
          maxHeight: currentHeight
        });
        gsap.to(content, {
          maxHeight: autoHeight,
          duration: 0.2
        });
      } else {
        gsap.set(content, {
          maxHeight: currentHeight
        });
      }
    }
  });

  // skill
  ScrollTrigger.create({
    trigger: ".skill-box",
    start: "top 30%",
    end: "bottom 40%",
  });
  
  // 1단계: gradient 퍼지듯 등장
  gsap.to(".skill-wrap .gradient-overlay", {
    opacity: 1,
    scrollTrigger: {
      trigger: ".skill-wrap",
      start: "top bottom",
      end: "top top",
      scrub: true,
    }
  });

  // 2단계: 상단 도달 시 solid 블랙 부드럽게 등장
  ScrollTrigger.create({
    trigger: ".skill-wrap",
    start: "top top",
    onEnter: () => {
      gsap.to(".skill-wrap .solid-overlay", {
        opacity: 1,
        duration: 1,
        ease: "power2.out",
      });
    },
    onLeaveBack: () => {
      gsap.to(".skill-wrap .solid-overlay", {
        opacity: 0,
        duration: 1,
        ease: "power2.out",
      });
    }
  });
    
  const pinWrap = document.querySelector(".pin-wrap");
  const mindset = document.querySelector(".comp-mindset");

  const mindsetWidth = mindset.scrollWidth;
  const extraScroll = window.innerHeight * 1.2;

  let hasDrawnMindsetChart = false;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".comp-skill",
      start: "top top",
      end: `+=${extraScroll + mindsetWidth}`,
      scrub: true,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: self => {
        const progress = self.progress;
        const mindsetStartRatio = extraScroll / (extraScroll + mindsetWidth);

        if (!hasDrawnMindsetChart && progress > mindsetStartRatio + 0.02) {
          drawMindsetChart(); // ✅ mindset 가로 스크롤 초입에서 실행
          hasDrawnMindsetChart = true;
        }
      },
      onEnter: () => {
        startSkillDropOnce();
        resumeSkillDrop();
      },
      onLeave: () => pauseSkillDrop(),
      onEnterBack: () => resumeSkillDrop(),
      onLeaveBack: () => pauseSkillDrop()
    }
  });
  
  // 1단계: 버블 보여주기 (고정 상태 유지)
  tl.to({}, {
    duration: extraScroll,
    ease: "none"
  });

  // 2단계: mindset 가로 스크롤
  tl.to(pinWrap, {
    x: () => -mindsetWidth,
    ease: "none",
    duration: mindsetWidth
  });


  // Workflow
  let currentTimelineIndex = -1;
  let showingTimelineBg1 = true;

  const timelineItems = document.querySelectorAll(".timeline-item");
  const bg1 = document.querySelector(".timeline-bg.bg1");
  const bg2 = document.querySelector(".timeline-bg.bg2");
  const workflow = document.querySelector(".comp-workflow");

  // 이미지 미리 로드
  function preloadImage(src, callback) {
    const img = new Image();
    img.onload = callback;
    img.src = src;
  }

  // 현재 타임라인 항목 활성화 및 배경 이미지 전환
  function setActive(index) {
    if (index === currentTimelineIndex) return;
    currentTimelineIndex = index;

    timelineItems.forEach((el, i) => {
      el.classList.toggle("timeline-item--active", i === index);
    });

    // const img = timelineItems[index]?.querySelector(".timeline__img");
    // if (!img) return;

    // const newSrc = img.getAttribute("src");
    // const nextBg = showingTimelineBg1 ? bg2 : bg1;
    // const currentBg = showingTimelineBg1 ? bg1 : bg2;

    // if (nextBg.style.backgroundImage.includes(newSrc)) return;

    // preloadImage(newSrc, () => {
    //   requestAnimationFrame(() => {
    //     nextBg.style.backgroundImage = `url('${newSrc}')`;
    //     nextBg.classList.add("visible");
    //     currentBg.classList.remove("visible");
    //     showingTimelineBg1 = !showingTimelineBg1;
    //   });
    // });
    const item = timelineItems[index];
    const newBgSrc = item.getAttribute("data-bg"); // 각 아이템에 명시된 배경 경로
    const nextBg = showingTimelineBg1 ? bg2 : bg1;
    const currentBg = showingTimelineBg1 ? bg1 : bg2;

    if (!newBgSrc || nextBg.style.backgroundImage.includes(newBgSrc)) return;

    const preload = new Image();
    preload.onload = () => {
      requestAnimationFrame(() => {
        nextBg.style.backgroundImage = `url(${newBgSrc})`;
        nextBg.classList.add("visible");
        currentBg.classList.remove("visible");
        showingTimelineBg1 = !showingTimelineBg1;
      });
    };
    preload.src = newBgSrc;

  }

  // ScrollTrigger로 각 아이템에 진입/복귀 감지
  timelineItems.forEach((item, i) => {
    ScrollTrigger.create({
      trigger: item,
      start: "top 70%",
      end: "bottom 70%",
      onEnter: () => setActive(i),
      onEnterBack: () => setActive(i),
      once: false
    });
  });

  // 타임라인 스크롤 핸들링
  let ticking = false;
  function handleTimelineScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const triggerY = window.innerHeight * 0.3;
      for (let i = 0; i < timelineItems.length; i++) {
        const rect = timelineItems[i].getBoundingClientRect();
        if (rect.top <= triggerY && rect.bottom > triggerY) {
          setActive(i);
          break;
        }
      }
      ticking = false;
    });
  }

  // 컴포넌트 내에서만 배경 이미지 노출
  function updateBackgroundVisibility() {
    const rect = workflow.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;

    if (!isInView) {
      bg1.classList.remove("visible");
      bg2.classList.remove("visible");
    } else {
      if (showingTimelineBg1) {
        bg1.classList.add("visible");
        bg2.classList.remove("visible");
      } else {
        bg2.classList.add("visible");
        bg1.classList.remove("visible");
      }
    }
  }

  // Lenis scroll 연결
  if (window.lenis) {
    window.lenis.on("scroll", () => {
      handleTimelineScroll();
      updateBackgroundVisibility();
    });
  } else {
    window.addEventListener("scroll", () => {
      handleTimelineScroll();
      updateBackgroundVisibility();
    });
  }

  // 초기 진입 시 강제 적용
  window.addEventListener("load", () => {
    setActive(0);
    setTimeout(() => {
      handleTimelineScroll();
      updateBackgroundVisibility();
    }, 300);
  });

  //footer
  const bubblesContainer = document.querySelector('.bubbles');
  const totalBubbles = 128;
  for (let i = 0; i < totalBubbles; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const size = 2 + Math.random() * 4;
    const distance = 6 + Math.random() * 4;
    const position = -5 + Math.random() * 110;
    const time = 2 + Math.random() * 2;
    const delay = -1 * (2 + Math.random() * 2);

    bubble.style.setProperty('--size', `${size}rem`);
    bubble.style.setProperty('--distance', `${distance}rem`);
    bubble.style.setProperty('--position', `${position}%`);
    bubble.style.setProperty('--time', `${time}s`);
    bubble.style.setProperty('--delay', `${delay}s`);

    bubblesContainer.appendChild(bubble);
  }

  // 새로고침 시
  let didResize = false;

  window.addEventListener('resize', () => {
    if (!didResize) {
      didResize = true;
      location.reload();
    }
  });

});


// Matter.js 기반 스킬 낙하
let skillEngine, skillRender, skillRunner, skillElements = [];
let skillDropIndex = 0;
let skillList = []; // 전역으로 이동
let dropInProgress = false;

function dropNextSkill() {
  if (skillDropIndex >= skillList.length || !dropInProgress) return;

  const skill = skillList[skillDropIndex];
  skillDropIndex++;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const radius = 120;

  const { Bodies, Composite, Common } = Matter;
  const x = Common.random(width * 0.3, width * 0.7);
  const circle = Bodies.circle(x, -150, radius, {
    restitution: 0.5,
    friction: 0.1,
    frictionAir: 0.01,
    density: 0.002,
    render: {
      fillStyle: 'transparent',
      strokeStyle: 'transparent',
      lineWidth: 0
    }
  });
  Composite.add(skillEngine.world, circle);

  const el = document.createElement('div');
  el.className = 'skill';
  el.classList.add(Math.random() < 0.5 ? 'skill-b' : 'skill-w');
  el.innerHTML = `<img src="assets/image/icons/${skill.icon}" alt="${skill.name}" /><span>${skill.name}</span>`;
  document.querySelector('.skill-box').appendChild(el);
  skillElements.push({ el, body: circle });

  // 다음 드롭 예약
  setTimeout(() => {
    if (dropInProgress) dropNextSkill();
  }, 600);
}

function resumeSkillDrop() {
  if (!skillEngine) return;

  dropInProgress = true;
  skillRunner.enabled = true;
  dropNextSkill();
}

function pauseSkillDrop() {
  if (!skillEngine) return;

  dropInProgress = false;
  skillRunner.enabled = false;
}

function startSkillDropOnce() {
  if (skillEngine) return;

  const { Engine, Render, Runner, Bodies, Composite } = Matter;
  skillEngine = Engine.create();
  const world = skillEngine.world;

  const canvas = document.getElementById("skillCanvas");
  canvas.width = window.innerWidth;
  canvas.height = document.querySelector('.skill-box')?.offsetHeight || window.innerHeight;

  skillRender = Render.create({
    element: document.querySelector(".skill-box"),
    canvas: document.getElementById("skillCanvas"),
    engine: skillEngine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false,
      background: 'transparent'
    }
  });

  Render.run(skillRender);
  skillRunner = Runner.create();
  Runner.run(skillRunner, skillEngine);
  skillRunner.enabled = false; // 처음엔 정지 상태

  // ✅ 누락된 벽과 바닥 추가
  const width = window.innerWidth;
  const height = window.innerHeight;

  const ground = Bodies.rectangle(width / 2, height + 50, width, 100, { isStatic: true });
  const leftWall = Bodies.rectangle(-50, height / 2, 100, height * 2, { isStatic: true });
  const rightWall = Bodies.rectangle(width + 50, height / 2, 100, height * 2, { isStatic: true });
  Composite.add(world, [ground, leftWall, rightWall]);

  skillList = [
    { name: 'HTML', icon: 'html.png' },
    { name: 'CSS', icon: 'css.png' },
    { name: 'SCSS', icon: 'scss.png' },
    { name: 'JavaScript', icon: 'js.png' },
    { name: 'Bootstrap', icon: 'bootstrap.png' },
    { name: 'Google Analytics', icon: 'analytics.png' },
    { name: 'Photoshop', icon: 'ps.png' },
    { name: 'Xd', icon: 'xd.png' },
    { name: 'Git', icon: 'git.png' },
    { name: 'GitLab', icon: 'gitlab.png' },
    { name: 'Figma', icon: 'figma.png' }
  ];

  // 위치 동기화 루프
  (function sync() {
    skillElements.forEach(({ el, body }) => {
      el.style.left = `${body.position.x}px`;
      el.style.top = `${body.position.y}px`;
    });
    requestAnimationFrame(sync);
  })();
}

// chart
function drawMindsetChart() {
  const container = document.querySelector(".mindset-chart");
  if (!container || container.dataset.initiated === "true") return;
  container.dataset.initiated = "true";

  const drawWidth = container.clientWidth;
  const drawHeight = container.clientHeight;

  const dataset = Array(8).fill(1);
  // const dataset = [2, 1, 1.5, 1, 1, 0.5, 1.5, 1, 0.5, 1];  

  const colors = ['#333333', '#404040', '#4D4D4D', '#595959', '#666666', '#737373', '#A6A6A6', '#D9D9D9'];
  const labels = [
    "#소통에 능한",
    "#디테일을 놓치지 않는",
    "#책임감 있는 마무리",
    "#기준이 있는 작업자",
    "#접근성을 고려하는",
    "#정리된 사고",
    "#사용자 중심의 시선",
    "#협업에 강한",
  ];

  const width = container.offsetWidth;
  const height = container.offsetHeight;
  const minOfWH = Math.min(width, height) / 2;
  const initialAnimDelay = 300;
  const arcAnimDelay = 150;
  const arcAnimDur = 3000;
  const secDur = 1000;
  const secIndividualdelay = 150;

  let radius = minOfWH > 300 ? 300 : minOfWH;

  const svg = d3.select(container).append("svg")
    .attr({ width, height, class: "pieChart" })
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`)
    .attr("width", drawWidth)
    .attr("height", drawHeight)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet"); // 중앙 정렬
  
  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const arc = d3.svg.arc().outerRadius(radius * 0.6).innerRadius(radius * 0.45);
  const outerArc = d3.svg.arc().innerRadius(radius * 0.85).outerRadius(radius * 0.85);
  const pie = d3.layout.pie().value(d => d);
  const midAngle = d => d.startAngle + (d.endAngle - d.startAngle) / 2;

  svg.append("g").attr("class", "lines");
  svg.append("g").attr("class", "slices");
  svg.append("g").attr("class", "labels");

  // 1. Slices: 얇게 → 회전 → 두꺼워짐
  const slice = svg.select('.slices')
    .datum(dataset)
    .selectAll('path')
    .data(pie)
    .enter()
    .append('path')
    .attr({
      fill: (d, i) => colors[i],
      d: arc,
      'stroke-width': '1px', // ✅ 처음엔 얇게
      transform: 'rotate(-180, 0, 0)'
    })
    .style('opacity', 0)
    .transition()
    .delay((d, i) => i * arcAnimDelay + initialAnimDelay)
    .duration(arcAnimDur)
    .ease('elastic')
    .style('opacity', 1)
    .attr('transform', 'rotate(0,0,0)')
    .attr('stroke-width', '25px'); // ✅ 두꺼워짐

  // 2. Stroke-width 축소: 두꺼웠던 걸 얇게 전환
  svg.selectAll('.slices path')
    .transition()
    .delay((d, i) => arcAnimDur + i * secIndividualdelay)
    .duration(secDur)
    .attr('stroke-width', '5px');

  // 3. Polyline: 점선 등장 (텍스트보다 먼저)
  svg.select(".lines").selectAll("polyline")
    .data(pie(dataset))
    .enter()
    .append("polyline")
    .style("opacity", 0)
    .attr("points", d => {
      const start = arc.centroid(d);
      return [start, start, start]; // 시작 시 모두 동일 위치
    })
    .transition()
    .duration(secDur)
    .delay((d, i) => arcAnimDur + i * secIndividualdelay + 100)
    .style("opacity", 0.5)
    .attr("points", d => {
      let pos = outerArc.centroid(d);
      pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
      return [arc.centroid(d), outerArc.centroid(d), pos];
    });

  // 4. Text label: 점선보다 약간 늦게 등장
  svg.select(".labels").selectAll("text")
    .data(pie(dataset))
    .enter()
    .append("text")
    .attr("dy", "0.35em")
    .style("opacity", 0)
    // .style("fill", (d, i) => colors[i])
    .style("fill", "#D9D9D9") // 흰색 등 원하는 고정 색상

    // .text((d, i) => colors[i])
    .text((d, i) => labels[i])  
    .attr("transform", d => {
      let pos = outerArc.centroid(d);
      pos[0] = radius * (midAngle(d) < Math.PI ? 1 : -1);
      return `translate(${pos})`;
    })
    .style("text-anchor", d => midAngle(d) < Math.PI ? "start" : "end")
    .transition()
    .delay((d, i) => arcAnimDur + i * secIndividualdelay + 300) // ✅ polyline보다 느리게
    .duration(secDur)
    .style("opacity", 1);
}

