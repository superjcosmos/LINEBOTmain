// js/api.js

function showLoading() {
  var el = document.getElementById('global-loading');
  if (el) el.style.display = 'flex';
}

function hideLoading() {
  var el = document.getElementById('global-loading');
  if (el) el.style.display = 'none';
}

async function apiCall(params) {
  showLoading();
  try {
    var token = localStorage.getItem('sessionToken');
    if (token && params.action !== 'login') {
      params.sessionToken = token;
    }
    // 2026-10-04：切換視角預覽中，每個請求自動帶上被預覽客戶的ID，後端確認是管理者後以客戶身分執行
    // 呼叫端若已自行指定（impersonateClient 切換前預查 features）則不覆蓋
    if (authState.role === 'client_preview' && authState.clientId && !params.impersonate_client_id) {
      params.impersonate_client_id = authState.clientId;
    }
    // 2026-10-12：讀取類請求（get 開頭）連線失敗時自動重試 1 次；寫入類不重試，避免重複寫入
    var isRead = typeof params.action === 'string' && params.action.indexOf('get') === 0;
    var maxAttempts = isRead ? 2 : 1;
    var result = null;
    for (var attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        var response = await fetch(CONFIG.API_URL, {
          method: 'POST',
          body:   JSON.stringify(params)
        });
        result = await response.json();
        break;
      } catch (fetchErr) {
        if (attempt >= maxAttempts) throw fetchErr;
        await new Promise(function(resolve) { setTimeout(resolve, 800); });
      }
    }
    if (!result.success && result.message === '請重新登入') {
      clearSession();
      showLoginPage();
    }
    return result;
  } catch(err) {
    showToast('連線失敗，請稍後再試', 'error');
    return { success: false, message: '連線失敗' };
  } finally {
    hideLoading();
  }
}
