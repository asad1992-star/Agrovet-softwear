import React, { useState } from 'react';
import { Lock, AlertOctagon, RefreshCw, LogOut, MessageCircle, Phone, Mail, ShieldAlert } from 'lucide-react';
import { authService, AuthUser, UserStatusInfo } from '../services/authService';

interface SuspendedLockScreenProps {
  user: AuthUser;
  statusInfo: UserStatusInfo | null;
  onRefresh: () => void;
  onLogout: () => void;
}

export const SuspendedLockScreen: React.FC<SuspendedLockScreenProps> = ({
  user,
  statusInfo,
  onRefresh,
  onLogout
}) => {
  const [checking, setChecking] = useState(false);

  const handleManualCheck = async () => {
    setChecking(true);
    await onRefresh();
    setTimeout(() => setChecking(false), 600);
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Dr. Asad, my AgroVet Pro farm account (${user.email}) is showing suspended access. I would like to renew my subscription / submit payment proof.`
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-slate-100 selection:bg-rose-500 selection:text-white">
      {/* Background Decorative Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-rose-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/50 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Lock Icon Badge */}
        <div className="relative mb-5">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/30 rounded-3xl flex items-center justify-center shadow-inner">
            <Lock className="w-10 h-10 text-rose-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 bg-rose-600 text-white rounded-full shadow-md">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
          <AlertOctagon className="w-3.5 h-3.5" />
          Farm Access Suspended
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Subscription Required
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-6">
          Access for <span className="font-bold text-slate-200">{user.email}</span> is currently suspended due to pending subscription payment or expired validity.
        </p>

        {/* Reason Card if custom reason provided */}
        {statusInfo?.suspensionReason && (
          <div className="w-full bg-rose-950/40 border border-rose-900/60 rounded-2xl p-4 mb-6 text-left">
            <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">
              Admin Notice / Reason
            </p>
            <p className="text-xs text-rose-200/90 leading-relaxed font-medium">
              {statusInfo.suspensionReason}
            </p>
          </div>
        )}

        {/* Action: WhatsApp & Hotline */}
        <div className="w-full bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 sm:p-5 mb-6 text-left space-y-3">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Reactivation Hotline & Payment Verification
          </p>

          <a
            href={`https://wa.me/923136451992?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            Contact Dr. Asad on WhatsApp (+92 313 6451992)
          </a>

          <div className="pt-2 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Vetasad1992@gmail.com</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>EasyPaisa / JazzCash / Bank</span>
            </div>
          </div>
        </div>

        {/* Buttons: Check status & Logout */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="flex-1 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-blue-400' : ''}`} />
            {checking ? 'Checking Status...' : 'I Have Paid — Refresh Access'}
          </button>

          <button
            onClick={onLogout}
            className="py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-500 font-semibold mt-6">
          AgroVet Pro &copy; {new Date().getFullYear()} Dr. Asad Mehmood. All farm data remains securely preserved.
        </p>
      </div>
    </div>
  );
};
