let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  currentUser = Auth.requireAuth(['gate']);
  if (!currentUser) return;

  document.getElementById('user-name').textContent = currentUser.name || currentUser.username || 'Gate Officer';
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());
  
  // Enter key support for scanner
  document.getElementById('qr-token-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      verifyQR();
    }
  });

  // Focus input automatically for scanner
  document.getElementById('qr-token-input').focus();
  
  renderRecentVerifications();
});

async function verifyQR() {
  const input = document.getElementById('qr-token-input');
  const token = input.value.trim();
  const btn = document.getElementById('btn-verify');
  const resultArea = document.getElementById('result-area');
  
  if (!token) {
    showToast('Please enter a token or scan a QR code', 'warning');
    input.focus();
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div> Verifying...';
  
  try {
    const data = await API.validateQR(token);
    
    // valid
    resultArea.innerHTML = renderValidResult(data);
    const resultEl = document.getElementById('verification-success');
    resultEl.style.display = 'block';
    
    addToRecentList(token, true, data);
    
    // Play success sound (if we had one)
    showToast('Valid Outpass!', 'success');
    
  } catch (error) {
    resultArea.innerHTML = renderInvalidResult(error.message);
    const resultEl = document.getElementById('verification-error');
    resultEl.style.display = 'block';
    
    addToRecentList(token, false, { error: error.message });
    
    // Play error sound
    showToast('Invalid Outpass!', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'VERIFY TOKEN';
    input.value = '';
    input.focus();
  }
}

function renderValidResult(data) {
  const req = data.request;
  return `
    <div class="verification-result valid" id="verification-success">
      <h3 style="color: var(--success-color); justify-content: center; margin-bottom: 20px;">
        <span style="font-size: 2rem;">✅</span> VALID OUTPASS
      </h3>
      
      <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: var(--radius-sm); margin-bottom: 15px;">
        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 5px;">${data.student.name || data.student.username || req.student_id}</div>
        <div style="color: var(--text-secondary);">Roll No: ${req.student_id}</div>
      </div>
      
      <div class="verification-details text-left">
        <div class="verification-detail-item">
          <strong>Request ID</strong>
          <span>#${req.id}</span>
        </div>
        <div class="verification-detail-item">
          <strong>Destination</strong>
          <span>${req.destination}</span>
        </div>
        <div class="verification-detail-item">
          <strong>Departure Time</strong>
          <span>${formatDateTime(req.departure_time)}</span>
        </div>
        <div class="verification-detail-item">
          <strong>Return Time</strong>
          <span>${formatDateTime(req.return_time)}</span>
        </div>
        <div class="verification-detail-item" style="grid-column: span 2;">
          <strong>Contact</strong>
          <span>${req.contact_details}</span>
        </div>
      </div>
    </div>
  `;
}

function renderInvalidResult(reason) {
  return `
    <div class="verification-result invalid" id="verification-error">
      <h3 style="color: var(--danger-color); justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 2rem;">❌</span> ACCESS DENIED
      </h3>
      <p style="font-size: 1.1rem;">${reason}</p>
      <p class="text-secondary mt-2" style="font-size: 0.9rem;">Please ask student to check their portal.</p>
    </div>
  `;
}

function addToRecentList(token, isValid, data) {
  let recent = JSON.parse(sessionStorage.getItem('gate_recent_scans') || '[]');
  
  recent.unshift({
    token: token.substring(0, 10) + '...',
    isValid,
    time: new Date().toISOString(),
    details: isValid ? data.request.student_id : (data.error || 'Invalid Token')
  });
  
  if (recent.length > 5) {
    recent.pop();
  }
  
  sessionStorage.setItem('gate_recent_scans', JSON.stringify(recent));
  renderRecentVerifications();
}

function renderRecentVerifications() {
  const container = document.getElementById('recent-scans-container');
  const recent = JSON.parse(sessionStorage.getItem('gate_recent_scans') || '[]');
  
  if (recent.length === 0) return;
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Status</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  recent.forEach(scan => {
    const badgeClass = scan.isValid ? 'approved' : 'rejected';
    const badgeTxt = scan.isValid ? 'Valid' : 'Invalid';
    
    html += `
      <tr>
        <td>${new Date(scan.time).toLocaleTimeString()}</td>
        <td><span class="badge badge-${badgeClass}">${badgeTxt}</span></td>
        <td>${scan.details}</td>
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
