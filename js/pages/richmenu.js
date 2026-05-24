async function loadRichMenu() {
  setContent('<div class="loading">載入中...</div>');

  var result = await apiCall({ action: "getRichMenuList" });

  if (!result.success) {
    setContent('<div class="loading">載入失敗：' + result.message + '</div>');
    return;
  }

  var rows = result.data.map(function(row) {
    var isDefault = row.is_default === "是"
      ? '<span class="tag tag-active">預設</span>'
      : '<button class="btn btn-sync" onclick="setDefault(\'' +
          row.rich_menu_id + '\',' + row.index + ')">設為預設</button>';

    return '<tr>' +
      '<td>' + row.name + '</td>' +
      '<td>' + row.layout + '</td>' +
      '<td>' + row.display_text + '</td>' +
      '<td>' + isDefault + '</td>' +
      '<td>' +
        '<button class="btn btn-primary" ' +
          'onclick="openUploadModal(\'' + row.rich_menu_id + '\',' + row.index + ')">上傳圖片</button> ' +
        '<button class="btn btn-danger" ' +
          'onclick="deleteRichMenu(\'' + row.rich_menu_id + '\',' + row.index + ')">刪除</button>' +
      '</td>' +
    '</tr>';
  }).join("");

  setContent(
    '<h2 class="page-title">圖文選單</h2>' +
    '<div class="card">' +
      '<div class="toolbar">' +
        '<button class="btn btn-primary" onclick="openCreateModal()">＋ 建立圖文選單</button>' +
      '</div>' +
      '<table>' +
        '<thead><tr>' +
          '<th>名稱</th><th>版型</th><th>選單文字</th><th>預設</th><th>操作</th>' +
        '</tr></thead>' +
        '<tbody>' +
          (rows || '<tr><td colspan="5" class="empty">尚無圖文選單</td></tr>') +
        '</tbody>' +
      '</table>' +
    '</div>' +

    // 建立 Modal
    '<div class="modal-overlay" id="rmCreateModal">' +
      '<div class="modal" style="width:600px;max-height:80vh;overflow-y:auto">' +
        '<h3>建立圖文選單</h3>' +

        '<div class="form-group">' +
          '<label>名稱（內部識別用）</label>' +
          '<input type="text" id="rmName" placeholder="例如：主選單">' +
        '</div>' +

        '<div class="form-group">' +
          '<label>選單欄文字</label>' +
          '<input type="text" id="rmDisplayText" placeholder="例如：點我開啟選單" value="開啟選單">' +
        '</div>' +

        '<div class="form-group">' +
          '<label>版型</label>' +
          '<select id="rmLayout" onchange="updateButtonFields()">' +
            '<option value="large_6">large_6（6格，2500×1686）</option>' +
            '<option value="large_3">large_3（3格高版，2500×1686）</option>' +
            '<option value="small_3">small_3（3格，2500×843）</option>' +
            '<option value="small_2">small_2（左右兩格，2500×843）</option>' +
            '<option value="small_left">small_left（左大右小，2500×843）</option>' +
            '<option value="small_1">small_1（單一按鈕，2500×843）</option>' +
          '</select>' +
        '</div>' +

        '<div id="buttonFields"></div>' +

        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeCreateModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="createRichMenu()">建立</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // 上傳圖片 Modal
    '<div class="modal-overlay" id="rmUploadModal">' +
      '<div class="modal">' +
        '<h3>上傳圖文選單圖片</h3>' +
        '<p style="color:#888;font-size:13px;margin-bottom:16px">' +
          '圖片規格：JPG 或 PNG，large 版型需 2500×1686px，small 版型需 2500×843px，1MB 以下' +
        '</p>' +
        '<div class="form-group">' +
          '<label>選擇圖片</label>' +
          '<input type="file" id="rmImageFile" accept="image/jpeg,image/png">' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeUploadModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="uploadImage()">上傳</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  // 初始化按鈕欄位
  updateButtonFields();
}

// ===== 建立圖文選單 =====
function openCreateModal() {
  document.getElementById("rmCreateModal").classList.add("show");
  updateButtonFields();
}

function closeCreateModal() {
  document.getElementById("rmCreateModal").classList.remove("show");
}

function updateButtonFields() {
  var layout = document.getElementById("rmLayout");
  if (!layout) return;

  var count = {
    "large_6": 6, "large_3": 3, "small_3": 3,
    "small_2": 2, "small_left": 2, "small_1": 1
  }[layout.value] || 6;

  var html = "";
  for (var i = 1; i <= count; i++) {
    html +=
      '<div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px">' +
        '<div style="font-weight:600;margin-bottom:8px;color:#666">按鈕 ' + i + '</div>' +
        '<div class="form-row">' +
          '<div class="form-group half">' +
            '<label>標籤文字</label>' +
            '<input type="text" id="btn' + i + '_label" placeholder="例如：了解更多">' +
          '</div>' +
          '<div class="form-group half">' +
            '<label>觸發文字</label>' +
            '<input type="text" id="btn' + i + '_action" placeholder="按下後傳送的文字">' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  document.getElementById("buttonFields").innerHTML = html;
}

async function createRichMenu() {
  var name        = document.getElementById("rmName").value.trim();
  var displayText = document.getElementById("rmDisplayText").value.trim();
  var layout      = document.getElementById("rmLayout").value;

  if (!name) {
    showToast("請填入名稱", "error");
    return;
  }

  var payload = {
    action:       "createRichMenu",
    name:         name,
    display_text: displayText,
    layout:       layout
  };

  var count = {
    "large_6": 6, "large_3": 3, "small_3": 3,
    "small_2": 2, "small_left": 2, "small_1": 1
  }[layout] || 6;

  for (var i = 1; i <= count; i++) {
    var labelEl  = document.getElementById("btn" + i + "_label");
    var actionEl = document.getElementById("btn" + i + "_action");
    payload["btn" + i + "_label"]  = labelEl  ? labelEl.value.trim()  : "";
    payload["btn" + i + "_action"] = actionEl ? actionEl.value.trim() : "";
  }

  var result = await apiCall(payload);

  if (result.success) {
    closeCreateModal();
    showToast("圖文選單建立成功，請上傳圖片");
    loadRichMenu();
  } else {
    showToast(result.message, "error");
  }
}

// ===== 上傳圖片 =====
var currentRichMenuId  = null;
var currentRichMenuIdx = null;

function openUploadModal(richMenuId, index) {
  currentRichMenuId  = richMenuId;
  currentRichMenuIdx = index;
  document.getElementById("rmUploadModal").classList.add("show");
}

function closeUploadModal() {
  document.getElementById("rmUploadModal").classList.remove("show");
  document.getElementById("rmImageFile").value = "";
  currentRichMenuId  = null;
  currentRichMenuIdx = null;
}

async function uploadImage() {
  var fileInput = document.getElementById("rmImageFile");
  var file      = fileInput.files[0];

  if (!file) {
    showToast("請選擇圖片", "error");
    return;
  }

  if (file.size > 1024 * 1024) {
    showToast("圖片大小超過 1MB", "error");
    return;
  }

  showToast("上傳中...");

  var reader = new FileReader();
  reader.onload = async function(e) {
    var base64 = e.target.result.split(",")[1];

    var result = await apiCall({
      action:        "uploadRichMenuImage",
      rich_menu_id:  currentRichMenuId,
      index:         currentRichMenuIdx,
      image_data:    base64,
      mime_type:     file.type
    });

    if (result.success) {
      closeUploadModal();
      showToast("圖片上傳成功");
      loadRichMenu();
    } else {
      showToast(result.message, "error");
    }
  };

  reader.readAsDataURL(file);
}

// ===== 設為預設 =====
async function setDefault(richMenuId, index) {
  if (!confirmDialog("確定要將此圖文選單設為所有用戶的預設嗎？")) return;

  var result = await apiCall({
    action:       "setDefaultRichMenu",
    rich_menu_id: richMenuId,
    index:        index
  });

  if (result.success) {
    showToast("已設為預設圖文選單");
    loadRichMenu();
  } else {
    showToast(result.message, "error");
  }
}

// ===== 刪除 =====
async function deleteRichMenu(richMenuId, index) {
  if (!confirmDialog("確定要刪除此圖文選單嗎？")) return;

  var result = await apiCall({
    action:       "deleteRichMenu",
    rich_menu_id: richMenuId,
    index:        index
  });

  if (result.success) {
    showToast("已刪除");
    loadRichMenu();
  } else {
    showToast(result.message, "error");
  }
}
