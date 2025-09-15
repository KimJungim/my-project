/**
 * a11y.js - 접근성 관련 유틸리티 모음
 * 웹 접근성 표준(WCAG)을 준수하는 키보드 접근성 기능을 제공합니다.
**/
(function (global) {
  'use strict';

  // 전역 객체 App이 없으면 생성
  global.App = global.App || {};

  // 이미 등록된 App.a11y가 있으면 재사용, 없으면 새 객체
  const a11y = global.App.a11y || {};
  
  // inert 지원 체크 (브라우저별 지원 보정)
  const SUPPORTS_INERT = (typeof HTMLElement !== 'undefined') && ('inert' in HTMLElement.prototype);

  /**
   * 패널 보이기/숨기기 유틸 (hidden/aria-hidden/inert/포인터 차단 일괄 토글)
   * - open=true  : hidden 제거 + 접근성 트리 노출
   * - open=false : hidden 부여 + 접근성 트리 제외
  **/
  function setPanelVisibility(panel, open) {
    if (!panel) return;
    panel.hidden = !open;
    if (open) {
      panel.removeAttribute('aria-hidden');
      if (SUPPORTS_INERT) panel.removeAttribute('inert');
      else panel.style.pointerEvents = '';
    } else {
      panel.setAttribute('aria-hidden', 'true');
      if (SUPPORTS_INERT) panel.setAttribute('inert', '');
      else panel.style.pointerEvents = 'none';
    }
  }
  
  /**
   * 특정 컨테이너 내에서 포커스를 가두는 기능
   * @param {HTMLElement} container - 포커스를 가둘 컨테이너 요소
   * @returns {Function} - 이벤트 리스너 제거 함수
  **/
  a11y.trapFocus = function(container) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];
    const focusableElements = container.querySelectorAll(focusableSelectors.join(', '));
    if (!focusableElements.length) return;

    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    // 이벤트 전파 방지를 위해 캡처 단계에서 이벤트 처리
    function handle(e) {
      if (e.key !== 'Tab') return;

      // 현재 포커스된 요소가 컨테이너 내부에 있는지 확인
      if (!container.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
        return;
      }

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    // 문서 전체에 이벤트 리스너 추가 (캡처 단계에서)
    document.addEventListener('keydown', handle, true);
    
    // 초기 포커스 설정
    firstEl.focus();

    // 정리 함수 반환
    return () => document.removeEventListener('keydown', handle, true);
  };

  /**
   * 목록형 컴포넌트(드롭다운, 셀렉트)에서 탭 순환 관리
   * @param {HTMLElement} container - 목록 컨테이너
   * @param {string} itemSelector - 목록 아이템 선택자
   * @param {Object} options - 옵션
   * @param {Function} options.onExit - 포커스가 목록을 벗어날 때 호출할 콜백
   * @param {Function} options.onEnter - 포커스가 목록에 들어올 때 호출할 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
  **/
  a11y.trapFocusInList = function(container, itemSelector, options = {}) {
    const items = container.querySelectorAll(itemSelector);
    if (!items.length) return;

    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    
    function handleKeydown(e) {
      // Tab 키 처리
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstItem) {
          if (options.onExit) {
            options.onExit('backward');
          }
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          if (options.onExit) {
            options.onExit('forward');
          }
        }
      }
    }

    function handleFocus(e) {
      if (options.onEnter) {
        options.onEnter(e.target);
      }
    }

    container.addEventListener('keydown', handleKeydown);
    
    // 개별 아이템 이벤트 리스너 정리를 위한 배열
    const itemFocusCleanups = [];
    items.forEach(item => {
      item.addEventListener('focus', handleFocus);
      itemFocusCleanups.push(() => item.removeEventListener('focus', handleFocus));
    });

    return () => {
      container.removeEventListener('keydown', handleKeydown);
      itemFocusCleanups.forEach(fn => fn());
    };
  };

  /**
   * 화살표 키로 목록 아이템 탐색 기능
   * @param {HTMLElement} container - 목록 컨테이너
   * @param {string} itemSelector - 목록 아이템 선택자
   * @param {Object} options - 옵션
   * @param {boolean} options.loop - 처음/끝에서 순환할지 여부 (기본값: true)
   * @param {boolean} options.horizontal - 가로 방향 탐색 사용 (기본값: false)
   * @param {Function} options.onNavigate - 탐색 시 호출할 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
  **/
  a11y.arrowNavigation = function(container, itemSelector, options = {}) {
    const defaultOptions = {
      loop: true,
      horizontal: false,
      onNavigate: null
    };
    
    const settings = { ...defaultOptions, ...options };
    const items = Array.from(container.querySelectorAll(itemSelector));
    
    if (!items.length) return;

    function handleKeydown(e) {
      // 현재 포커스된 아이템의 인덱스
      const currentIndex = items.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      const isVertical = !settings.horizontal;

      // 화살표 키 처리
      if ((isVertical && e.key === 'ArrowDown') || (!isVertical && e.key === 'ArrowRight')) {
        e.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = settings.loop ? 0 : currentIndex;
        }
      } else if ((isVertical && e.key === 'ArrowUp') || (!isVertical && e.key === 'ArrowLeft')) {
        e.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = settings.loop ? items.length - 1 : 0;
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = items.length - 1;
      } else {
        return; // 다른 키는 처리하지 않음
      }

      // 다음 아이템으로 포커스 이동
      if (nextIndex !== currentIndex) {
        items[nextIndex].focus();
        
        if (settings.onNavigate) {
          settings.onNavigate(items[nextIndex], nextIndex);
        }
      }
    }

    container.addEventListener('keydown', handleKeydown);
    
    return () => container.removeEventListener('keydown', handleKeydown);
  };

  /**
   * 펼침/접힘 컴포넌트 제어 (Enter/Space)
   * @param {HTMLElement} trigger - 펼침/접힘 트리거 요소 (버튼)
   * @param {HTMLElement} target - 펼쳐지거나 접힐 대상 요소
   * @param {Object} options - 옵션
   * @param {string} options.expandedClass - 펼쳐진 상태 클래스 (기본값: 'show')
   * @param {string} options.triggerActiveClass - 트리거 활성화 클래스 (기본값: 'active')
   * @param {Function} options.onExpand - 펼쳐질 때 호출할 콜백
   * @param {Function} options.onCollapse - 접힐 때 호출할 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
  **/
  a11y.toggleExpandable = function(trigger, target, options = {}) {
    const defaultOptions = {
      expandedClass: 'show',
      triggerActiveClass: 'active',
      onExpand: null,
      onCollapse: null
    };
    
    const settings = { ...defaultOptions, ...options };

    let suppressNextClick = false; // ← 키보드 토글 직후 click 1회 무시
    
    function toggle() {
      const isExpanded = trigger.classList.contains(settings.triggerActiveClass);
      
      // 상태 토글
      trigger.classList.toggle(settings.triggerActiveClass);
      target.classList.toggle(settings.expandedClass);
      
      // ARIA 속성 업데이트
      const newState = !isExpanded;
      trigger.setAttribute('aria-expanded', newState);
      
      
      // 콜백 호출
      if (newState && settings.onExpand) {
        settings.onExpand(trigger, target);
      } else if (!newState && settings.onCollapse) {
        settings.onCollapse(trigger, target);
      }
      
      return newState;
    }
    
    function handleClick(e) {
      if (suppressNextClick) {      // ← 직전 keydown이 토글했으면
        suppressNextClick = false;  //    click 1회 무시
        return;
      }
      // 태그 내부의 삭제 버튼 클릭은 무시 (이벤트 전파 방지)
      if (e.target.closest && e.target.closest('.select__tag-remove')) {
        return;
      }
      toggle();
    }
    
    // function handleKeydown(e) {
    //   // Enter 또는 Space 키로 토글
    //   if (e.key === 'Enter' || e.key === ' ') {
    //     e.preventDefault();
    //     suppressNextClick = true;   // ← 뒤따르는 click 무시
    //     toggle();
    //   } else if (e.key === 'ArrowDown' && !trigger.classList.contains(settings.triggerActiveClass)) {
    //     // 아래 화살표 키를 누를 때 펼치기
    //     e.preventDefault();
    //     suppressNextClick = true;   // ← 뒤따르는 click 무시
    //     if (toggle()) {
    //       // 첫 포커스는 onExpand에서 타입별로 처리됨
    //     }
    //   }
    // }
    function handleKeydown(e) {
      // Enter 또는 Space 키로 토글
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        suppressNextClick = true;   // ← 뒤따르는 click 무시
        toggle();
      } else if (e.key === 'ArrowDown' && !trigger.classList.contains(settings.triggerActiveClass)) {
        // 아래 화살표 키를 누를 때 펼치기
        e.preventDefault();
        suppressNextClick = true;   // ← 뒤따르는 click 무시
        if (toggle()) {
          // 첫 포커스는 onExpand에서 타입별로 처리됨
        }
    
      // ★ [5-1 추가] Windows 네이티브 패턴: Alt+↑로 닫기
      } else if (e.altKey && e.key === 'ArrowUp') {
        if (trigger.classList.contains(settings.triggerActiveClass)) { // 열려있을 때만
          e.preventDefault();
          suppressNextClick = true; // 뒤따르는 click 무시
          toggle();                 // 닫힘
        }
      }
    }
    
    
    trigger.addEventListener('click', handleClick);
    trigger.addEventListener('keydown', handleKeydown);
    
    return () => {
      trigger.removeEventListener('click', handleClick);
      trigger.removeEventListener('keydown', handleKeydown);
    };
  };

  /**
   * Escape 키로 닫기 기능
   * @param {HTMLElement} container - 컨테이너 요소
   * @param {Function} closeCallback - 닫기 동작을 수행할 콜백
   * @param {HTMLElement} focusAfterClose - 닫은 후 포커스를 이동할 요소 (옵션)
   * @returns {Function} - 이벤트 리스너 제거 함수
  **/
  /**
   * ESC 1회성 처리 유틸
   * - cross-UA 보장을 위해 keydown/keyup 모두 리스닝하지만,
   *   첫 ESC 이벤트에서 AbortController로 즉시 해제됩니다.
  */
  a11y.bindEscOnce = function(targets, handler) {
    const ac = new AbortController();
    const opts = { capture: true, signal: ac.signal };
    const onKey = (e) => {
      const k = e.key || e.code;
      if (k !== 'Escape' && k !== 'Esc') return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      handler();       // 닫기 콜백
      ac.abort();      // 모든 리스너 즉시 해제 (중복 방지)
    };
    (Array.isArray(targets) ? targets : [targets]).forEach(t => {
      if (!t) return;
      t.addEventListener('keydown', onKey, opts);
      t.addEventListener('keyup',   onKey, opts);
    });
    return () => ac.abort();
  };

  /**
   * 포커스 이동 감지 및 처리
   * @param {HTMLElement} container - 포커스 이동을 감지할 컨테이너
   * @param {Function} onFocusOut - 포커스가 컨테이너 밖으로 나갈 때 호출할 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
  **/
  a11y.handleFocusOut = function(container, onFocusOut) {
    function handleFocusOut(e) {
      // setTimeout을 사용하여 다음 포커스된 요소가 같은 컨테이너 내부인지 확인
      setTimeout(() => {
        if (!container.contains(document.activeElement)) {
          onFocusOut();
        }
      }, 10);
    }
    
    container.addEventListener('focusout', handleFocusOut);
    
    return () => container.removeEventListener('focusout', handleFocusOut);
  };

  // NVDA 브라우즈모드 개입 차단용: 열려있는 동안만 임시로 role="application"
  a11y.applyAppRole = function(node) {
    if (!node) return () => {};
    const hadRole = node.hasAttribute('role');
    const prev = node.getAttribute('role');
    node.setAttribute('role', 'application');
    return () => {   // 원복
      if (hadRole) node.setAttribute('role', prev);
      else node.removeAttribute('role');
    };
  };

  // NVDA 포커스 모드 강제: 컨테이너에 포커스가 있는 동안만 role="application"
  a11y.enforceFocusMode = function(container) {
    if (!container) return () => {};
    let undo = null;
    let isEnforcing = false; // 중복 호출 방지 플래그
    
    function onFocusIn() { 
      if (!undo && !isEnforcing) {
        undo = a11y.applyAppRole(container);
        isEnforcing = true;
      }
    }
    function onFocusOut() {
      setTimeout(() => {
        if (!container.contains(document.activeElement)) {
          if (undo) { undo(); undo = null; isEnforcing = false; }
        }
      }, 0);
    }
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);
    return () => {
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
      if (undo) { undo(); undo = null; isEnforcing = false; }
    };
  };


  /**
   * 컴포넌트 초기화 - 드롭다운 컴포넌트 (3가지 타입 지원)
   * @param {HTMLElement|string} dropdown - 드롭다운 요소 또는 선택자
   * @returns {Object} - 컴포넌트 제어 객체
  **/
  a11y.initDropdown = function(dropdown) {
    // 문자열이면 선택자로 간주하고 요소 찾기
    const container = typeof dropdown === 'string' ? document.querySelector(dropdown) : dropdown;
    if (!container) {
      console.warn('initDropdown: 컨테이너 요소를 찾을 수 없습니다.');
      return null;
    }
  
    const button = container.querySelector('.dropdown__button');
    const list   = container.querySelector('.dropdown__list');
    if (!button || !list) {
      console.warn('initDropdown: 필수 요소(.dropdown__button/.dropdown__list)를 찾을 수 없습니다.');
      return null;
    }
  
    // 타입 감지
    let dropdownType = container.getAttribute('data-type');
    if (!dropdownType) {
      const listRole = list.getAttribute('role');
      if (listRole === 'listbox') dropdownType = 'listbox';
      else if (listRole === 'menu') dropdownType = 'menu';
      else if (listRole === 'region') dropdownType = 'disclosure';
      else dropdownType = 'listbox';
    }
    
    // 타입 플래그 추가
    const isPopup = dropdownType === 'listbox' || dropdownType === 'menu';
    const isDisclosure = dropdownType === 'disclosure';
  
    const items = (dropdownType === 'listbox' || dropdownType === 'menu')
      ? list.querySelectorAll('.dropdown__item')
      : [];
  
    // 타입별 ARIA
    if (dropdownType === 'listbox') {
      list.setAttribute('role', 'listbox');
      items.forEach(item => item.setAttribute('role', 'option'));
    } else if (dropdownType === 'menu') {
      list.setAttribute('role', 'menu');
      items.forEach(item => item.setAttribute('role', 'menuitem'));
    } // disclosure는 별도 role 불필요
    
    // 디스클로저형 ARIA 보강 (포커스 주지 않음)
    if (isDisclosure) {
      list.setAttribute('role', 'region');
      if (!button.id) button.id = `ddbtn-${Math.random().toString(36).slice(2,8)}`;
      list.setAttribute('aria-labelledby', button.id);
      list.removeAttribute('tabindex'); // 혹시 -1 줬다면 제거 (포커스 주지 않음)
    }
  
    // 공통 ARIA
    if (!list.id) list.id = `dropdown-${Math.random().toString(36).slice(2,8)}`;
    button.setAttribute('aria-controls', list.id);
    button.setAttribute('aria-expanded', 'false');
  
    // 팝업형은 항목 tabindex -1
    if (isPopup) {
      items.forEach(item => item.setAttribute('tabindex', '-1'));
    }
  
    const cleanupFunctions = [];
    
    // NVDA 강제 포커스 모드(enforce/appRole) 팝업형에만 적용
    if (isPopup) {
      cleanupFunctions.push(a11y.enforceFocusMode(container));
    }

    let unbindEsc = null;
    let undoAppRole = null;
  
    // 같은 row 내 목록 너비 동기화(모바일 대응)
    const dropdownRow = container.closest('.dropdown-row');
    function updateDropdownWidth() {
      const isMobile = window.innerWidth <= 768;
      if (!dropdownRow) return;
      dropdownRow.querySelectorAll('.dropdown').forEach(d => {
        const btn = d.querySelector('.dropdown__button');
        const ul  = d.querySelector('.dropdown__list');
        if (!btn || !ul) return;
        ul.style.width = isMobile ? `${btn.getBoundingClientRect().width}px` : '100%';
      });
    }
    
    // 디바운싱 적용 (120ms)
    let resizeTid;
    function onResize() {
      clearTimeout(resizeTid);
      resizeTid = setTimeout(updateDropdownWidth, 120);
    }
    window.addEventListener('resize', onResize);
    updateDropdownWidth();
    cleanupFunctions.push(() => {
      clearTimeout(resizeTid); // 타이머도 정리
      window.removeEventListener('resize', onResize);
    });
  
    function doClose() {
      // 1) 시각 상태 먼저 내림
      list.classList.remove('show');
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
    
      // 2) ARIA만 먼저 내림(접근성 트리에선 닫혔다고 알림)
      list.setAttribute('aria-hidden', 'true');
    
      // 3) 팝업형 탭 진입 차단
      if (isPopup) {
        items.forEach(i => i.setAttribute('tabindex', '-1'));
      }
    
      // 4) ESC 해제 및 NVDA 우회 해제
      if (unbindEsc) { unbindEsc(); unbindEsc = null; }
      if (undoAppRole) { undoAppRole(); undoAppRole = null; }
    
      // 5) 애니메이션이 실제 끝난 뒤 하드 숨김 적용
      const hideHard = () => {
        // 재개방 중이면 중단 (닫힘 중 다시 열린 경우 보호)
        if (list.classList.contains('show')) return;
        list.hidden = true;
        if (SUPPORTS_INERT) list.setAttribute('inert', '');
        else list.style.pointerEvents = 'none';
        // 포커스 복귀
        requestAnimationFrame(() => button.focus({ preventScroll: true }));
      };
    
      const onEnd = (e) => {
        if (e.target !== list) return;
        list.removeEventListener('transitionend', onEnd);
        hideHard();
      };
      list.addEventListener('transitionend', onEnd);
    
      // 트랜지션 없는 환경 대비 타임아웃 가드
      const dur = parseFloat(getComputedStyle(list).transitionDuration) || 0;
      if (dur === 0) {
        hideHard();
      } else {
        setTimeout(hideHard, (dur + 0.05) * 1000);
      }
    }
    
  
    // 토글 바인딩
    cleanupFunctions.push(a11y.toggleExpandable(button, list, {
      onExpand: () => {
        setPanelVisibility(list, true);
        button.setAttribute('aria-expanded', 'true');
        button.classList.add('active');
        list.classList.add('show');
        
        // NVDA 우회는 팝업형에만 적용
        if (isPopup) {
          undoAppRole = a11y.applyAppRole(container);
        }

        // 포커스: 리스트 열리면 항목으로 이동(그래야 화살표 탐색이 작동)
        const seed = () => {
          if (dropdownType === 'listbox') { 
            (list.querySelector('.dropdown__item.selected') || items[0])?.focus(); 
          }
          else if (dropdownType === 'menu') { 
            items[0]?.focus(); 
          }
          // disclosure: 포커스 이동하지 않음 (버튼에 그대로 유지)
        };
        // NVDA가 모드 전환을 끝낸 뒤에 포커스를 주도록 2프레임 지연
        requestAnimationFrame(() => requestAnimationFrame(seed));
        
        unbindEsc = a11y.bindEscOnce([document, list], doClose);

        setTimeout(updateDropdownWidth, 10);
      },
      
      onCollapse: () => doClose()
    }));
    // 첫 화살표 탈취/로빙탭인덱스는 팝업형에만
    if (isPopup) {
      const stealFirstArrowInDropdown = (e) => {
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp')
            && ![...items].includes(document.activeElement)) {
          e.preventDefault();
          e.stopPropagation();
          const target = (e.key === 'ArrowDown') ? items[0] : items[items.length - 1];
          target?.focus();
        }
      };
      list.addEventListener('keydown', stealFirstArrowInDropdown, true);
      cleanupFunctions.push(() => list.removeEventListener('keydown', stealFirstArrowInDropdown, true));
    }   
  
    // 화살표 탐색(arrowNavigation)도 팝업형에서만 유지
    if (isPopup) {
      cleanupFunctions.push(a11y.arrowNavigation(list, '.dropdown__item', {
        onNavigate: (el) => el.focus()
      }));
    }
  
    // 포커스가 컴포넌트 밖으로 나가면 닫기
    cleanupFunctions.push(a11y.handleFocusOut(container, () => {
      if (list.classList.contains('show')) doClose();
    }));
  
    // 항목 이벤트(팝업형에서만)
    if (isPopup) {
      const itemCleanups = [];
      items.forEach(item => {
        const onItemClick = function() {
          if (this.getAttribute('aria-disabled') === 'true') return;
    
          if (dropdownType === 'listbox') {
            items.forEach(s => {
              s.classList.remove('selected');
              s.removeAttribute('aria-selected');
              s.querySelector('.dropdown__count')?.classList.remove('active');
            });
            this.classList.add('selected');
            this.setAttribute('aria-selected', 'true');
            this.querySelector('.dropdown__count')?.classList.add('active');
    
            const txt = this.querySelector('.dropdown__item-text')?.textContent || this.textContent;
            const btnText = button.querySelector('.dropdown__text');
            if (btnText) btnText.textContent = txt;
          } else if (dropdownType === 'menu') {
            const actionText = this.querySelector('.dropdown__item-text')?.textContent || this.textContent;
            console.log(`액션 실행: ${actionText}`);
          }
          doClose();
        };
    
        const onItemKeydown = function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
          }
          // Escape는 전역 keyup에서 처리
        };
    
        item.addEventListener('click', onItemClick);
        item.addEventListener('keydown', onItemKeydown);
        itemCleanups.push(() => {
          item.removeEventListener('click', onItemClick);
          item.removeEventListener('keydown', onItemKeydown);
        });
      });
      cleanupFunctions.push(() => itemCleanups.forEach(fn => fn()));
    }
  
    // 정리 핸들 반환
    return { cleanup: () => cleanupFunctions.forEach(fn => fn()) };
  };
  
  /**
   * 컴포넌트 초기화 - 셀렉트 컴포넌트 (다중 선택)
   * @param {HTMLElement|string} select - 셀렉트 요소 또는 선택자
   * @returns {Object} - 컴포넌트 제어 객체
  **/
  a11y.initMultiSelect = function(select) {

    function dispatchNativeChange(el) {
      try {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e1) {
        try {
          const evt = document.createEvent('Event');
          evt.initEvent('change', true, false);
          el.dispatchEvent(evt);
        } catch (e2) {
          try {
            if (window && window.App && window.App.env === 'dev') {
              console.warn('[a11y.dispatchNativeChange] failed', { el, e1, e2 });
            }
          } catch (_) { /* noop */ }
        }
      }
    }    

    // 문자열이면 선택자로 간주하고 요소 찾기
    const container = typeof select === 'string' ? document.querySelector(select) : select;
    if (!container) {
      console.warn('initMultiSelect: 컨테이너 요소를 찾을 수 없습니다.');
      return null;
    }
    
    const field = container.querySelector('.select__field');
    const options = container.querySelector('.select__options');
    const nativeSelect = container.querySelector('.select__native');
    
    // 필수 요소들 존재 여부 검증
    if (!field) {
      console.warn('initMultiSelect: .select__field 요소를 찾을 수 없습니다.');
      return null;
    }
    if (!options) {
      console.warn('initMultiSelect: .select__options 요소를 찾을 수 없습니다.');
      return null;
    }
    if (!nativeSelect) {
      console.warn('initMultiSelect: .select__native 요소를 찾을 수 없습니다.');
      return null;
    }
    
    const optionItems = options.querySelectorAll('.select__option');
    optionItems.forEach(item => item.setAttribute('role', 'option'));

    const tagsContainer = field; // 태그는 field 내부에 직접 추가됨

    // announcer 자동 생성(없으면)
    let announcer = container.querySelector('.visually-hidden[aria-live]');
    if (!announcer) {
      announcer = document.createElement('span');
      announcer.className = 'visually-hidden';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      container.appendChild(announcer);
    }

    // 스크린 리더 알림 함수 (중복 방지)
    let lastAnnouncement = '';
    const announce = (msg) => {
      // 같은 메시지가 연속으로 오는 경우 중복 방지
      if (lastAnnouncement === msg) {
        return;
      }
      lastAnnouncement = msg;
      
      announcer.textContent = '';
      void announcer.offsetHeight; // 강제 리플로우로 재공지 보장
      announcer.textContent = msg;
      // 다음 공지를 위해 잠시 후 리셋
      setTimeout(() => { lastAnnouncement = ''; }, 120); 
    };
    
    // 초기 상태 설정
    optionItems.forEach(item => item.setAttribute('tabindex', '-1'));
    field.setAttribute('aria-expanded', 'false');
    
    // 초기 aria-selected 동기화
    optionItems.forEach(el => el.setAttribute('aria-selected', el.classList.contains('selected') ? 'true' : 'false'));
    
    // 이벤트 핸들러 제거 함수들
    const cleanupFunctions = [];
    cleanupFunctions.push(a11y.enforceFocusMode(container));

    let releaseEsc = null; // ESC 해제 핸들
    
    // 옵션 컨테이너 ID/role 설정
    const optionsId =
      options.id ||
      (container.getAttribute('data-select-id')
        ? `${container.getAttribute('data-select-id')}-options`
        : `select-options-${Math.random().toString(36).slice(2, 8)}`);

    options.id = optionsId;

    // 트리거(필드)
    field.setAttribute('role', 'button');
    // aria-haspopup은 권장 사항 (선택적)
    // field.setAttribute('aria-haspopup', 'listbox');
    field.setAttribute('aria-controls', optionsId);
    if (!field.hasAttribute('aria-expanded')) field.setAttribute('aria-expanded', 'false');

    // 옵션 컨테이너
    options.setAttribute('role', 'listbox');
    options.setAttribute('aria-multiselectable', 'true');
    // 닫힘: 접근성 트리에서 제외 (CSS 애니메이션 유지)
    options.setAttribute('aria-hidden', 'true');
    // inert 속성은 브라우저 지원 확인 후 적용
    if (SUPPORTS_INERT) {
      options.setAttribute('inert', '');
    } else {
      // inert 폴백: 구형 브라우저용
      options.style.pointerEvents = 'none';
    }

    // roving tabindex 유틸
    function setActiveOption(target) {
      optionItems.forEach(item => item.setAttribute('tabindex', item === target ? '0' : '-1'));
      if (target) target.focus();
    }

    // 열기/닫기 유틸
    function openList({ focusFirst = true } = {}) {
      field.classList.add('active');
      field.setAttribute('aria-expanded', 'true');
      options.classList.add('show');
      // 열림: 접근성 트리에 노출 (CSS 애니메이션 유지)
      options.setAttribute('aria-hidden', 'false');
      if (SUPPORTS_INERT) options.removeAttribute('inert'); else options.style.pointerEvents = '';

      // NVDA 우회는 enforceFocusMode에서 자동 처리됨 (중복 제거)

      // 포커스/탐색 설정
      const focusSeed = () => {
        const first = optionItems[0];
        if (!first) return;
        if (focusFirst) setActiveOption(first);
        else if (![...optionItems].some(el => el.getAttribute('tabindex') === '0')) {
          setActiveOption(first);
        }
      };
      // NVDA가 role/aria 변화를 반영한 뒤에 포커스를 주도록 2프레임 지연
      requestAnimationFrame(() => requestAnimationFrame(focusSeed));      

      // ESC로 닫기: 사용자 의도적 닫기 → 필드로 포커스 복귀
      releaseEsc = a11y.bindEscOnce([document, options], () => {
        closeList({ focusField: true });
      });
    }

    // 옵션 컨테이너로 포커스가 아직 안 들어왔을 때, 첫 화살표로 강제 진입
    const stealFirstArrow = (e) => {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp')
          && ![...optionItems].includes(document.activeElement)) {
        e.preventDefault();
        e.stopPropagation();
        const target = (e.key === 'ArrowDown') ? optionItems[0] : optionItems[optionItems.length - 1];
        if (target) setActiveOption(target);
      }
    };
    options.addEventListener('keydown', stealFirstArrow, true);
    cleanupFunctions.push(() => options.removeEventListener('keydown', stealFirstArrow, true));

    function closeList({ focusField = false } = {}) {
      field.classList.remove('active');
      field.setAttribute('aria-expanded', 'false');
      options.classList.remove('show');
      options.setAttribute('aria-hidden', 'true');
      if (SUPPORTS_INERT) options.setAttribute('inert', ''); else options.style.pointerEvents = 'none';
      optionItems.forEach(item => item.setAttribute('tabindex', '-1'));

      // ESC 해제
      if (releaseEsc) { releaseEsc(); releaseEsc = null; }

      if (focusField) field.focus();
    }

    // 이벤트 리스너 생성 및 추가
    // function handleFieldKeydown(e) {
    //   if (e.defaultPrevented) return; // 이미 다른 로직에서 막힌 이벤트는 무시
    //   // Enter 또는 Space 키로 토글
    //   if (e.key === 'Enter' || e.key === ' ') {
    //     e.preventDefault();
    //     options.classList.contains('show') ? closeList({ focusField: false }) : openList();
    //   } else if (e.key === 'ArrowDown' && !field.classList.contains('active')) {
    //     // 아래 화살표 키를 누를 때 펼치기
    //     e.preventDefault();
    //     openList({ focusFirst: true });
    //   } else if (e.key === 'ArrowUp' && !field.classList.contains('active')) {
    //     // 위 화살표 키를 누를 때 펼치기 (마지막 항목에 포커스)
    //     e.preventDefault();
    //     openList({ focusFirst: false });
    //     if (optionItems.length) setActiveOption(optionItems[optionItems.length - 1]);
    //   }
    // }
    function handleFieldKeydown(e) {
      if (e.defaultPrevented) return; // 이미 다른 로직에서 막힌 이벤트는 무시
    
      // Enter 또는 Space 키로 토글
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        options.classList.contains('show') ? closeList({ focusField: false }) : openList();
    
      } else if (e.key === 'ArrowDown' && !field.classList.contains('active')) {
        // 아래 화살표 키를 누를 때 펼치기
        e.preventDefault();
        openList({ focusFirst: true });
    
      } else if (e.key === 'ArrowUp' && !field.classList.contains('active')) {
        // 위 화살표 키를 누를 때 펼치기 (마지막 항목에 포커스)
        e.preventDefault();
        openList({ focusFirst: false });
        if (optionItems.length) setActiveOption(optionItems[optionItems.length - 1]);
    
      // ★ [5-2 추가] Windows 네이티브 패턴: Alt+↑로 닫기
      } else if (e.key === 'ArrowUp' && e.altKey && field.classList.contains('active')) {
        e.preventDefault();
        closeList({ focusField: true }); // 닫고 트리거로 포커스 복귀
      }
    }
    
    
    field.addEventListener('keydown', handleFieldKeydown);
    cleanupFunctions.push(() => field.removeEventListener('keydown', handleFieldKeydown));
    
    // 화살표 키 탐색 설정 (roving tabindex 적용)
    cleanupFunctions.push(a11y.arrowNavigation(options, '.select__option', {
      onNavigate: (el) => setActiveOption(el)
    }));
    
    // 포커스 아웃으로 닫기: 자연스러운 포커스 이동 → 복귀 안함
    cleanupFunctions.push(a11y.handleFocusOut(container, () => {
      if (options.classList.contains('show')) {
        closeList({ focusField: false });
      }
    }));
    
    // 필드 클릭으로 닫기: 새로운 포커스 위치 → 복귀 안함
    const onFieldClick = function(event) {
      if (event.defaultPrevented) return; // 이미 방지된 클릭은 무시

      // 태그 내부의 삭제 버튼 클릭은 무시 (이벤트 전파 방지)
      if (event.target.closest('.select__tag-remove')) {
        return;
      }
      // 태그 내부 클릭(본문/삭제버튼 포함)은 토글 제외
      if (event.target.closest('.select__tag')) return;
      
      if (options.classList.contains('show')) {
        closeList({ focusField: false });
      } else {
        openList({ focusFirst: false });
      }
    };
    field.addEventListener('click', onFieldClick);
    cleanupFunctions.push(() => field.removeEventListener('click', onFieldClick));
    
    // 옵션 클릭/키보드 이벤트 설정
    const optionCleanups = [];
    optionItems.forEach(option => {
      const onOptClick = () => toggleOption(option);
      const onOptKeydown = (e) => { 
        if (e.key === 'Enter' || e.key === ' ') { 
          e.preventDefault(); 
          toggleOption(option); 
        } 
      };
      
      option.addEventListener('click', onOptClick);
      option.addEventListener('keydown', onOptKeydown);
      
      optionCleanups.push(() => {
        option.removeEventListener('click', onOptClick);
        option.removeEventListener('keydown', onOptKeydown);
      });
    });
    cleanupFunctions.push(() => optionCleanups.forEach(fn => fn()));

    // 태그 이벤트 위임 처리 (중복 이벤트 리스너 방지)
    function handleTagEvents(e) {
      const removeBtn = e.target.closest('.select__tag-remove');
      if (!removeBtn) return;

      // 1) 어떤 이벤트로 호출됐는지 필터링
      const isClick = e.type === 'click';
      const isKey = e.type === 'keydown' && (
        e.key === 'Enter' || e.key === ' ' || e.key === 'Backspace' || e.key === 'Delete'
      );
      if (!isClick && !isKey) return;

      // 2) 기본 동작 + 버블링 확실히 차단
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

      const tag = removeBtn.closest('.select__tag');
      if (!tag) return;

      const value = tag.getAttribute('data-value');
      const text  = tag.querySelector('.select__tag-text')?.textContent || '';

      // 3) 삭제 "전" 다음 포커스 대상 계산
      const nextFocus =
        tag.nextElementSibling?.querySelector('.select__tag-remove') ||
        tag.previousElementSibling?.querySelector('.select__tag-remove') ||
        field; // 모두 없으면 트리거로 복귀

      // 4) 커스텀 옵션 UI 선택 해제
      const optionToDeselect = Array.from(optionItems).find(opt => opt.getAttribute('data-value') === value);
      if (optionToDeselect) {
        optionToDeselect.classList.remove('selected');
        optionToDeselect.setAttribute('aria-selected', 'false');
      }

      // 5) 네이티브 <select multiple> 업데이트 + change 디스패치
      const nativeOpt = Array.from(nativeSelect.options).find(opt => opt.value === value);
      if (nativeOpt) {
        nativeOpt.selected = false;
        dispatchNativeChange(nativeSelect); // 기존 헬퍼 사용
      }

      // 6) 태그 제거
      tag.remove();
      if (options.classList.contains('show')) { closeList({ focusField: false }); }

      // 7) 플레이스홀더 표시/숨김
      const placeholder = field.querySelector('.select__placeholder');
      const hasTags = !!tagsContainer.querySelector('.select__tag');
      if (!hasTags && placeholder) {
        placeholder.style.display = '';
      }

      // 8) 포커스 이어주기 — click 재타기팅을 피하려고 한 틱 늦게
      setTimeout(() => {
        try { nextFocus?.focus(); } catch (e) {}
      }, 0);

      // 9) 스크린리더 알림
      announce(`'${text}' 항목이 제거되었습니다.`);
    }

    
    // 태그 키보드 접근성 설정 (이벤트 위임 사용)
    function setupTagsKeyboardAccess() {
      // 위임: click + keydown 모두 handleTagEvents 한 곳에서 처리
      tagsContainer.addEventListener('click', handleTagEvents);
      tagsContainer.addEventListener('keydown', handleTagEvents);

      cleanupFunctions.push(() => {
        tagsContainer.removeEventListener('click', handleTagEvents);
        tagsContainer.removeEventListener('keydown', handleTagEvents);
      });
    }
    
    // 옵션 토글 함수
    function toggleOption(option) {
      const value = option.getAttribute('data-value');
      const text = option.textContent.trim();
      
      // 선택 상태 토글
      option.classList.toggle('selected');
      const isSelected = option.classList.contains('selected');
      option.setAttribute('aria-selected', isSelected);
      
      // 네이티브 셀렉트 업데이트
      const nativeOption = Array.from(nativeSelect.options).find(opt => opt.value === value);
      if (nativeOption) {
        nativeOption.selected = isSelected;
        dispatchNativeChange(nativeSelect);
      }
      
      // 태그 추가 또는 제거
      if (isSelected) {
        // 이미 태그가 존재하는지 확인
        const existingTag = tagsContainer.querySelector(`.select__tag[data-value="${value}"]`);
        if (existingTag) return; // 이미 존재하면 중복 생성 방지
        
        // 플레이스홀더가 있으면 숨김
        const placeholder = field.querySelector('.select__placeholder');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
        
        // 태그 추가
        const tag = document.createElement('div');
        tag.className = 'select__tag';
        tag.setAttribute('tabindex', '-1'); // 태그 자체는 포커스 받지 않도록
        tag.setAttribute('data-value', value);
        
        const tagText = document.createElement('span');
        tagText.className = 'select__tag-text';
        tagText.textContent = text;
        tag.appendChild(tagText);
        
        const removeButtonElem = document.createElement('button');
        removeButtonElem.type = 'button';
        removeButtonElem.className = 'select__tag-remove tag__close dark-bg';
        removeButtonElem.setAttribute('aria-label', `${text} 항목 삭제`);
        removeButtonElem.setAttribute('tabindex', '0');
        removeButtonElem.innerHTML = `
          <i class="icon-bg icon-tag-close">
            <span class="visually-hidden">삭제</span>
          </i>
        `;
        tag.appendChild(removeButtonElem);
        
        tagsContainer.appendChild(tag);
        
        // 스크린 리더 알림
        announce(`'${text}' 항목이 선택되었습니다.`);
      } else {
        // 태그 제거
        const tagToRemove = tagsContainer.querySelector(`.select__tag[data-value="${value}"]`);
        if (tagToRemove) {
          tagToRemove.remove();
          
          // 태그가 하나도 없으면 플레이스홀더 표시
          const placeholder = field.querySelector('.select__placeholder');
          if (tagsContainer.querySelectorAll('.select__tag').length === 0 && placeholder) {
            placeholder.style.display = '';
          }
          
          // 스크린 리더 알림
          announce(`'${text}' 항목이 제거되었습니다.`);
        }
      }
    }
    
    // 초기 선택된 옵션에 대한 태그 생성
    optionItems.forEach(option => {
      if (option.classList.contains('selected')) {
        const value = option.getAttribute('data-value');
        const text = option.textContent.trim();
        
        // 플레이스홀더가 있으면 숨김
        const placeholder = field.querySelector('.select__placeholder');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
        
        const tag = document.createElement('div');
        tag.className = 'select__tag';
        tag.setAttribute('tabindex', '-1');
        tag.setAttribute('data-value', value);
        
        const tagText = document.createElement('span');
        tagText.className = 'select__tag-text';
        tagText.textContent = text;
        tag.appendChild(tagText);
        
        const removeButtonElem = document.createElement('button');
        removeButtonElem.type = 'button';
        removeButtonElem.className = 'select__tag-remove tag__close dark-bg';
        removeButtonElem.setAttribute('aria-label', `${text} 항목 삭제`);
        removeButtonElem.setAttribute('tabindex', '0');
        removeButtonElem.innerHTML = `
          <i class="icon-bg icon-tag-close">
            <span class="visually-hidden">삭제</span>
          </i>
        `;
        tag.appendChild(removeButtonElem);
        
        tagsContainer.appendChild(tag);
      }
    });
    
    // 초기 태그들의 키보드 접근성 설정 (이벤트 위임 사용)
    setupTagsKeyboardAccess(); 
    
    // 정리 함수 반환
    return {
      cleanup: () => cleanupFunctions.forEach(fn => fn())
    };
  };
  

  // =========================
  // 공통 메시지 매니저 (Form Messages)
  // .fd-field 단위 도움말↔오류 전환 + aria 자동 관리
  // data-ctrl, data-help, data-error, data-scope="group" 사용
  // =========================
  if (!a11y.formMsg) {
    const $$ = (root, sel) => Array.from(root.querySelectorAll(sel));
    const $  = (root, sel) => root.querySelector(sel);

    const getField = (target) => {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      return el?.closest('.fd-field') ?? null;
    };

    const getCtrlEls = (field) => {
      const sel = field.dataset.ctrl;
      if (sel) return $$(field, sel);
      const fs = $(field, 'fieldset');
      return fs ? $$(fs, 'input, select, textarea, .select__field')
                : $$(field, 'input, select, textarea, .select__field');
    };

    const getMsgEls = (field) => {
      const helpId = field.dataset.help;
      const errId  = field.dataset.error;
      return {
        help: helpId ? document.getElementById(helpId) : null,
        err : errId  ? document.getElementById(errId)  : null
      };
    };

    // aria-describedby 연결 대상(그룹이면 fieldset, 아니면 첫 컨트롤)
    const getDescTarget = (field, ctrls) => {
      if (field.dataset.scope === 'group') {
        const fs = $(field, 'fieldset');
        return fs ?? ctrls[0] ?? null;
      }
      return ctrls[0] ?? null;
    };

    const setDescribedBy = (el, ids = []) => {
      if (!el) return;
      ids.length ? el.setAttribute('aria-describedby', ids.join(' '))
                : el.removeAttribute('aria-describedby');
    };

    const setInvalid = (field, ctrls, on) => {
      const target = getDescTarget(field, ctrls); // 그룹이면 fieldset, 아니면 첫 컨트롤
      if (!target) return;
      if (on) target.setAttribute('aria-invalid', 'true');
      else target.removeAttribute('aria-invalid');
    };

    // hidden 속성과 보조 클래스 모두 지원(팀 CSS 상황 대응)
    const setHidden = (el, hidden) => {
      if (!el) return;
      el.hidden = hidden;
      el.classList.toggle('is-hidden', hidden);
    };

    const initField = (field) => {
      const { help, err } = getMsgEls(field);
      const ctrls  = getCtrlEls(field);
      const target = getDescTarget(field, ctrls);

      setHidden(err, true);          // 오류 기본 숨김
      setHidden(help, false);        // 도움말 기본 노출
      if (target && help) setDescribedBy(target, [help.id]);

      setInvalid(field, ctrls, false);
      field.classList.remove('is-error');
    };

    a11y.formMsg = {
      /** 문서/영역 초기화: 모든 .fd-field 초기 상태 세팅 */
      init: (root = document) => $$(root, '.fd-field').forEach(initField),

      /** 오류 표시: 도움말→오류 전환 + aria 토글 */
      showError: (target, message) => {
        const field = getField(target);
        if (!field) return;
        const { help, err } = getMsgEls(field);
        const ctrls  = getCtrlEls(field);
        const descT  = getDescTarget(field, ctrls);
        if (!err) return;

        if (typeof message === 'string') err.textContent = message;

        setHidden(err, false);
        setHidden(help, true);
        field.classList.add('is-error', 'fd-field--error');

        setInvalid(field, ctrls, true);
        if (descT) setDescribedBy(descT, [err.id]);

        // SR 재공지(같은 문구 반복 무시 방지)
        const txt = err.textContent;
        err.textContent = '';
        void err.offsetHeight; // 강제 리플로우
        err.textContent = txt;

        // 그룹 에러일 때 첫 체크박스로 포커스 유도(키보드/스크린리더 모두 편함)
        if (field.dataset.scope === 'group') {
          field.querySelector('input[type="checkbox"], input[type="radio"]')?.focus();
        }
      },

      /** 오류 해제: 오류 숨김 → 도움말 복귀 + aria 원복 */
      clearError: (target) => {
        const field = getField(target);
        if (!field) return;
        const { help, err } = getMsgEls(field);
        const ctrls  = getCtrlEls(field);
        const descT  = getDescTarget(field, ctrls);

        setHidden(err, true);
        setHidden(help, false);
        field.classList.remove('is-error', 'fd-field--error');

        setInvalid(field, ctrls, false);
        if (descT) help ? setDescribedBy(descT, [help.id]) : setDescribedBy(descT, []);
      }
    };
  }

  // 전역 네임스페이스 App.a11y 로 등록
  global.App.a11y = a11y;
})(window);