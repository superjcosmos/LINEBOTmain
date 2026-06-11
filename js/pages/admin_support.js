// === admin_support.js ===
// 路徑：js/pages/admin_support.js
// 功能：管理者客服留言獨立頁面（側邊欄直接進入）

var _supportAll      = [];
var _supportFiltered = [];
var _supportFilter   = 'all';

async function loadAdminSupport() {
  setContent('<div class="loading">載入客服留言...</div>');
  var res     = await apiCall({ action: 'getSupportLog', status: 'all' });
  _supportAll = res.success && Array.isArray(res.data) ? res.data : [];
  _supportFilter   = 'all';
  _supportFiltered = _supportAll.slice();

  // 更新側邊欄徽章
  _updateSupportBadge(_supportAll.filter(function(t){ return t.status === 'pending'; }).length);

  setContent(_buildSupportAdminPage());
}

function _buildSupportAdminPage() {
  var pending = _supportAll.filter(function(t){ return t.status === 'pending'; }).length;

  return '' +
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
    '<h2 class="page-title" style="margin-bottom:0">💬 客服留言管理' +
      (pending > 0
        ? ' <span style="background:#e74c3c;color:#fff;padding:2px 10px;border-radius:12px;font-size:13px;margin-left:8px">' + pending + ' 則待回覆</span>'
        : ' <span style="background:#06C755;color:#fff;padding:2px 10px;border-radius:12px;font-size:13px;margin-left:8px">全部已回覆</span>') +
    '</h2>' +
    '<div style="display:flex;gap:6px">' +
      '<button onclick="_setSupportFilter(\'all\')"     id="sfAll"     style="padding:7px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:#1a1a2e;color:#fff">全部（' + _supportAll.length + '）</button>' +
      '<button onclick="_setSupportFilter(\'pending\')" id="sfPending" style="padding:7px 16px;border-radius:8px;border:1.5px solid #e0e0e0;cursor:pointer;font-size:13px;font-weight:600;background:#fff;color:#444">待回覆（' + pending + '）</button>' +
      '<button onclick="_setSupportFilter(\'replied\')" id="sfReplied" style="padding:7px 16px;border-radius:8px;border:1.5px solid #e0e0e0;cursor:pointer;font-size:13px;font-weight:600;background:#fff;color:#444">已回覆（' + (_supportAll.length - pending) + '）</button>' +
    '</div>' +
  '</div>' +
  '<div id="supportList">' + _renderSupportList(_supportAll) + '</div>';
}

function _renderSupportList(tickets) {
  if (!tickets || tickets.length === 0) {
    return '<div class="card" style="text-align:center;padding:40px;color:#888">📭 目前沒有留言</div>';
  }
  return tickets.map(function(t) {
    var isPending = t.status !== 'replied';
    var statusBadge = isPending
      ? '<span style="background:#fff3f3;color:#e74c3c;padding:3px 10px;border-radius:10px;font-size:12px;border:1px solid #fcc">待回覆</span>'
      : '<span style="background:#f0f9f4;color:#06C755;padding:3px 10px;border-radius:10px;font-size:12px;border:1px solid #c3e6cb">已回覆</span>';
    return '<div class="card" style="margin-bottom:12px;padding:18px 20px;' +
        (isPending ? 'border-left:3px solid #e74c3c;' : 'border-left:3px solid #06C755;') + '">' +

      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
        '<div>' +
          '<div style="font-weight:600;font-size:15px;margin-bottom:4px">' + _escSup(t.subject) + '</div>' +
          '<div style="font-size:12px;color:#888">' +
            '<span style="margin-right:12px">🏢 ' + _escSup(t.company || t.client_id) + '</span>' +
            '<span style="margin-right:12px">📧 ' + _escSup(t.email) + '</span>' +
            '<span>🕐 ' + _escSup(t.time) + '</span>' +
          '</div>' +
        '</div>' +
        statusBadge +
      '</div>' +

      '<div style="background:#f8f9fa;border-radius:8px;padding:12px;font-size:13px;color:#444;line-height:1.7;margin-bottom:' + (isPending ? '12px' : '0') + '">' +
        _escSup(t.message) +
      '</div>' +

      (t.reply
        ? '<div style="background:#f0f9f4;border-radius:8px;padding:12px;font-size:13px;margin-top:10px;border-left:3px solid #06C755">' +
            '<div style="font-size:11px;color:#06C755;font-weight:600;margin-bottom:4px">✅ 已回覆（' + _escSup(t.reply_at) + '）</div>' +
            '<div style="color:#333;line-height:1.7">' + _escSup(t.reply) + '</div>' +
          '</div>'
        : '') +

      (isPending
        ? '<div style="display:flex;gap:8px;align-items:center;margin-top:12px">' +
            '<input type="text" id="replyInput_' + _escSup(t.id) + '" placeholder="輸入回覆內容，送出後將 Email 通知客戶..."' +
              ' style="flex:1;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none"' +
              ' onkeydown="if(event.key===\'Enter\')replySupportMsg(\'' + _escSup(t.id) + '\')">' +
            '<button onclick="replySupportMsg(\'' + _escSup(t.id) + '\')"' +
              ' style="background:#06C755;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap">' +
              '送出回覆' +
            '</button>' +
          '</div>'
        : '') +

    '</div>';
  }).join('');
}

function _setSupportFilter(status) {
  _supportFilter   = status;
  _supportFiltered = status === 'all'
    ? _supportAll.slice()
    : _supportAll.filter(function(t) { return t.status === status; });

  var list = document.getElementById('supportList');
  if (list) list.innerHTML = _renderSupportList(_supportFiltered);

  ['All','Pending','Replied'].forEach(function(s) {
    var btn = document.getElementById('sf' + s);
    if (!btn) return;
    var isActive = s.toLowerCase() === status;
    btn.style.background = isActive ? '#1a1a2e' : '#fff';
    btn.style.color      = isActive ? '#fff'    : '#444';
    btn.style.border     = isActive ? 'none'    : '1.5px solid #e0e0e0';
  });
}

async function replySupportMsg(ticketId) {
  var input = document.getElementById('replyInput_' + ticketId);
  var reply = input ? input.value.trim() : '';
  if (!reply) { showToast('請填寫回覆內容', 'error'); return; }

  var btn = input ? input.nextElementSibling : null;
  if (btn) { btn.disabled = true; btn.textContent = '送出中...'; }

  var res = await apiCall({ action: 'replySupport', id: ticketId, reply: reply });

  if (btn) { btn.disabled = false; btn.textContent = '送出回覆'; }

  if (res.success) {
    showToast(res.data.message || '回覆已送出', 'success');
    loadAdminSupport(); // 重新整理並更新徽章
  } else {
    showToast(res.message || '回覆失敗', 'error');
  }
}

// ── 更新側邊欄徽章 ──
function _updateSupportBadge(count) {
  var badge = document.getElementById('supportNavBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function _escSup(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
