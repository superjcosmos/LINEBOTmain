// js/api.js
// ⚠️ 2026-10-25 修正（批次 3 健檢）：
//   FE26：apiCall 新增選用第二參數 opts，{ silent: true } 時不顯示遮罩、連線失敗不跳 toast（供背景輪詢使用）
//   FE27：遮罩改用計數，多個請求同時進行時，全部完成才關閉
//   FE16：verify 也納入連線失敗重試（純查詢，重試無副作用）

var _apiLoadingCount = 0;

function showLoading() {
  _apiLoadingCount++;
  var el = document.getElementById('global-loading');
  if (el) el.style.display = 'flex';
}

function hideLoading() {
  _apiLoadingCount = Math.max(0, _apiLoadingCount - 1);
  if (_apiLoadingCount > 0) return;
  var el = document.getElementById('global-loading');
  if (el) el.style.display = 'none';
}

async function apiCall(params, opts) {
  var silent = !!(opts && opts.silent);
  if (!silent) showLoading();
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
    // 2026-10-25：verify 也納入（FE16）
    var isRead = typeof params.action === 'string' &&
      (params.action.indexOf('get') === 0 || params.action === 'verify');
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
    // ⚠️ auth.js 的 verifyAndEnter 以 message === '連線失敗' 判斷連線問題，改這段文字時要一起改
    if (!silent) showToast('連線失敗，請稍後再試', 'error');
    return { success: false, message: '連線失敗' };
  } finally {
    if (!silent) hideLoading();
  }
}
