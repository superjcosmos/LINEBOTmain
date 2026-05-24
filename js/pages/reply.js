async function loadReply() {
  setContent('<div class="loading">載入中...</div>');

  var result = await apiCall({ action: "getReplySettings" });

  if (!result.success) {
    setContent('<div class="loading">載入失敗：' + result.message + '</div>');
    return;
  }

  var rows = result.data.map(function(row) {
    var tagClass = (row.status === "啟用" || row.status === "開啟")
      ? "tag-active" : "tag-inactive";
    var timeRange = (row.start && row.end) ? row.start + " ~ " + row.end : "全天";
    var weekText  = row.week ? row.week : "每天";
    return '<tr>' +
      '<td>' + row.keyword + '</td>' +
      '<td>' + (row.content || "-") + '</td>' +
      '<td>' + timeRange + '</td>' +
      '<td>' + weekText + '</td>' +
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
          '<th>關鍵字</th>' +
          '<th>回覆內容</th>' +
          '<th>時段</th>' +
          '<th>星期</th>' +
          '<th>狀態</th>' +
          '<th>操作</th>' +
        '</tr></thead>' +
        '<tbody>' +
          (rows || '<tr><td colspan="6" class="empty">尚無資料</td></tr>') +
        '</tbody>' +
      '</table>' +
    '</div>' +

    // Modal
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

        '<div class="form-row">' +
          '<div class="form-group half">' +
            '<label>開始時間</label>' +
            '<input type="time" id="replyStart" value="00:00">' +
          '</div>' +
          '<div class="form-group half">' +
            '<label>結束時間</label>' +
            '<input type="time" id="replyEnd" value="23:59">' +
          '</div>' +
        '</div>' +

        '<div class="form-group">' +
          '<label>星期</label>' +
          '<div class="week-selector">' +
            '<label class="week-item"><input type="checkbox" value="1" checked> 一</label>' +
            '<label class="week-item"><input type="checkbox" value="2" checked> 二</label>' +
            '<label class="week-item"><input type="checkbox" value="3" checked> 三</label>' +
            '<label class="week-item"><input type="checkbox" value="4" checked> 四</label>' +
            '<label class="week-item"><input type="checkbox" value="5" checked> 五</label>' +
            '<label class="week-item"><input type="checkbox" value="6" checked> 六</label>' +
            '<label class="week-item"><input type="checkbox" value="0" checked> 日</label>' +
          '</div>' +
        '</div>' +

        '<div class="form-group">' +
          '<label>狀態</label>' +
          '<select id="replyStatus">' +
            '<option value="啟用">啟用</option>' +
            '<option value="停用">停用</option>' +
          '</select>' +
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
  document.getElementById("replyStart").value   = "00:00";
  document.getElementById("replyEnd").value     = "23:59";
  document.getElementById("replyStatus").value  = "啟用";
  // 星期全部重設為勾選
  document.querySelectorAll(".week-item input").forEach(function(cb) {
    cb.checked = true;
  });
}

async function saveReply() {
  var keyword = document.getElementById("replyKeyword").value.trim();
  var content = document.getElementById("replyContent").value.trim();
  var start   = document.getElementById("replyStart").value;
  var end     = document.getElementById("replyEnd").value;
  var status  = document.getElementById("replyStatus").value;

  // 取得勾選的星期
  var weeks = [];
  document.querySelectorAll(".week-item input:checked").forEach(function(cb) {
    weeks.push(cb.value);
  });
  var weekStr = weeks.join(",");

  if (!keyword || !content) {
    showToast("請填入關鍵字和回覆內容", "error");
    return;
  }

  if (weeks.length === 0) {
    showToast("請至少選擇一個星期", "error");
    return;
  }

  var result = await apiCall({
    action:  "saveReply",
    keyword: keyword,
    content: content,
    type:    "text",
    start:   start,
    end:     end,
    week:    weekStr,
    status:  status
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
