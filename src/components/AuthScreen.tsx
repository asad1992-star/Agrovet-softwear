import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  KeyRound,
  Check,
  X,
  HeartPulse
} from 'lucide-react';
import { authService, AuthUser, validatePasswordCriteria } from '../services/authService';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot_password';
type OtpStep = 'enter_details' | 'verify_otp';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [otpStep, setOtpStep] = useState<OtpStep>('enter_details');

  // Form Fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP State (4 digits)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const otpInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Timers & State
  const [countdownSeconds, setCountdownSeconds] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(0); // 30 seconds
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password criteria
  const passwordCriteria = validatePasswordCriteria(password);

  // 10-min countdown timer
  useEffect(() => {
    let timer: any;
    if (otpStep === 'verify_otp' && countdownSeconds > 0) {
      timer = setInterval(() => {
        setCountdownSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpStep, countdownSeconds]);

  // 30-sec resend cooldown timer
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const resetOtpForm = () => {
    setOtpDigits(['', '', '', '']);
    setCountdownSeconds(600);
    setAttemptsRemaining(3);
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      const copy = [...otpDigits];
      copy[index] = '';
      setOtpDigits(copy);
      return;
    }

    // Handle single or multi-character paste
    const chars = clean.split('');
    const copy = [...otpDigits];
    for (let i = 0; i < chars.length && index + i < 4; i++) {
      copy[index + i] = chars[i];
    }
    setOtpDigits(copy);

    const nextIndex = Math.min(index + chars.length, 3);
    if (nextIndex < 4) {
      otpInputRefs[nextIndex]?.current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1]?.current?.focus();
    }
  };

  // 1. Regular Login (Password Only, No OTP required for daily logins)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const user = await authService.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Request OTP for Signup or Forgot Password
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup') {
      if (!passwordCriteria.isValid) {
        setError(passwordCriteria.error || 'Password must meet all security requirements.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await authService.sendOtp(email, mode === 'signup' ? 'signup' : 'forgot_password');
      setOtpStep('verify_otp');
      resetOtpForm();
      setResendCooldown(30);
      setSuccessMsg(res.message || `4-digit verification code sent to ${email}`);
      setTimeout(() => {
        otpInputRefs[0]?.current?.focus();
      }, 150);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await authService.sendOtp(email, mode === 'signup' ? 'signup' : 'forgot_password');
      resetOtpForm();
      setResendCooldown(30);
      setSuccessMsg(`A fresh 4-digit code has been sent to ${email}`);
      otpInputRefs[0]?.current?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP and Complete Signup / Password Reset
  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 4) {
      setError('Please enter all 4 digits of the verification code.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const user = await authService.signup(email, password, enteredOtp, name);
        setSuccessMsg('Account created successfully! Welcome to AgroVet Pro.');
        setTimeout(() => onLoginSuccess(user), 600);
      } else if (mode === 'forgot_password') {
        if (!passwordCriteria.isValid) {
          setError(passwordCriteria.error || 'New password must meet security requirements.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        const user = await authService.resetPassword(email, enteredOtp, password);
        setSuccessMsg('Password reset successfully! Full farm records restored.');
        setTimeout(() => onLoginSuccess(user), 800);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
      setAttemptsRemaining(prev => Math.max(0, prev - 1));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setOtpStep('enter_details');
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
    resetOtpForm();
  };

  const whatsappSupportUrl = "https://wa.me/923136451992?text=Hello%20Dr.%20Asad,%20I%20need%20help%20with%20my%20AgroVet%20Pro%20farm%20account.";

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 bg-[url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80')] bg-cover bg-center font-sans antialiased relative">
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"></div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100/50 p-6 sm:p-10 transition-all duration-300">
          
          {/* Header Branding */}
          <div className="flex items-center gap-4 mb-6">
            <img
              src="/agrovet-logo.png"
              alt="AgroVet Pro Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-xl border border-slate-100 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  AgroVet<span className="text-emerald-600">Pro</span>
                </h1>
                <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                  V2.5
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Dairy &amp; Cattle Farm Management &bull; Asad Mehmood
              </p>
            </div>
          </div>

          {/* Title & Description based on state */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && (otpStep === 'verify_otp' ? 'Verify Email Address' : 'Create Farm Account')}
              {mode === 'forgot_password' && (otpStep === 'verify_otp' ? 'Verify OTP & Reset Password' : 'Reset Account Password')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {mode === 'login' && 'Log in with your registered email and password.'}
              {mode === 'signup' && (otpStep === 'verify_otp' ? `Enter the 4-digit code sent to ${email}` : 'Get started with your own secure, private farm database.')}
              {mode === 'forgot_password' && (otpStep === 'verify_otp' ? `Enter the 4-digit OTP sent to ${email} and choose a new password.` : 'Enter your registered email to receive a 4-digit recovery code.')}
            </p>
          </div>

          {/* Alerts: Error / Success */}
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3.5 rounded-2xl mb-5 text-xs sm:text-sm font-semibold border border-rose-200 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-2xl mb-5 text-xs sm:text-sm font-semibold border border-emerald-200 flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= MODE: LOGIN ================= */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="farmer@domain.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:bg-slate-300 transition-all cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm shadow-md shadow-blue-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= MODE: SIGNUP (Step 1: Enter Details) ================= */}
          {mode === 'signup' && otpStep === 'enter_details' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Your Name / Farm Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="Dr. Tariq Farm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address (For OTP Verification)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="farmer@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:bg-slate-300 transition-all cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>

                {/* Password Criteria Checklist */}
                <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <p className="font-bold text-slate-500 mb-1 text-[11px]">Password Security Requirements:</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                      {passwordCriteria.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasLowercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                      {passwordCriteria.hasLowercase ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                      <span>Lowercase (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                      {passwordCriteria.hasNumber ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                      <span>Number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                      {passwordCriteria.hasSpecial ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                      <span>Special (!@#$%)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:bg-slate-300 transition-all cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm shadow-md shadow-blue-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Sending 4-Digit OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= MODE: FORGOT PASSWORD (Step 1: Enter Email) ================= */}
          {mode === 'forgot_password' && otpStep === 'enter_details' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="farmer@domain.com"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  A 4-digit code will be sent to your email inbox from <strong className="text-slate-600">Vetasad1992@gmail.com</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm shadow-md shadow-blue-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Sending 4-Digit OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= OTP VERIFICATION (Step 2 for Signup / Forgot Password) ================= */}
          {otpStep === 'verify_otp' && (
            <form onSubmit={handleVerifyAndSubmit} className="space-y-5">
              {/* Instructions banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-[13px]">Check your email inbox</p>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    A 4-digit verification code was sent to <strong className="text-slate-900 font-semibold">{email}</strong> from <span className="font-semibold text-blue-700">Vetasad1992@gmail.com</span>. Please copy the code from your email and enter it below.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    💡 If not in your primary inbox, please check your <strong>Spam</strong> or <strong>Updates</strong> folder.
                  </p>
                </div>
              </div>

              {/* 4-Digit Input Boxes */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 text-center">
                  Enter 4-Digit Code
                </label>
                <div className="flex items-center justify-center gap-3 sm:gap-4">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={otpInputRefs[index]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        if (error) setError('');
                        handleDigitChange(index, e.target.value);
                      }}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`w-14 h-16 sm:w-16 sm:h-20 text-2xl sm:text-3xl font-black text-center text-slate-900 bg-slate-50 border-2 rounded-2xl outline-none transition-all ${
                        error
                          ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Extra Password fields if Forgot Password mode */}
              {mode === 'forgot_password' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => setShowPassword(prev => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:bg-slate-300 transition-all cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>

                    {/* Criteria checklist */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] mt-1.5 p-2 bg-slate-50 rounded-lg">
                      <span className={passwordCriteria.hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}>&bull; Uppercase (A-Z)</span>
                      <span className={passwordCriteria.hasLowercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}>&bull; Lowercase (a-z)</span>
                      <span className={passwordCriteria.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}>&bull; Number (0-9)</span>
                      <span className={passwordCriteria.hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}>&bull; Special (!@#$)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:bg-slate-300 transition-all cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Info: Countdown, Attempts, Resend */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                <span className="font-semibold text-slate-600">
                  ⏱ Valid: <strong className="text-blue-600">{formatTime(countdownSeconds)}</strong>
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {attemptsRemaining} attempt(s) left
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs text-slate-400">Didn't receive code?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                </button>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setOtpStep('enter_details')}
                  className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'signup' ? 'Verify & Sign Up' : 'Verify & Reset'}</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Mode Switch Footer Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            {mode === 'login' ? (
              <>
                <span>New to AgroVet Pro?</span>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Create New Account &rarr;
                </button>
              </>
            ) : (
              <>
                <span>Already registered?</span>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Sign In to Your Farm &rarr;
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Direct WhatsApp Support Footer on Auth Page */}
      <div className="relative z-10 w-full bg-slate-950/80 border-t border-slate-800 py-3.5 px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p className="font-medium">
            AgroVet Pro &bull; Developed by <strong className="text-white">Asad Mehmood</strong>
          </p>
          <a
            href={whatsappSupportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/60 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-emerald-400" />
            <span>Need Help? WhatsApp: +92 313 6451992</span>
          </a>
        </div>
      </div>
    </div>
  );
};
