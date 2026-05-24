// pages/account.js

function openChangePasswordModal() {
  var modal = document.getElementById('global-modal');
  if (!modal) {
    var div = document.createElement('div');
    div.id = 'global-modal';
    document.body.appendChild(div);
    modal = div;
  }
  
  modal.innerHTML = `
    <div class="modal-overlay show">
      <div class="modal">
        <h3>🔑 修改密碼</h3>
        <div class="form-group">
          <label>舊密碼</label>
          <input id="cp-old" type="password" placeholder="輸入舊密碼">
        </div>
        <div class="form-group">
          <label>新密碼</label>
          <input id="cp-new" type="password" placeholder="至少6碼">
        </div>
        <div class="form-group">
          <label>確認新密碼</label>
          <input id="cp-confirm" type="password" placeholder="再輸入一次">
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeGlobalModal()">取消</button>
          <button class="btn btn-primary" onclick="submitChangePassword()">確認修改</button>
        </div>
      </div>
    </div>
  `;
}

async function submitChangePassword() {
  var oldPw     = document.getElementById('cp-old').value;
  var newPw     = document.getElementById('cp-new').value;
  var confirmPw = document.getElementById('cp-confirm').value;
  
  if (!oldPw || !newPw || !confirmPw) return showToast('請填寫所有欄位', 'error');
  if (newPw !== confirmPw) return showToast('新密碼兩次輸入不一致', 'error');
  if (newPw.length < 6) return showToast('新密碼至少6碼', 'error');
  
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
    showToast(res.message || '修改失敗', 'error');
  }
}

function closeGlobalModal() {
  var modal = document.getElementById('global-modal');
  if (modal) modal.innerHTML = '';
}
