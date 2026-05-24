// api.js

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
    var response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body:   JSON.stringify(params)
    });
    var result = await response.json();
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
