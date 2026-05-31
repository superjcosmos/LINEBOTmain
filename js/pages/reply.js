// ============================================================
// js/pages/reply.js
// ============================================================

var _replyAll      = [];
var _replyFiltered = [];
var _replyPage     = 1;
var _replyPageSize = 20;
var _replyEditIndex = null;

// ────────────────────────────────────────────────────────────
// 載入頁面
// ────────────────────────────────────────────────────────────
async function loadReply() {
  setContent('<div class="loading">載入中...</div>');

  var res = await apiCall({ action: 'getReplySettings' });
  if (!res.success) {
    setContent('<div class="empty">載入失敗：' + res.message + '</div>');
    return;
  }

  _replyAll      = res.data || [];
  _replyFiltered = _replyAll.slice();
  _replyPage     = 1;

  setContent(_buildReplyShell());
  _renderReplyTable();
  _renderReplyPager();
}

// ────────────────────────────────────────────────────────────
// 頁面骨架
// ────────────────────────────────────────────────────────────
function _buildReplyShell() {
  return '' +
    '<h2 class="page-title">自動回覆設定</h2>' +
    '<div class="card">' +
      '<div class="toolbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
        '<button class="btn btn-primary" onclick="openReplyCreateModal()">＋ 新增回覆</button>' +
        '<input type="text" id="replySearch" placeholder="搜尋關鍵字或內容..."' +
          ' oninput="filterReply()"' +
          ' style="flex:1;min-width:180px;max-width:320px;padding:8px 12px;' +
                  'border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;">' +
        '<span id="replyTotalHint" style="color:#888;font-size:13px;white-space:nowrap;"></span>' +
      '</div>' +
      '<div id="replyTableWrap"></div>' +
      '<div id="replyPager" style="display:flex;justify-content:center;gap:6px;margin-top:16px;flex-wrap:wrap;"></div>' +
    '</div>' +

    // ── 新增 / 編輯 Modal ──
    '<div class="modal-overlay" id="replyModal">' +
      '<div class="modal" style="max-width:520px;">' +
        '<h3 id="replyModalTitle">新增回覆</h3>' +

        '<div class="form-group">' +
          '<label>觸發關鍵字</label>' +
          '<input type="text" id="replyKeyword" placeholder="例如：你好">' +
        '</div>' +

        '<div class="form-group">' +
          '<label>回覆內容</label>' +
          '<textarea id="replyContent" rows="3" placeholder="例如：哈囉！感謝你的訊息"' +
            ' style="width:100%;padding:8px 10px;border:1.5px solid #e0e0e0;' +
                    'border-radius:8px;font-size:14px;resize:vertical;' +
                    'box-sizing:border-box;outline:none;"></textarea>' +
        '</div>' +

        '<div class="form-group" style="display:flex;gap:12px;">' +
          '<div style="flex:1;">' +
            '<label>開始時間</label>' +
            '<input type="time" id="replyStartTime" value="00:00">' +
          '</div>' +
          '<div style="flex:1;">' +
            '<label>結束時間</label>' +
            '<input type="time" id="replyEndTime" value="23:59">' +
          '</div>' +
        '</div>' +

        '<div class="form-group">' +
          '<label>適用星期</label>' +
          '<div id="replyWeekWrap" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">' +
            _buildWeekCheckboxes() +
          '</div>' +
        '</div>' +

        '<div class="form-group">' +
          '<label>狀態</label>' +
          '<select id="replyStatus">' +
            '<option value="啟用">啟用</option>' +
            '<option value="停用">停用</option>' +
          '</select>' +
        '</div>' +

        // ── 同步建立受眾（僅新增時顯示）──
        '<div id="replyAudSection">' +
          '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;' +
                         'font-size:14px;color:#444;user-select:none;">' +
            '<input type="checkbox" id="replyCreateAud" onchange="toggleReplyAudField()"' +
                   ' style="width:16px;height:16px;cursor:pointer;">' +
            '同時建立受眾（用此關鍵字觸發加入）' +
          '</label>' +
          '<div id="replyAudField" style="display:none;margin-top:10px;">' +
            '<label style="font-size:13px;color:#666;display:block;margin-bottom:4px;">' +
              '受眾名稱（留空則使用關鍵字作為名稱）' +
            '</label>' +
            '<input type="text" id="replyAudName"' +
              ' placeholder="例如：VIP客戶（留空則用關鍵字）"' +
              ' style="width:100%;padding:8px 10px;border:1.5px solid #e0e0e0;' +
                      'border-radius:8px;font-size:14px;box-sizing:border-box;outline:none;">' +
          '</div>' +
        '</div>' +

        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeReplyModal()">取消</button>' +
          '<button class="btn btn-primary" id="replySaveBtn" onclick="saveReply()">新增</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function _buildWeekCheckboxes() {
  var days   = ['一','二','三','四','五','六','日'];
  var values = ['1','2','3','4','5','6','0'];
  return days.map(function(d, i) {
    return '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;">' +
      '<input type="checkbox" class="replyWeek" value="' + values[i] + '" checked> 週' + d +
    '</label>';
  }).join('');
}

