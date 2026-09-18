let currentUser = null;
let wardenHistory = []; // Local cache of recently processed requests

document.addEventListener('DOMContentLoaded', () => {
  currentUser = Auth.requireAuth(['warden']);
  if (!currentUser) return;

  document.getElementById('user-name').textContent = currentUser.name || currentUser.username || 'Warden';
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());
  
  loadPendingRequests();
  
  // Auto-refresh pending queue every 30s
  setInterval(loadPendingRequests, 30000);
});

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`tab-btn-${tabId}`).classList.add('active');
  
  if (tabId === 'pending') loadPendingRequests();
  if (tabId === 'history') renderHistoryTab();
}

async function loadPendingRequests() {
  const container = document.getElementById('pending-table-container');
  
  try {
    const requests = await API.pendingRequests();
    
    document.getElementById('pending-count').textContent = requests.length;
    
    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon" style="color: var(--success-color); opacity: 1;">✓</div>
          <h4>All Caught Up!</h4>
          <p>There are no pending outpass requests.</p>
        </div>
      `;
      return;
    }
    
    let html = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Student</th>
            <th>Destination</th>
            <th>Departure</th>
            <th>Return</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    requests.forEach(req => {
      html += renderPendingRow(req);
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Error: ${error.message}</p></div>`;
  }
}

function renderPendingRow(req) {
  return `
    <tr id="row-${req.id}">
      <td><strong>#${req.id}</strong></td>
      <td>
        <div style="font-weight: 500;">${req.student_id}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${req.contact_details}</div>
      </td>
      <td>${req.destination}</td>
      <td>${formatDateTime(req.departure_time)}</td>
      <td>${formatDateTime(req.return_time)}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-success btn-sm" onclick="openActionModal(${req.id}, 'Approve')">✅ Approve</button>
          <button class="btn btn-danger btn-sm" onclick="openActionModal(${req.id}, 'Reject')">❌ Reject</button>
        </div>
      </td>
    </tr>
  `;
}

function openActionModal(id, action) {
  document.getElementById('action-req-id').value = id;
  document.getElementById('action-type').value = action;
  document.getElementById('action-remarks').value = '';
  
  document.getElementById('action-modal-title').textContent = `${action} Request #${id}`;
  document.getElementById('action-modal-prompt').innerHTML = `Are you sure you want to <strong>${action.toLowerCase()}</strong> request #${id}?`;
  
  const btnConfirm = document.getElementById('btn-confirm-action');
  if (action === 'Approve') {
    btnConfirm.className = 'btn btn-success';
  } else {
    btnConfirm.className = 'btn btn-danger';
  }
  
  document.getElementById('action-modal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function confirmAction() {
  const id = document.getElementById('action-req-id').value;
  const action = document.getElementById('action-type').value;
  const remarks = document.getElementById('action-remarks').value;
  const btn = document.getElementById('btn-confirm-action');
  
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> Processing...';
  
  try {
    let res;
    if (action === 'Approve') {
      res = await API.approveRequest(id, remarks);
    } else {
      res = await API.rejectRequest(id, remarks);
    }
    
    closeModal('action-modal');
    showToast(`Request #${id} successfully ${action.toLowerCase()}d!`, 'success');
    
    // Add to history cache
    wardenHistory.unshift({
      id: id,
      action: action,
      time: new Date().toISOString(),
      remarks: remarks
    });
    if (wardenHistory.length > 50) wardenHistory.pop();
    
    // Animate removal and reload
    const row = document.getElementById(`row-${id}`);
    if (row) {
      row.classList.add('row-sliding-out');
      setTimeout(() => {
        loadPendingRequests();
      }, 500);
    } else {
      loadPendingRequests();
    }
    
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm';
  }
}

function renderHistoryTab() {
  const container = document.getElementById('history-table-container');
  
  if (wardenHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🕒</div>
        <h4>No Recent Activity</h4>
        <p>Requests you process in this session will appear here.</p>
      </div>
    `;
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Action Taken</th>
          <th>Time</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  wardenHistory.forEach(item => {
    const badgeClass = item.action === 'Approve' ? 'approved' : 'rejected';
    const badgeTxt = item.action === 'Approve' ? 'Approved' : 'Rejected';
    
    html += `
      <tr>
        <td><strong>#${item.id}</strong></td>
        <td><span class="badge badge-${badgeClass}">${badgeTxt}</span></td>
        <td>${formatDateTime(item.time)}</td>
        <td style="color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.remarks || '-'}
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table>`;
  container.innerHTML = html;
}

// Utils
function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('en-GB', { 
    day: '2-digit', month: 'short', 
    hour: '2-digit', minute: '2-digit'
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;
  container.appendChild(toast);
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  });
  
  setTimeout(() => {
    if(document.body.contains(toast)) {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, 3000);
}
