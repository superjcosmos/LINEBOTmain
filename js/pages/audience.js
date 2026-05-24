async function loadAudience() {
  setContent('<div class="loading">載入中...</div>');

  var result = await apiCall({ action: "getAudienceList" });

  if (!result.success) {
    setContent('<div class="loading">載入失敗：' + result.message + '</div>');
    return;
  }

  var rows = result.data.map(function(row) {
    return '<tr>' +
      '<td>' + row.name + '</td>' +
      '<td>' + (row.keyword || "-") + '</td>' +
      '<td>' + (row.count || 0) + ' 人</td>' +
      '<td>' +
        '<button class="btn btn-sync" ' +
          'onclick="syncCount(\'' + row.audience_id + '\',' + row.index + ')">同步人數</button> ' +
        '<button class="btn btn-primary" ' +
          'onclick="openImportModal(\'' + row.audience_id + '\',\'' + row.name + '\')">匯入UID</button> ' +
        '<button class="btn btn-danger" ' +
          'onclick="deleteAudience(\'' + row.audience_id + '\',' + row.index + ')">刪除</button>' +
      '</td>' +
    '</tr>';
  }).join("");

  setContent(
    '<h2 class="page-title">受眾管理</h2>' +
    '<div class="card">' +
      '<div class="toolbar">' +
        '<button class="btn btn-primary" onclick="openCreateModal()">＋ 建立受眾</button>' +
      '</div>' +
      '<table>' +
        '<thead><tr>' +
          '<th>受眾名稱</th>' +
          '<th>觸發關鍵字</th>' +
          '<th>人數</th>' +
          '<th>操作</th>' +
        '</tr></thead>' +
        '<tbody>' +
          (rows || '<tr><td colspan="4" class="empty">尚無受眾</td></tr>') +
        '</tbody>' +
      '</table>' +
    '</div>' +

    // 建立受眾 Modal
    '<div class="modal-overlay" id="createModal">' +
      '<div class="modal">' +
        '<h3>建立受眾</h3>' +
        '<div class="form-group">' +
          '<label>受眾名稱</label>' +
          '<input type="text" id="audienceName" placeholder="例如：VIP客戶">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>觸發關鍵字（選填）</label>' +
          '<input type="text" id="audienceKeyword" placeholder="用戶輸入此關鍵字自動加入">' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeCreateModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="createAudience()">建立</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // 匯入 UID Modal
    '<div class="modal-overlay" id="importModal">' +
      '<div class="modal">' +
        '<h3>匯入 UID</h3>' +
        '<p id="importModalTitle" style="color:#888;font-size:13px;margin-bottom:12px"></p>' +
        '<div class="form-group">' +
          '<label>UID 清單（每行一個）</label>' +
          '<textarea id="importUids" placeholder="Uxxxxxxxxxx\nUxxxxxxxxxx\nUxxxxxxxxxx" style="height:160px"></textarea>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeImportModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="importAudience()">匯入</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ===== 建立受眾 =====
function openCreateModal() {
  document.getElementById("createModal").classList.add("show");
}

function closeCreateModal() {
  document.getElementById("createModal").classList.remove("show");
  document.getElementById("audienceName").value    = "";
  document.getElementById("audienceKeyword").value = "";
}

async function createAudience() {
  var name    = document.getElementById("audienceName").value.trim();
  var keyword = document.getElementById("audienceKeyword").value.trim();

  if (!name) {
    showToast("請填入受眾名稱", "error");
    return;
  }

  var result = await apiCall({
    action:  "createAudience",
    name:    name,
    keyword: keyword
  });

  if (result.success) {
    closeCreateModal();
    showToast("受眾建立成功");
    loadAudience();
  } else {
    showToast(result.message, "error");
  }
}

// ===== 匯入 UID =====
var currentAudienceId = null;

function openImportModal(audienceId, name) {
  currentAudienceId = audienceId;
  document.getElementById("importModalTitle").textContent = "受眾：" + name;
  document.getElementById("importModal").classList.add("show");
}

function closeImportModal() {
  document.getElementById("importModal").classList.remove("show");
  document.getElementById("importUids").value = "";
  currentAudienceId = null;
}

async function importAudience() {
  var raw  = document.getElementById("importUids").value.trim();
  var uids = raw.split("\n").map(function(u) { return u.trim(); }).filter(Boolean);

  if (uids.length === 0) {
    showToast("請填入至少一筆 UID", "error");
    return;
  }

  var result = await apiCall({
    action:      "importAudience",
    audience_id: currentAudienceId,
    uids:        uids
  });

  if (result.success) {
    closeImportModal();
    showToast(result.message);
    loadAudience();
  } else {
    showToast(result.message, "error");
  }
}

// ===== 同步人數 =====
async function syncCount(audienceId, index) {
  showToast("同步中...");

  var result = await apiCall({
    action:      "syncAudienceCount",
    audience_id: audienceId
  });

  if (result.success) {
    showToast("人數已更新：" + result.count + " 人");
    loadAudience();
  } else {
    showToast(result.message, "error");
  }
}

// ===== 刪除受眾 =====
async function deleteAudience(audienceId, index) {
  if (!confirmDialog("確定要刪除這個受眾嗎？此操作無法復原。")) return;

  var result = await apiCall({
    action:      "deleteAudience",
    audience_id: audienceId,
    index:       index
  });

  if (result.success) {
    showToast("受眾已刪除");
    loadAudience();
  } else {
    showToast(result.message, "error");
  }
}
