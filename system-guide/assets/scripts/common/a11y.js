/**
 * a11y.js - 접근성 관련 유틸리티 모음
 * 웹 접근성 표준(WCAG)을 준수하는 키보드 접근성 기능을 제공합니다.
 */
(function (global) {
  // 전역 객체 App이 없으면 생성
  global.App = global.App || {};
  
  // 접근성 유틸리티를 담을 객체
  const a11y = {};

  /**
   * 특정 컨테이너 내에서 포커스를 가두는 기능
   * @param {HTMLElement} container - 포커스를 가둘 컨테이너 요소
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
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
   */
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
    items.forEach(item => item.addEventListener('focus', handleFocus));

    return () => {
      container.removeEventListener('keydown', handleKeydown);
      items.forEach(item => item.removeEventListener('focus', handleFocus));
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
   */
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
   */
  a11y.toggleExpandable = function(trigger, target, options = {}) {
    const defaultOptions = {
      expandedClass: 'show',
      triggerActiveClass: 'active',
      onExpand: null,
      onCollapse: null
    };
    
    const settings = { ...defaultOptions, ...options };
    
    function toggle() {
      const isExpanded = trigger.classList.contains(settings.triggerActiveClass);
      
      // 상태 토글
      trigger.classList.toggle(settings.triggerActiveClass);
      target.classList.toggle(settings.expandedClass);
      
      // ARIA 속성 업데이트
      const newState = !isExpanded;
      trigger.setAttribute('aria-expanded', newState);
      
      // 디버깅 로그 추가
      console.log('toggleExpandable - 상태 변경:', newState ? '열림' : '닫힘', 
                 'trigger:', trigger, 
                 'target:', target,
                 'classes:', target.classList.contains(settings.expandedClass));
      
      // 콜백 호출
      if (newState && settings.onExpand) {
        settings.onExpand(trigger, target);
      } else if (!newState && settings.onCollapse) {
        settings.onCollapse(trigger, target);
      }
      
      return newState;
    }
    
    function handleClick(e) {
      // 태그 내부의 삭제 버튼 클릭은 무시 (이벤트 전파 방지)
      if (e.target.closest && e.target.closest('.select__tag-remove')) {
        return;
      }
      toggle();
    }
    
    function handleKeydown(e) {
      // Enter 또는 Space 키로 토글
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowDown' && !trigger.classList.contains(settings.triggerActiveClass)) {
        // 아래 화살표 키를 누를 때 펼치기
        e.preventDefault();
        if (toggle()) {
          // 첫 번째 아이템에 포커스
          setTimeout(() => {
            const firstItem = target.querySelector('[tabindex="0"]');
            if (firstItem) firstItem.focus();
          }, 10);
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
   */
  a11y.escapeHandler = function(container, closeCallback, focusAfterClose = null) {
    function handleKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCallback();
        
        if (focusAfterClose) {
          focusAfterClose.focus();
        }
      }
    }
    
    container.addEventListener('keydown', handleKeydown);
    
    return () => container.removeEventListener('keydown', handleKeydown);
  };

  /**
   * 포커스 이동 감지 및 처리
   * @param {HTMLElement} container - 포커스 이동을 감지할 컨테이너
   * @param {Function} onFocusOut - 포커스가 컨테이너 밖으로 나갈 때 호출할 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
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

    /**
 * 컴포넌트 초기화 - 드롭다운 컴포넌트
 * @param {HTMLElement|string} dropdown - 드롭다운 요소 또는 선택자
 * @returns {Object} - 컴포넌트 제어 객체
 */
a11y.initDropdown = function(dropdown) {
  // 문자열이면 선택자로 간주하고 요소 찾기
  const container = typeof dropdown === 'string' ? document.querySelector(dropdown) : dropdown;
  if (!container) return null;
  
  const button = container.querySelector('.dropdown__button');
  const list = container.querySelector('.dropdown__list');
  const items = list.querySelectorAll('.dropdown__item');
  
  // 초기 상태 설정
  items.forEach(item => item.setAttribute('tabindex', '-1'));
  button.setAttribute('aria-expanded', 'false');
  
  // 이벤트 핸들러 제거 함수들
  const cleanupFunctions = [];
  
  // 드롭다운이 속한 Row 찾기
  const dropdownRow = container.closest('.dropdown-row');
  
  // 모바일 환경에서도 너비를 올바르게 유지하기 위한 함수
  function updateDropdownWidth() {
    const isMobile = window.innerWidth <= 768;
    
    if (dropdownRow) {
      // 모든 열린 드롭다운 리스트의 너비를 조정
      const allDropdowns = dropdownRow.querySelectorAll('.dropdown');
      
      if (isMobile) {
        // 모바일에서는 버튼 너비와 동일하게 설정
        allDropdowns.forEach(dropdown => {
          const btn = dropdown.querySelector('.dropdown__button');
          const dropdownList = dropdown.querySelector('.dropdown__list');
          if (btn && dropdownList) {
            const btnRect = btn.getBoundingClientRect();
            dropdownList.style.width = btnRect.width + 'px';
          }
        });
      } else {
        // 데스크탑에서는 기본 너비 설정
        allDropdowns.forEach(dropdown => {
          const dropdownList = dropdown.querySelector('.dropdown__list');
          if (dropdownList) {
            dropdownList.style.width = '100%';
          }
        });
      }
    }
  }
  
  // 윈도우 리사이즈 이벤트에 등록
  window.addEventListener('resize', updateDropdownWidth);
  // 초기 실행
  updateDropdownWidth();
  
  // 정리 함수에 리사이즈 이벤트 제거 추가
  cleanupFunctions.push(() => window.removeEventListener('resize', updateDropdownWidth));
  
  // 펼침/접힘 기능 설정
    cleanupFunctions.push(a11y.toggleExpandable(button, list, {
      onExpand: () => {
        // 드롭다운이 열렸을 때 모든 항목에 tabindex 추가
        items.forEach(item => item.setAttribute('tabindex', '0'));
        
        // 드롭다운이 열릴 때 너비 재설정
        setTimeout(() => {
          // 모바일과 데스크탑 환경에 맞게 드롭다운 너비 조정
          updateDropdownWidth();
        }, 10);
        
        // 첫 번째 항목에 포커스 (옵션)
        // setTimeout(() => items[0].focus(), 10);
      },
      onCollapse: () => {
        // 드롭다운이 닫혔을 때 모든 항목에서 tabindex 제거
        items.forEach(item => item.setAttribute('tabindex', '-1'));
      }
    }));
    
    // 화살표 키 탐색 설정
    cleanupFunctions.push(a11y.arrowNavigation(list, '.dropdown__item'));
    
    // Escape 키로 닫기 설정
    cleanupFunctions.push(a11y.escapeHandler(list, () => {
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
      list.classList.remove('show');
      button.focus(); // 버튼으로 포커스 이동
      
      // tabindex 제거
      items.forEach(item => item.setAttribute('tabindex', '-1'));
    }));
    
    // 포커스 이동 감지
    cleanupFunctions.push(a11y.handleFocusOut(container, () => {
      // 포커스가 드롭다운 밖으로 나가면 닫기
      if (list.classList.contains('show')) {
        button.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
        list.classList.remove('show');
        
        // tabindex 제거
        items.forEach(item => item.setAttribute('tabindex', '-1'));
      }
    }));
    
    // 항목 클릭 이벤트 설정
    items.forEach(item => {
      item.addEventListener('click', function() {
        // 다른 항목에서 선택 상태 제거
        items.forEach(sibling => {
          sibling.classList.remove('selected');
          sibling.setAttribute('aria-selected', 'false');
          const countBadge = sibling.querySelector('.dropdown__count');
          if (countBadge) countBadge.classList.remove('active');
        });
        
        // 현재 항목에 선택 상태 추가
        this.classList.add('selected');
        this.setAttribute('aria-selected', 'true');
        const countBadge = this.querySelector('.dropdown__count');
        if (countBadge) countBadge.classList.add('active');
        
        // 드롭다운 버튼 텍스트 업데이트
        const buttonText = this.querySelector('.dropdown__item-text').textContent;
        const buttonTextElement = button.querySelector('.dropdown__text');
        if (buttonTextElement) {
          buttonTextElement.textContent = buttonText;
        }
        
        // 드롭다운 닫기
        button.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
        list.classList.remove('show');
        
        // tabindex 제거
        items.forEach(item => item.setAttribute('tabindex', '-1'));
      });
      
      // 키보드 이벤트 설정
      item.addEventListener('keydown', function(e) {
        // Enter 또는 Space 키로 항목 선택
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click(); // 클릭 이벤트 트리거
          button.focus(); // 버튼으로 포커스 이동
        }
      });
    });
    
    // 정리 함수 반환
    return {
      cleanup: () => cleanupFunctions.forEach(fn => fn())
    };
  };

  /**
   * 컴포넌트 초기화 - 셀렉트 컴포넌트 (다중 선택)
   * @param {HTMLElement|string} select - 셀렉트 요소 또는 선택자
   * @returns {Object} - 컴포넌트 제어 객체
   */
  a11y.initMultiSelect = function(select) {
    // 문자열이면 선택자로 간주하고 요소 찾기
    const container = typeof select === 'string' ? document.querySelector(select) : select;
    if (!container) return null;
    
    const field = container.querySelector('.select__field');
    const options = container.querySelector('.select__options');
    const optionItems = options.querySelectorAll('.select__option');
    const tagsContainer = field; // 태그는 field 내부에 직접 추가됨
    const nativeSelect = container.querySelector('.select__native');
    const announcer = container.querySelector('.visually-hidden[aria-live]');
    
    // 초기 상태 설정
    optionItems.forEach(item => item.setAttribute('tabindex', '-1'));
    field.setAttribute('aria-expanded', 'false');
    
    // 이벤트 핸들러 제거 함수들
    const cleanupFunctions = [];
    
    // 이미 field에 직접 click 이벤트가 바인딩되어 있으므로 toggleExpandable 함수 사용을 제거
    field.setAttribute('aria-controls', 'select-options'); // ID가 아닌 클래스 이름 사용
    
    // 이벤트 리스너 생성 및 추가
    function handleFieldKeydown(e) {
      // Enter 또는 Space 키로 토글
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        
        const isExpanded = options.classList.contains('show');
        
        if (isExpanded) {
          // 닫기
          field.classList.remove('active');
          field.setAttribute('aria-expanded', 'false');
          options.classList.remove('show');
          optionItems.forEach(item => item.setAttribute('tabindex', '-1'));
        } else {
          // 열기
          field.classList.add('active');
          field.setAttribute('aria-expanded', 'true');
          options.classList.add('show');
          optionItems.forEach(item => item.setAttribute('tabindex', '0'));
        }
      } else if (e.key === 'ArrowDown' && !field.classList.contains('active')) {
        // 아래 화살표 키를 누를 때 펼치기
        e.preventDefault();
        field.classList.add('active');
        field.setAttribute('aria-expanded', 'true');
        options.classList.add('show');
        optionItems.forEach(item => item.setAttribute('tabindex', '0'));
        
        // 첫 번째 항목에 포커스
        setTimeout(() => {
          if (optionItems[0]) optionItems[0].focus();
        }, 10);
      }
    }
    
    field.addEventListener('keydown', handleFieldKeydown);
    cleanupFunctions.push(() => field.removeEventListener('keydown', handleFieldKeydown));
    
    // 화살표 키 탐색 설정
    cleanupFunctions.push(a11y.arrowNavigation(options, '.select__option'));
    
    // Escape 키로 닫기 설정
    cleanupFunctions.push(a11y.escapeHandler(options, () => {
      field.classList.remove('active');
      field.setAttribute('aria-expanded', 'false');
      options.classList.remove('show');
      field.focus(); // 필드로 포커스 이동
      
      // tabindex 제거
      optionItems.forEach(item => item.setAttribute('tabindex', '-1'));
    }));
    
    // 포커스 이동 감지
    cleanupFunctions.push(a11y.handleFocusOut(container, () => {
      // 포커스가 셀렉트 밖으로 나가면 닫기
      if (options.classList.contains('show')) {
        field.classList.remove('active');
        field.setAttribute('aria-expanded', 'false');
        options.classList.remove('show');
        
        // tabindex 제거
        optionItems.forEach(item => item.setAttribute('tabindex', '-1'));
      }
    }));
    
    // 필드 클릭 시 직접 토글 처리 (toggleExpandable에만 의존하지 않음)
    field.addEventListener('click', function(event) {
      // 태그 내부의 삭제 버튼 클릭은 무시 (이벤트 전파 방지)
      if (event.target.closest('.select__tag-remove')) {
        return;
      }
      
      const isExpanded = options.classList.contains('show');
      
      if (isExpanded) {
        // 닫기
        field.classList.remove('active');
        field.setAttribute('aria-expanded', 'false');
        options.classList.remove('show');
        optionItems.forEach(item => item.setAttribute('tabindex', '-1'));
      } else {
        // 열기
        field.classList.add('active');
        field.setAttribute('aria-expanded', 'true');
        options.classList.add('show');
        optionItems.forEach(item => item.setAttribute('tabindex', '0'));
      }
    });
    
    // 옵션 클릭 이벤트 설정
    optionItems.forEach(option => {
      option.addEventListener('click', function() {
        toggleOption(this);
      });
      
      // 키보드 이벤트 설정
      option.addEventListener('keydown', function(e) {
        // Enter 또는 Space 키로 옵션 토글
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleOption(this);
        }
      });
    });
    
    // 태그 키보드 접근성 설정
    function setupTagsKeyboardAccess() {
      const removeButtons = tagsContainer.querySelectorAll('.select__tag-remove');
      
      removeButtons.forEach(button => {
        // 키보드 이벤트 설정 (삭제 버튼에만 적용)
        button.addEventListener('keydown', function(e) {
          // Enter, Space 키로 태그 삭제
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
          }
        });
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
      }
      
      // 태그 추가 또는 제거
      if (isSelected) {
        // 플레이스홀더가 있으면 숨김
        const placeholder = field.querySelector('.select__placeholder');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
        
        // 태그 추가
        const tag = document.createElement('div');
        tag.className = 'select__tag';
        tag.setAttribute('tabindex', '-1'); // 태그 자체는 포커스 받지 않도록 변경
        tag.setAttribute('data-value', value);
        
        // 텍스트 부분 추가
        const tagText = document.createElement('span');
        tagText.className = 'select__tag-text';
        tagText.textContent = text;
        tag.appendChild(tagText);
        
        // 삭제 버튼 추가 (태그 컴포넌트 스타일 활용)
        const removeButtonElem = document.createElement('button');
        removeButtonElem.type = 'button';
        removeButtonElem.className = 'select__tag-remove tag__close dark-bg';
        removeButtonElem.setAttribute('aria-label', `${text} 항목 삭제`);
        removeButtonElem.setAttribute('tabindex', '0'); // 삭제 버튼만 포커스 가능하도록
        removeButtonElem.innerHTML = `
          <i class="icon-bg icon-tag-close">
            <span class="visually-hidden">삭제</span>
          </i>
        `;
        tag.appendChild(removeButtonElem);
        
        // 태그 삭제 버튼 이벤트
        const removeButton = tag.querySelector('.select__tag-remove');
        removeButton.addEventListener('click', function(e) {
          e.stopPropagation();
          
          // 옵션 선택 해제
          const optionToDeselect = Array.from(optionItems).find(opt => opt.getAttribute('data-value') === value);
          if (optionToDeselect) {
            optionToDeselect.classList.remove('selected');
            optionToDeselect.setAttribute('aria-selected', 'false');
          }
          
          // 네이티브 셀렉트 업데이트
          const nativeOption = Array.from(nativeSelect.options).find(opt => opt.value === value);
          if (nativeOption) {
            nativeOption.selected = isSelected;
          }
          
          // 태그 제거
          tag.remove();
          
          // 태그가 하나도 없으면 플레이스홀더 표시
          const placeholder = field.querySelector('.select__placeholder');
          if (tagsContainer.querySelectorAll('.select__tag').length === 0 && placeholder) {
            placeholder.style.display = '';
          }
          
          // 스크린 리더 알림
          if (announcer) {
            announcer.textContent = `${text} 항목이 제거되었습니다.`;
          }
        });
        
        // 태그 자체에는 키보드 이벤트 필요 없음 (삭제 버튼에만 적용)
        
        tagsContainer.appendChild(tag);
        
        // 스크린 리더 알림
        if (announcer) {
          announcer.textContent = `${text} 항목이 선택되었습니다.`;
        }
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
          if (announcer) {
            announcer.textContent = `${text} 항목이 제거되었습니다.`;
          }
        }
      }
      
      // 기존 태그들의 키보드 접근성 설정
      setupTagsKeyboardAccess();
    }
    
    // 초기 선택된 옵션에 대한 태그 생성
    optionItems.forEach(option => {
      if (option.classList.contains('selected')) {
        const value = option.getAttribute('data-value');
        const text = option.textContent.trim();
        
        // 태그 추가
        const tag = document.createElement('div');
        tag.className = 'select__tag';
        tag.setAttribute('tabindex', '-1'); // 태그 자체는 포커스 받지 않도록 변경
        tag.setAttribute('data-value', value);
        
        // 텍스트 부분 추가
        const tagText = document.createElement('span');
        tagText.className = 'select__tag-text';
        tagText.textContent = text;
        tag.appendChild(tagText);
        
        // 삭제 버튼 추가 (태그 컴포넌트 스타일 활용)
        const removeButtonElem = document.createElement('button');
        removeButtonElem.type = 'button';
        removeButtonElem.className = 'select__tag-remove tag__close';
        removeButtonElem.setAttribute('aria-label', `${text} 항목 삭제`);
        removeButtonElem.setAttribute('tabindex', '0'); // 삭제 버튼만 포커스 가능하도록
        removeButtonElem.innerHTML = `
          <i class="icon-bg icon-tag-close">
            <span class="visually-hidden">삭제</span>
          </i>
        `;
        tag.appendChild(removeButtonElem);
        
        // 태그 삭제 버튼 이벤트
        const removeButton = tag.querySelector('.select__tag-remove');
        removeButton.addEventListener('click', function(e) {
          e.stopPropagation();
          
          // 옵션 선택 해제
          option.classList.remove('selected');
          option.setAttribute('aria-selected', 'false');
          
          // 네이티브 셀렉트 업데이트
          const nativeOption = Array.from(nativeSelect.options).find(opt => opt.value === value);
          if (nativeOption) {
            nativeOption.selected = false;
          }
          
          // 태그 제거
          tag.remove();
          
          // 태그가 하나도 없으면 플레이스홀더 표시
          const placeholder = field.querySelector('.select__placeholder');
          if (tagsContainer.querySelectorAll('.select__tag').length === 0 && placeholder) {
            placeholder.style.display = '';
          }
          
          // 스크린 리더 알림
          if (announcer) {
            announcer.textContent = `${text} 항목이 제거되었습니다.`;
          }
        });
        
        tagsContainer.appendChild(tag);
      }
    });
    
    // 초기 태그들의 키보드 접근성 설정
    setupTagsKeyboardAccess();
    
    // 정리 함수 반환
    return {
      cleanup: () => cleanupFunctions.forEach(fn => fn())
    };
  };

  // 전역 네임스페이스 App.a11y 로 등록
  global.App.a11y = a11y;
})(window);
