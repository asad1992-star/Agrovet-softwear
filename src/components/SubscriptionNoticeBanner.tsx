import React, { useState } from 'react';
import { AlertTriangle, Info, Bell, X, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { UserStatusInfo } from '../services/authService';

interface SubscriptionNoticeBannerProps {
  statusInfo: UserStatusInfo | null;
  userEmail: string;
}

export const SubscriptionNoticeBanner: React.FC<SubscriptionNoticeBannerProps> = ({
  statusInfo,
  userEmail
}) => {
  const [dismissedWarning, setDismissedWarning] = useState(false);
  const [dismissedBroadcast, setDismissedBroadcast] = useState(false);

  if (!statusInfo) return null;

  const isWarning = statusInfo.status === 'warning' && !dismissedWarning;
  const hasBroadcast = statusInfo.broadcast?.active && !dismissedBroadcast;

  if (!isWarning && !hasBroadcast) return null;

  const whatsappMessage = encodeURIComponent(
    `Hello Dr. Asad, I received a payment notice for my AgroVet Pro farm account (${userEmail}). How do I submit renewal payment?`
  );

  return (
    <div className="w-full flex flex-col gap-2 p-2 sm:p-3 bg-slate-900 border-b border-slate-800 text-white animate-in slide-in-from-top duration-300 z-50">
      {/* Broadcast Announcement */}
      {hasBroadcast && statusInfo.broadcast && (
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3 bg-blue-950/80 border border-blue-800/60 rounded-xl px-3 sm:px-4 py-2 text-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="p-1.5 bg-blue-600 rounded-lg text-white flex-shrink-0">
              <Bell className="w-3.5 h-3.5 animate-bounce" />
            </span>
            <div className="truncate">
              <span className="font-bold text-blue-300 mr-2 uppercase text-[10px] tracking-wider">System Announcement:</span>
              <span className="text-blue-100 font-medium">{statusInfo.broadcast.message}</span>
            </div>
          </div>
          <button
            onClick={() => setDismissedBroadcast(true)}
            className="p-1 text-blue-300 hover:text-white rounded-md transition-colors flex-shrink-0"
            title="Dismiss Announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Payment Due Warning Banner */}
      {isWarning && (
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-950/80 border border-amber-600/50 rounded-xl px-3 sm:px-4 py-2.5 text-xs shadow-lg shadow-amber-950/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="p-1.5 bg-amber-500 text-slate-950 font-black rounded-lg flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <p className="font-bold text-amber-200">
                Subscription Payment Notice
                {statusInfo.gracePeriodDays ? (
                  <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-mono text-[10px] border border-amber-500/30">
                    {statusInfo.gracePeriodDays} Days Grace Period
                  </span>
                ) : null}
              </p>
              <p className="text-amber-100/90 text-[11px] mt-0.5 leading-snug">
                {statusInfo.warningMessage || 'Your subscription renewal is due. Please renew to avoid account suspension.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            <a
              href={`https://wa.me/923136451992?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow transition-all active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              Pay / Renew via WhatsApp
            </a>
            <button
              onClick={() => setDismissedWarning(true)}
              className="p-1.5 text-amber-300 hover:text-white hover:bg-amber-900/50 rounded-lg transition-colors"
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
