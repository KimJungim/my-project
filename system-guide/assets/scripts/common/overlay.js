// overlay.js (공통 Overlay 관리, 전역 등록)
(function (global) {
  // 전역 객체 App이 없으면 생성
  global.App = global.App || {};

  const overlayElement = document.querySelector('.overlay');

  function open() {
    overlayElement.classList.add('is-open');
  }

  function close() {
    overlayElement.classList.remove('is-open');
  }

  function onClick(callback) {
    overlayElement.addEventListener('click', callback);
  }

  // 전역 네임스페이스 App.overlay 로 등록
  global.App.overlay = { open, close, onClick };
})(window);