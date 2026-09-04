import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { authService, validatePasswordCriteria } from '../services/authService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onSuccessToast?: (msg: string) => void;
}

type Step = 'request_otp' | 'verify_otp' | 'new_password' | 'success';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  userEmail = '',
  onSuccessToast
}) => {
  const [step, setStep] = useState<Step>('request_otp');
  const [email, setEmail] = useState(userEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [verifiedOtp, setVerifiedOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Update email if userEmail changes
  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('request_otp');
      setEmail(userEmail || '');
      setOtpDigits(['', '', '', '']);
      setVerifiedOtp('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setInfoMessage('');
      setResendCooldown(0);
    }
  }, [isOpen, userEmail]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const passwordCriteria = validatePasswordCriteria(password);

  // STEP 1: Request OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid registered email address.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await authService.sendOtp(cleanEmail, 'forgot_password');
      setInfoMessage(res.message || `Verification code sent to ${cleanEmail}.`);
      setResendCooldown(45);
      setStep('verify_otp');
      setTimeout(() => {
        otpInputRefs[0].current?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Unable to send OTP. Please check your email and connection.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Input management
  const handleDigitChange = (index: number, val: string) => {
    setError('');
    // Handle paste of 4 digits
    if (val.length > 1) {
      const cleaned = val.replace(/\D/g, '').slice(0, 4);
      if (cleaned.length > 0) {
        const newDigits = ['', '', '', ''];
        for (let i = 0; i < cleaned.length; i++) {
          newDigits[i] = cleaned[i];
        }
        setOtpDigits(newDigits);
        const nextIdx = Math.min(cleaned.length, 3);
        otpInputRefs[nextIdx].current?.focus();
        return;
      }
    }

    const single = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = single;
    setOtpDigits(updated);

    if (single && index < 3) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const enteredCode = otpDigits.join('').trim();

    if (enteredCode.length !== 4) {
      setError('Please enter the complete 4-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const verifyRes = await authService.verifyOtp(cleanEmail, enteredCode);
      if (verifyRes.success) {
        // OTP matches! Go ahead to Step 3: Enter new password
        setVerifiedOtp(enteredCode);
        setStep('new_password');
      } else {
        setError(verifyRes.error || 'Incorrect 4-digit code. Please try again.');
        setOtpDigits(['', '', '', '']);
        otpInputRefs[0].current?.focus();
      }
    } catch (err: any) {
      // OTP did not match or error occurred: show error and do not proceed!
      setError(err.message || 'Incorrect verification code. Please check the digits and try again.');
      setOtpDigits(['', '', '', '']);
      otpInputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Save New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!passwordCriteria.isValid) {
      setError(passwordCriteria.error || 'New password does not meet required criteria.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.resetPassword(cleanEmail, verifiedOtp, password);
      setStep('success');
      onSuccessToast?.('Password has been updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please retry or request a new code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                Reset Password
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'request_otp' && 'Step 1: Dispatch Verification Code'}
                {step === 'verify_otp' && 'Step 2: Enter 4-Digit OTP'}
                {step === 'new_password' && 'Step 3: Create New Password'}
                {step === 'success' && 'Password Updated'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Global Error Banner */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* ================= STEP 1: REQUEST OTP ================= */}
          {step === 'request_otp' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="name@agrovet.com"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  A secure 4-digit code will be generated and dispatched to verify your account identity.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================= STEP 2: ENTER & VERIFY OTP ================= */}
          {step === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-blue-800">
                <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Verification code sent to <strong className="font-semibold text-slate-900">{email}</strong>.
                  {infoMessage && <p className="mt-1 text-[11px] text-blue-700">{infoMessage}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 text-center">
                  Enter 4-Digit Verification Code
                </label>
                <div className="flex items-center justify-center gap-3">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpInputRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`w-14 h-16 text-2xl font-black text-center rounded-2xl border-2 outline-none transition-all ${
                        error
                          ? 'border-red-400 bg-red-50/50 text-red-700'
                          : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-slate-900'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Resend & Timer */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={resendCooldown > 0 || loading}
                  className="text-blue-600 hover:text-blue-700 font-semibold disabled:text-slate-400 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep('request_otp')}
                  className="text-slate-400 hover:text-slate-600 text-[11px]"
                >
                  Change Email
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 4}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Checking OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Proceed</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================= STEP 3: ENTER NEW PASSWORD ================= */}
          {step === 'new_password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Code verified successfully. Set your new account password.</span>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Criteria */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] mt-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className={passwordCriteria.hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    &bull; Uppercase (A-Z)
                  </span>
                  <span className={passwordCriteria.hasLowercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    &bull; Lowercase (a-z)
                  </span>
                  <span className={passwordCriteria.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    &bull; Number (0-9)
                  </span>
                  <span className={passwordCriteria.hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    &bull; Special Char (!@#$)
                  </span>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !password || password !== confirmPassword || !passwordCriteria.isValid}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Saving Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================= STEP 4: SUCCESS ================= */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-slate-900">Password Reset Complete</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Your new credentials are now active. You can continue using AgroVet Pro securely with your updated password.
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
                >
                  Close & Return
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
