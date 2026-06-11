// === support.js ===
// 路徑：js/pages/support.js
// 功能：客戶留言頁（登入後側邊欄）

async function loadSupport() {
  setContent('<div class="loading">載入客服留言...</div>');
  // 讀取此客戶的歷史留言
  var histRes = await apiCall({ action: 'getSupportLog', status: 'all' });
  // 非 admin 只能看自己的（API 層面已透過 clientId 控管）
  var history = [];
  if (histRes.success && Array.isArray(histRes.data)) {
    history = histRes.data.filter(function(r) {
      return r.client_id === authState.clientId;
    });
  }
  setContent(_buildSupportPage(history));
}

function _buildSupportPage(history) {
  // 歷史留言清單
  var histRows = history.length === 0
    ? '<p class="empty">尚無留言記錄</p>'
    : history.map(function(r) {
        var statusBadge = r.status === 'replied'
          ? '<span style="background:#06C755;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">已回覆</span>'
          : '<span style="background:#f39c12;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">待回覆</span>';
        return '<div class="card" style="margin-bottom:12px;padding:16px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<div style="font-weight:600;font-size:14px">' + _escS(r.subject) + '</div>' +
            statusBadge +
          '</div>' +
          '<div style="font-size:13px;color:#555;margin-bottom:8px;line-height:1.6">' + _escS(r.message) + '</div>' +
          '<div style="font-size:11px;color:#aaa">' + r.time + '</div>' +
          (r.reply
            ? '<div style="margin-top:12px;padding:12px;background:#f0f9f4;border-radius:8px;border-left:3px solid #06C755">' +
                '<div style="font-size:11px;color:#06C755;font-weight:600;margin-bottom:4px">✅ 客服回覆（' + r.reply_at + '）</div>' +
                '<div style="font-size:13px;color:#333;line-height:1.6">' + _escS(r.reply) + '</div>' +
              '</div>'
            : '') +
        '</div>';
      }).join('');

  return '' +
  '<h2 class="page-title">💬 聯絡我們</h2>' +

  // 留言表單
  '<div class="card" style="margin-bottom:24px">' +
    '<div style="font-weight:600;font-size:15px;margin-bottom:16px">📝 新增留言</div>' +

    '<div class="form-group">' +
      '<label>主旨</label>' +
      '<input type="text" id="supportSubject" placeholder="請簡述您的問題，例如：推播功能無法使用">' +
    '</div>' +

    '<div class="form-group">' +
      '<label>留言內容</label>' +
      '<textarea id="supportMessage" rows="5" placeholder="請詳細描述您遇到的問題或需要的協助..."></textarea>' +
    '</div>' +

    '<div class="form-group">' +
      '<label>您的 Email（回覆通知用）</label>' +
      '<input type="email" id="supportEmail" placeholder="your@email.com"' +
        ' value="' + _escS(authState.email || '') + '">' +
    '</div>' +

    '<div style="display:flex;justify-content:flex-end">' +
      '<button class="btn btn-primary" onclick="submitSupport()">送出留言</button>' +
    '</div>' +
  '</div>' +

  // 歷史記錄
  '<div style="font-weight:600;font-size:15px;margin-bottom:12px">📋 留言記錄</div>' +
  histRows;
}

async function submitSupport() {
  var subject = (document.getElementById('supportSubject').value || '').trim();
  var message = (document.getElementById('supportMessage').value || '').trim();
  var email   = (document.getElementById('supportEmail').value   || '').trim();

  if (!subject) { showToast('請填寫主旨', 'error'); return; }
  if (!message) { showToast('請填寫留言內容', 'error'); return; }
  if (!email)   { showToast('請填寫 Email', 'error'); return; }

  var btn = document.querySelector('[onclick="submitSupport()"]');
  if (btn) { btn.disabled = true; btn.textContent = '送出中...'; }

  var res = await apiCall({
    action:  'submitSupport',
    subject: subject,
    message: message,
    email:   email
  });

  if (btn) { btn.disabled = false; btn.textContent = '送出留言'; }

  if (res.success) {
    showToast(res.data.message || '留言已送出！', 'success');
    loadSupport(); // 重新整理，顯示新留言
  } else {
    showToast(res.message || '送出失敗', 'error');
  }
}

function _escS(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
