// js/pages/account.js
// ⚠️ 已套用 CODE_STYLE.md 規範：openModal/closeModal（取代動態建立 global-modal 容器）
// ⚠️ 注意：此頁面無對應的 loadAccount()，Modal 需確保 'globalModalRoot' 容器已存在於 index.html 主版面中
//    （建議在 index.html 的 <body> 內、router 容器之外，固定放一個 <div id="globalModalRoot"></div>）

function openChangePasswordModal() {
  var root = document.getElementById('globalModalRoot');
  if (!root) {
    var div = document.createElement('div');
    div.id = 'globalModalRoot';
    document.body.appendChild(div);
    root = div;
  }

  root.innerHTML =
    '<div class="modal-overlay" id="changePasswordModal" style="display:flex">' +
      '<div class="modal">' +
        '<h3>🔑 修改密碼</h3>' +
        '<div class="form-group">' +
          '<label>舊密碼</label>' +
          '<input id="cp-old" type="password" placeholder="輸入舊密碼">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>新密碼</label>' +
          '<input id="cp-new" type="password" placeholder="至少6碼">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>確認新密碼</label>' +
          '<input id="cp-confirm" type="password" placeholder="再輸入一次">' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-cancel" onclick="closeGlobalModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="submitChangePassword()">確認修改</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

async function submitChangePassword() {
  var oldPw     = document.getElementById('cp-old').value;
  var newPw     = document.getElementById('cp-new').value;
  var confirmPw = document.getElementById('cp-confirm').value;

  if (!oldPw || !newPw || !confirmPw) { showToast('請填寫所有欄位', 'error'); return; }
  if (newPw !== confirmPw) { showToast('新密碼兩次輸入不一致', 'error'); return; }
  if (newPw.length < 6) { showToast('新密碼至少6碼', 'error'); return; }

  var res = await apiCall({
    action:       'changePassword',
    old_password: oldPw,
    new_password: newPw
  });

  if (res.success) {
    showToast('密碼修改成功，請重新登入');
    closeGlobalModal();
    setTimeout(function() { logout(); }, 1500);
  } else {
    // ⚠️ 資安：修改失敗時清空欄位，避免密碼殘留在 DOM 中
    document.getElementById('cp-old').value     = '';
    document.getElementById('cp-new').value     = '';
    document.getElementById('cp-confirm').value = '';
    showToast(res.message || '修改失敗', 'error');
  }
}

function closeGlobalModal() {
  var root = document.getElementById('globalModalRoot');
  if (root) root.innerHTML = '';
}
