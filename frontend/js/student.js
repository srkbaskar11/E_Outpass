let currentUser = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  currentUser = Auth.requireAuth(['student']);
  if (!currentUser) return;

  document.getElementById('user-name').textContent = currentUser.name || currentUser.username || 'Student';
  
  // Event Listeners
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());
  document.getElementById('new-request-form').addEventListener('submit', submitOutpassForm);
  
  // Initial Loads
  loadMyRequests();
  loadNotifications();
  
  // Set default datetime to now and tomorrow
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Format for datetime-local input: YYYY-MM-DDThh:mm
  const formatForInput = (d) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  };
  
  document.getElementById('departure_time').value = formatForInput(now);
  document.getElementById('return_time').value = formatForInput(tomorrow);

  // Poll notifications
  setInterval(pollNotifications, 30000);
});

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`tab-btn-${tabId}`).classList.add('active');
  
  if (tabId === 'my') loadMyRequests();
  if (tabId === 'notifications') loadNotifications();
}

// Submit Request
async function submitOutpassForm(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-request');
  
  const data = {
    destination: document.getElementById('destination').value,
    reason: document.getElementById('reason').value,
    departure_time: document.getElementById('departure_time').value,
    return_time: document.getElementById('return_time').value,
    contact_details: document.getElementById('contact_details').value
  };
  
  if (new Date(data.departure_time) >= new Date(data.return_time)) {
    showToast('Return time must be after departure time', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> Submitting...';
  
  try {
    const res = await API.submitRequest(data);
    showToast(`Request submitted successfully! Ref: #${res.id}`, 'success');
    document.getElementById('new-request-form').reset();
    setTimeout(() => switchTab('my'), 1000);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Request';
  }
}

// Load My Requests
async function loadMyRequests() {
  const container = document.getElementById('requests-table-container');
  container.innerHTML = '<div class="empty-state"><div class="loading-spinner large"></div><p>Loading requests...</p></div>';
  
  try {
    const requests = await API.myRequests();
    
    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📝</div>
          <h4>No Requests Found</h4>
          <p>You haven't made any outpass requests yet.</p>
          <button class="btn btn-primary mt-3" onclick="switchTab('new')">Create New Request</button>
        </div>
      `;
      return;
    }
    
    let html = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Destination</th>
            <th>Departure</th>
            <th>Return</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    requests.forEach(req => {
      html += renderRequestRow(req);
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Error loading requests: ${error.message}</p></div>`;
  }
}

function renderRequestRow(req) {
  return `
    <tr>
      <td><strong>#${req.id}</strong></td>
      <td>${req.destination}</td>
      <td>${formatDateTime(req.departure_time)}</td>
      <td>${formatDateTime(req.return_time)}</td>
      <td>${getStatusBadge(req.status)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openRequestModal(${req.id})">View Details</button>
      </td>
    </tr>
  `;
}

// View Request Details Modal
async function openRequestModal(id) {
  const modal = document.getElementById('request-modal');
  const body = document.getElementById('modal-req-body');
  document.getElementById('modal-req-id').textContent = `#${id}`;
  
  body.innerHTML = '<div class="text-center p-4"><div class="loading-spinner large"></div></div>';
  modal.classList.add('active');
  
  try {
    const req = await API.getRequest(id);
    
    let html = `
      <div class="verification-details" style="margin-bottom: 20px;">
        <div class="verification-detail-item">
          <strong>Destination</strong>
          <span>${req.destination}</span>
        </div>
        <div class="verification-detail-item">
          <strong>Status</strong>
          <span>${getStatusBadge(req.status)}</span>
        </div>
        <div class="verification-detail-item">
          <strong>Departure</strong>
          <span>${formatDateTime(req.departure_time)}</span>
        </div>
        <div class="verification-detail-item">
          <strong>Return</strong>
          <span>${formatDateTime(req.return_time)}</span>
        </div>
        <div class="verification-detail-item" style="grid-column: span 2;">
          <strong>Reason</strong>
          <span style="color: var(--text-secondary);">${req.reason}</span>
        </div>
      </div>
      
      <h4>Status History</h4>
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-content">
            <h4>Request Submitted</h4>
            <p>${formatDateTime(req.created_at)}</p>
          </div>
        </div>
    `;
    
    if (req.status === 'Approved') {
      html += `
        <div class="timeline-item success">
          <div class="timeline-content">
            <h4>Approved by Warden</h4>
            <p>Ready to go. Show QR code at gate.</p>
          </div>
        </div>
      `;
    } else if (req.status === 'Rejected') {
      html += `
        <div class="timeline-item danger">
          <div class="timeline-content">
            <h4>Rejected by Warden</h4>
            <p>Request denied.</p>
          </div>
        </div>
      `;
    }
    
    html += `</div>`;
    
    if (req.status === 'Approved') {
      html += `
        <div id="qr-section" style="text-align: center; margin-top: 20px;">
          <button class="btn btn-success" id="btn-show-qr" onclick="loadQRCode(${req.id})">Generate / View Token & QR Code</button>
          <div id="qr-image-container"></div>
        </div>
      `;
    } else if (req.status === 'Pending') {
      html += `
        <div style="text-align: center; margin-top: 20px; padding: 12px; background: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; color: #ffc107;">
          ⏳ <strong>Token / QR Code pending:</strong> Waiting for Warden approval.
        </div>
      `;
    }
    
    body.innerHTML = html;
  } catch (error) {
    body.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
  }
}

async function loadQRCode(id) {
  const btn = document.getElementById('btn-show-qr');
  const container = document.getElementById('qr-image-container');
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner"></div> Generating...';
  }
  
  try {
    const res = await API.generateQR(id);
    if (btn) btn.style.display = 'none';
    
    const qrSrc = res.qr_data_url || (res.qr_code ? `data:image/png;base64,${res.qr_code}` : '');
    
    container.innerHTML = `
      <div class="qr-container" style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 15px;">
        ${qrSrc ? `<img src="${qrSrc}" alt="QR Code" style="max-width: 200px; border-radius: 8px; border: 2px solid var(--primary-color, #4facfe); padding: 5px; background: white;" />` : ''}
        <div style="background: rgba(0,0,0,0.4); padding: 12px 16px; border-radius: 8px; text-align: center; width: 100%; max-width: 320px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="font-size: 0.8rem; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Outpass Token Number</div>
          <div style="font-family: monospace; font-size: 0.95rem; font-weight: bold; word-break: break-all; color: #4facfe; user-select: all;">
            ${res.token}
          </div>
        </div>
        <p style="font-size: 0.85rem; color: #aaa;">Present this QR code or Token Number at the Gate</p>
      </div>
    `;
  } catch (error) {
    showToast(error.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Try Again';
    }
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Notifications
async function loadNotifications() {
  const container = document.getElementById('notifications-container');
  container.innerHTML = '<div class="p-4 text-center"><div class="loading-spinner"></div></div>';
  
  try {
    const res = await API.getNotifications();
    const notifs = Array.isArray(res) ? res : (res.notifications || []);
    const unreadCount = res.unread_count !== undefined ? res.unread_count : notifs.filter(n => !n.is_read).length;
    
    updateBadge(unreadCount);
    
    if (notifs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🔔</div>
          <p>No notifications.</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    notifs.forEach(n => {
      html += `
        <div class="notification-item ${n.is_read ? '' : 'unread'}" id="notif-${n.id}">
          <div class="notification-content">
            <p>${n.message}</p>
            <span class="notification-time">${formatDateTime(n.created_at)}</span>
          </div>
          ${!n.is_read ? `<button class="btn btn-sm btn-outline" onclick="markRead(${n.id})">Mark Read</button>` : ''}
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="p-4"><p class="text-danger">Error: ${error.message}</p></div>`;
  }
}

async function markRead(id) {
  try {
    await API.markRead(id);
    const item = document.getElementById(`notif-${id}`);
    if (item) item.classList.remove('unread');
    const btn = document.querySelector(`#notif-${id} button`);
    if (btn) btn.style.display = 'none';
    pollNotifications();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function markAllRead() {
  try {
    await API.markAllRead();
    loadNotifications();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function pollNotifications() {
  try {
    const res = await API.getNotifications();
    const notifs = Array.isArray(res) ? res : (res.notifications || []);
    const unreadCount = res.unread_count !== undefined ? res.unread_count : notifs.filter(n => !n.is_read).length;
    updateBadge(unreadCount);
  } catch (e) { }
}

function updateBadge(unreadCount) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// Utils
function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('en-GB', { 
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getStatusBadge(status) {
  let clazz = 'pending';
  if (status === 'Approved') clazz = 'approved';
  if (status === 'Rejected') clazz = 'rejected';
  return `<span class="badge badge-${clazz}">${status}</span>`;
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
