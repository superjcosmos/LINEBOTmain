async function loadReply() {
  setContent('<div class="loading">載入中...</div>');

  var result = await apiCall({ action: "getReplySettings" });

  if (!result.success) {
    setContent('<div class="loading">載入失敗：' + result.message + '</div>');
    return;
  }

  var rows = result.data.map(function(row) {
    var tagClass = row.status === "啟用" ? "tag-active" : "tag-inactive";
    return '<tr>' +
      '<td>' + row.keyword + '</td>' +
      '<td>' + row.content + '</td>' +
      '<td><span class="tag ' + tagClass + '">' + row.status + '</span></td>' +
      '<td>' +
        '<button class="btn btn-danger" ' +
          'onclick="deleteReply(' + row.index + ')">刪除</button>' +
      '</td>' +
    '</tr>';
  }).join("");

  setContent(
    '<h2 class="page-title">自動回覆設定</h2>' +
    '<div class="card">' +
      '<div class="toolbar">' +
        '<button class="btn btn-primary" onclick="openReplyModal()">＋ 新增回覆</button>' +
      '</div>' +
      '<table>' +
        '<thead><tr>' +
          '<th>關鍵字</th><th>回覆內容</th><th>狀態</th><th>操作</th>' +
        '</tr></thead>' +
        '<tbody>' +
          (rows || '<tr><td colspan="4" class="empty">尚無資料</td></tr>') +
        '</tbody>' +
      '</table>' +
    '</div>' +
    '<div class="modal-overlay" id="replyModal">' +
      '<div class="modal">' +
        '<h3>新增自動回覆</h3>' +
        '<div class="form-group">' +
          '<label>關鍵字</label>' +
          '<input type="text" id="replyKeyword" placeholder="例如：你好">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>回覆內容</label>' +
          '<textarea id="replyContent" placeholder="回覆的文字內容"></textarea>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeReplyModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="saveReply()">儲存</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function openReplyModal() {
  document.getElementById("replyModal").classList.add("show");
}

function closeReplyModal() {
  document.getElementById("replyModal").classList.remove("show");
  document.getElementById("replyKeyword").value = "";
  document.getElementById("replyContent").value = "";
}

async function saveReply() {
  var keyword = document.getElementById("replyKeyword").value.trim();
  var content = document.getElementById("replyContent").value.trim();

  if (!keyword || !content) {
    showToast("請填入關鍵字和回覆內容", "error");
    return;
  }

  var result = await apiCall({
    action:  "saveReply",
    keyword: keyword,
    content: content,
    status:  "啟用"
  });

  if (result.success) {
    closeReplyModal();
    showToast("儲存成功");
    loadReply();
  } else {
    showToast(result.message, "error");
  }
}

async function deleteReply(index) {
  if (!confirmDialog("確定要刪除這筆回覆嗎？")) return;

  var result = await apiCall({ action: "deleteReply", index: index });

  if (result.success) {
    showToast("刪除成功");
    loadReply();
  } else {
    showToast(result.message, "error");
  }
}
