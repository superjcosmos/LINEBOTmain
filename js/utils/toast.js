// js/utils/toast.js
// Toast 通知

var _toastTimer = null;

function showToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;

  // 清除舊的 timer
  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }

  toast.textContent = message;
  toast.className   = 'toast show';

  if (type === 'success') toast.classList.add('toast-success');
  if (type === 'error')   toast.classList.add('toast-error');

  _toastTimer = setTimeout(function() {
    toast.className = 'toast';
  }, 3000);
}
