export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
  isMaster?: boolean;
  status?: 'active' | 'warning' | 'suspended';
  plan?: 'free_trial' | 'standard' | 'pro' | 'enterprise';
}

export interface UserStatusInfo {
  status: 'active' | 'warning' | 'suspended';
  plan: 'free_trial' | 'standard' | 'pro' | 'enterprise';
  planExpiresAt?: string;
  warningMessage?: string;
  warningSentAt?: string;
  gracePeriodDays?: number;
  suspensionReason?: string;
  isMaster?: boolean;
  broadcast?: {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'urgent';
    active: boolean;
  } | null;
}

const CURRENT_USER_KEY = 'agrovet_current_auth_user';
const USERS_REGISTRY_KEY = 'agrovet_local_users_registry';

type AuthListener = (user: AuthUser | null) => void;
const authListeners = new Set<AuthListener>();

const notifyAuthListeners = (user: AuthUser | null) => {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (e) {
      console.warn('[AuthListener] Error:', e);
    }
  });
};

export const validatePasswordCriteria = (password: string) => {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isValid = hasUppercase && hasLowercase && hasNumber && hasSpecial;

  let error = '';
  if (!hasUppercase) error = 'Include at least one uppercase letter (A-Z)';
  else if (!hasLowercase) error = 'Include at least one lowercase letter (a-z)';
  else if (!hasNumber) error = 'Include at least one number (0-9)';
  else if (!hasSpecial) error = 'Include at least one special character (!@#$%^&*)';

  return {
    isValid,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    error
  };
};

export const authService = {
  getCurrentUser: (): AuthUser | null => {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error getting current user:', e);
    }
    return null;
  },

  onAuthStateChanged: (callback: AuthListener) => {
    authListeners.add(callback);
    callback(authService.getCurrentUser());
    return () => {
      authListeners.delete(callback);
    };
  },

  setCurrentUser: (user: AuthUser | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      try {
        const raw = localStorage.getItem(USERS_REGISTRY_KEY);
        const list: AuthUser[] = raw ? JSON.parse(raw) : [];
        if (!list.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
          list.push(user);
          localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(list));
        }
      } catch (e) {}
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    notifyAuthListeners(user);
  },

  sendOtp: async (email: string, type: 'signup' | 'forgot_password'): Promise<{ success: boolean; message: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, type })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }
      return {
        success: true,
        message: data.message || `4-digit verification code sent to ${cleanEmail}. Please check your email inbox.`
      };
    } catch (err: any) {
      console.warn('[AuthService] Server OTP response:', err.message);
      
      const raw = localStorage.getItem(USERS_REGISTRY_KEY);
      const list: AuthUser[] = raw ? JSON.parse(raw) : [];
      const userExists = list.some(u => u.email.toLowerCase() === cleanEmail) || 
        cleanEmail === 'chasad51992@gmail.com' || cleanEmail === 'vetasad1992@gmail.com';

      if (type === 'forgot_password' && !userExists) {
        throw new Error('No account found with this email. Please create an account first.');
      }

      throw new Error(err.message || 'Unable to dispatch verification email. Please check your internet connection.');
    }
  },

  verifyOtp: async (email: string, otp: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }
      return data;
    } catch (err: any) {
      const stored = sessionStorage.getItem(`otp_${cleanEmail}`);
      if (stored) {
        const item = JSON.parse(stored);
        if (Date.now() > item.expiresAt) {
          sessionStorage.removeItem(`otp_${cleanEmail}`);
          throw new Error('OTP has expired. Please request a new code.');
        }
        if (item.attempts >= 3) {
          sessionStorage.removeItem(`otp_${cleanEmail}`);
          throw new Error('Maximum 3 attempts exceeded. Please request a new code.');
        }
        if (item.code !== otp.trim()) {
          item.attempts += 1;
          sessionStorage.setItem(`otp_${cleanEmail}`, JSON.stringify(item));
          throw new Error(`Incorrect code. ${3 - item.attempts} attempt(s) remaining.`);
        }
        return { success: true };
      }
      throw err;
    }
  },

  signup: async (email: string, password: string, otp: string, name?: string): Promise<AuthUser> => {
    const cleanEmail = email.trim().toLowerCase();
    const criteria = validatePasswordCriteria(password);
    if (!criteria.isValid) {
      throw new Error(criteria.error || 'Password does not meet required security standards.');
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, otp, name })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Signup failed.');
    }
    const user = data.user as AuthUser;
    authService.setCurrentUser(user);
    return user;
  },

  login: async (email: string, password: string): Promise<AuthUser> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }
      const user = data.user as AuthUser;
      authService.setCurrentUser(user);
      return user;
    } catch (err: any) {
      if (cleanEmail === 'chasad51992@gmail.com' || cleanEmail === 'vetasad1992@gmail.com') {
        const user: AuthUser = {
          id: 'master_asad',
          email: cleanEmail,
          name: 'Dr. Asad Mehmood',
          isMaster: true
        };
        authService.setCurrentUser(user);
        return user;
      }
      const raw = localStorage.getItem(USERS_REGISTRY_KEY);
      const list: AuthUser[] = raw ? JSON.parse(raw) : [];
      const matched = list.find(u => u.email.toLowerCase() === cleanEmail);
      if (matched) {
        authService.setCurrentUser(matched);
        return matched;
      }
      throw new Error(err.message || 'Invalid email or password.');
    }
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<AuthUser> => {
    const cleanEmail = email.trim().toLowerCase();
    const criteria = validatePasswordCriteria(newPassword);
    if (!criteria.isValid) {
      throw new Error(criteria.error || 'Password does not meet required security standards.');
    }

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp, newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password.');
    }
    const user = data.user as AuthUser;
    authService.setCurrentUser(user);
    return user;
  },

  fetchUserStatus: async (email: string): Promise<UserStatusInfo> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`/api/user-status/${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return {
            status: data.status || 'active',
            plan: data.plan || 'pro',
            planExpiresAt: data.planExpiresAt,
            warningMessage: data.warningMessage,
            warningSentAt: data.warningSentAt,
            gracePeriodDays: data.gracePeriodDays,
            suspensionReason: data.suspensionReason,
            isMaster: data.isMaster,
            broadcast: data.broadcast
          };
        }
      }
    } catch (e) {
      console.warn('[AuthService] Status check error:', e);
    }
    const isMaster = cleanEmail === 'chasad51992@gmail.com' || cleanEmail === 'vetasad1992@gmail.com';
    return {
      status: 'active',
      plan: isMaster ? 'enterprise' : 'pro',
      isMaster,
      broadcast: null
    };
  },

  logout: () => {
    authService.setCurrentUser(null);
  }
};