// ────────────────────────────────────────────────────────────
// 同步建立受眾切換
// ────────────────────────────────────────────────────────────
function toggleReplyAudField() {
  var checked = document.getElementById('replyCreateAud').checked;
  document.getElementById('replyAudField').style.display = checked ? 'block' : 'none';
}

// ────────────────────────────────────────────────────────────
// 搜尋過濾
// ────────────────────────────────────────────────────────────
function filterReply() {
  var kw = (document.getElementById('replySearch').value || '').trim().toLowerCase();
  _replyFiltered = kw
    ? _replyAll.filter(function(r) {
        return (r.keyword || '').toLowerCase().includes(kw) ||
               (r.content || '').toLowerCase().includes(kw);
      })
    : _replyAll.slice();
  _replyPage = 1;
  _renderReplyTable();
  _renderReplyPager();
}

// ────────────────────────────────────────────────────────────
// 渲染表格
// ────────────────────────────────────────────────────────────
function _renderReplyTable() {
  var wrap = document.getElementById('replyTableWrap');
  var hint = document.getElementById('replyTotalHint');
  if (!wrap) return;

  var total = _replyFiltered.length;
  if (hint) hint.textContent = '共 ' + total + ' 筆';

  if (total === 0) {
    wrap.innerHTML = '<p class="empty">尚無自動回覆設定</p>';
    return;
  }

  var start = (_replyPage - 1) * _replyPageSize;
  var page  = _replyFiltered.slice(start, Math.min(start + _replyPageSize, total));

  var rows = page.map(function(r) {
    var statusColor = r.status === '啟用' ? '#06C755' : '#aaa';
    // ← 改成傳 r.index（數字），不傳 JSON，避免引號問題
    return '<tr>' +
      '<td>' + _escR(r.keyword) + '</td>' +
      '<td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
        _escR(r.content) + '</td>' +
      '<td>' + _escR(r.start_time) + ' ~ ' + _escR(r.end_time) + '</td>' +
      '<td>' + _escR(r.week) + '</td>' +
      '<td><span style="color:' + statusColor + ';font-weight:600;">' + _escR(r.status) + '</span></td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-edit" onclick="editReply(' + r.index + ')">編輯</button> ' +
        '<button class="btn btn-danger" onclick="deleteReply(' + r.index + ')">刪除</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML =
    '<table>' +
      '<thead><tr>' +
        '<th>關鍵字</th><th>回覆內容</th><th>時段</th><th>星期</th><th>狀態</th><th>操作</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

// ────────────────────────────────────────────────────────────
// 渲染分頁
// ────────────────────────────────────────────────────────────
function _renderReplyPager() {
  var pager = document.getElementById('replyPager');
  if (!pager) return;
  var total      = _replyFiltered.length;
  var totalPages = Math.ceil(total / _replyPageSize);
  if (totalPages <= 1) { pager.innerHTML = ''; return; }

  var btnStyle      = 'style="padding:6px 12px;border-radius:6px;border:1.5px solid #e0e0e0;background:white;cursor:pointer;font-size:13px;"';
  var activeStyle   = 'style="padding:6px 12px;border-radius:6px;border:none;background:#06C755;color:white;cursor:pointer;font-size:13px;font-weight:600;"';
  var disabledStyle = 'style="padding:6px 12px;border-radius:6px;border:1.5px solid #e0e0e0;background:#f5f5f5;color:#ccc;cursor:not-allowed;font-size:13px;"';

  var html = '';
  html += '<button ' + (_replyPage === 1 ? 'disabled ' + disabledStyle : btnStyle) +
          ' onclick="gotoReplyPage(' + (_replyPage - 1) + ')">上一頁</button>';
  for (var i = 1; i <= totalPages; i++) {
    html += '<button ' + (i === _replyPage ? activeStyle : btnStyle) +
            ' onclick="gotoReplyPage(' + i + ')">' + i + '</button>';
  }
  html += '<button ' + (_replyPage === totalPages ? 'disabled ' + disabledStyle : btnStyle) +
          ' onclick="gotoReplyPage(' + (_replyPage + 1) + ')">下一頁</button>';

  pager.innerHTML = html;
}

function gotoReplyPage(page) {
  var totalPages = Math.ceil(_replyFiltered.length / _replyPageSize);
  if (page < 1 || page > totalPages) return;
  _replyPage = page;
  _renderReplyTable();
  _renderReplyPager();
}

// ────────────────────────────────────────────────────────────
// Modal 開關
// ────────────────────────────────────────────────────────────
function openReplyCreateModal() {
  _replyEditIndex = null;
  document.getElementById('replyModalTitle').textContent = '新增回覆';
  document.getElementById('replySaveBtn').textContent    = '新增';
  document.getElementById('replyKeyword').value   = '';
  document.getElementById('replyContent').value   = '';
  document.getElementById('replyStartTime').value = '00:00';
  document.getElementById('replyEndTime').value   = '23:59';
  document.getElementById('replyStatus').value    = '啟用';
  document.querySelectorAll('.replyWeek').forEach(function(cb) { cb.checked = true; });
  document.getElementById('replyCreateAud').checked       = false;
  document.getElementById('replyAudName').value           = '';
  document.getElementById('replyAudField').style.display  = 'none';
  document.getElementById('replyAudSection').style.display = 'block';
  document.getElementById('replyModal').classList.add('show');
}

function editReply(index) {
  // ← 改成從全域陣列用 index 找資料，不用傳 JSON
  var r = _replyAll.find(function(item) { return item.index === index; });
  if (!r) { showToast('找不到資料', 'error'); return; }

  _replyEditIndex = r.index;
  document.getElementById('replyModalTitle').textContent = '編輯回覆';
  document.getElementById('replySaveBtn').textContent    = '儲存';
  document.getElementById('replyKeyword').value   = r.keyword || '';
  document.getElementById('replyContent').value   = r.content || '';
  document.getElementById('replyStartTime').value = _parseTimeValue(r.start_time);
  document.getElementById('replyEndTime').value   = _parseTimeValue(r.end_time);
  document.getElementById('replyStatus').value    = r.status  || '啟用';

  var checked = (r.week || '').split(',').map(function(d) { return d.trim(); });
  document.querySelectorAll('.replyWeek').forEach(function(cb) {
    cb.checked = checked.indexOf(cb.value) !== -1;
  });

  // 編輯時隱藏同步建立受眾
  document.getElementById('replyAudSection').style.display = 'none';
  document.getElementById('replyModal').classList.add('show');
}

function closeReplyModal() {
  document.getElementById('replyModal').classList.remove('show');
  _replyEditIndex = null;
}

// ────────────────────────────────────────────────────────────
// 儲存
// ────────────────────────────────────────────────────────────
async function saveReply() {
  var keyword   = document.getElementById('replyKeyword').value.trim();
  var content   = document.getElementById('replyContent').value.trim();
  var startTime = document.getElementById('replyStartTime').value || '00:00';
  var endTime   = document.getElementById('replyEndTime').value   || '23:59';
  var status    = document.getElementById('replyStatus').value;
  var createAud = document.getElementById('replyCreateAud')
                    ? document.getElementById('replyCreateAud').checked : false;
  var audName   = document.getElementById('replyAudName')
                    ? document.getElementById('replyAudName').value.trim() : '';

  var weekVals = [];
  document.querySelectorAll('.replyWeek:checked').forEach(function(cb) {
    weekVals.push(cb.value);
  });
  var week = weekVals.join(',') || '1,2,3,4,5,6,0';

  if (!keyword) { showToast('請填入關鍵字', 'error'); return; }
  if (!content) { showToast('請填入回覆內容', 'error'); return; }

  var params = {
    action:     'saveReply',
    keyword:    keyword,
    type:       'text',
    content:    content,
    start_time: startTime,
    end_time:   endTime,
    week:       week,
    status:     status
  };

  if (_replyEditIndex !== null) {
    params.row_index = _replyEditIndex;
  } else {
    params.create_audience = createAud;
    params.audience_name   = audName;
  }

  var res = await apiCall(params);
  if (!res.success) { showToast(res.message || '儲存失敗', 'error'); return; }

  closeReplyModal();
  showToast(res.data && res.data.message ? res.data.message : '儲存成功', 'success');
  loadReply();
}

// ────────────────────────────────────────────────────────────
// 刪除
// ────────────────────────────────────────────────────────────
async function deleteReply(index) {
  var ok = await confirmDialog('確定要刪除這筆回覆嗎？');
  if (!ok) return;

  var res = await apiCall({ action: 'deleteReply', index: index });
  if (res.success) {
    showToast('已刪除', 'success');
    loadReply();
  } else {
    showToast(res.message || '刪除失敗', 'error');
  }
}

// ────────────────────────────────────────────────────────────
// 工具函式
// ────────────────────────────────────────────────────────────
function _parseTimeValue(val) {
  if (!val) return '00:00';
  var str = String(val).trim();
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    var parts = str.split(':');
    return ('0' + parts[0]).slice(-2) + ':' + ('0' + parts[1]).slice(-2);
  }
  try {
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      var h = (d.getUTCHours() + 8) % 24;
      var m = d.getUTCMinutes();
      return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
    }
  } catch(e) {}
  return '00:00';
}

function _escR(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
