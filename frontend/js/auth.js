const Auth = {
  getToken() {
    return localStorage.getItem('outpass_token');
  },
  
  getUser() {
    const userStr = localStorage.getItem('outpass_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  },
  
  setSession(token, user) {
    localStorage.setItem('outpass_token', token);
    localStorage.setItem('outpass_user', JSON.stringify(user));
  },
  
  clearSession() {
    localStorage.removeItem('outpass_token');
    localStorage.removeItem('outpass_user');
    // Navigate up to root login page (works from student/, warden/, gate/ subdirs and root)
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const prefix = depth > 1 ? '../' : '';
    window.location.href = prefix + 'index.html';
  },
  
  requireAuth(allowedRoles = []) {
    const token = this.getToken();
    const user = this.getUser();
    
    if (!token || !user) {
      this.clearSession();
      return null;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard if role doesn't match
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      const prefix = depth > 1 ? '../' : '';
      if (user.role === 'student') window.location.href = prefix + 'student/index.html';
      else if (user.role === 'warden') window.location.href = prefix + 'warden/index.html';
      else if (user.role === 'gate') window.location.href = prefix + 'gate/index.html';
      else this.clearSession();
      return null;
    }
    
    return user;
  },
  
  logout() {
    this.clearSession();
  }
};
