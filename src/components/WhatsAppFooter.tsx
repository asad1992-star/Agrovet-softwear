import React from 'react';
import { MessageCircle, Phone, ExternalLink, ShieldCheck, HeartPulse } from 'lucide-react';
import { AGROVET_LOGO_BASE64 } from '../utils/logoBase64';

interface WhatsAppFooterProps {
  className?: string;
  isReportFooter?: boolean;
}

export const WhatsAppFooter: React.FC<WhatsAppFooterProps> = ({ className = '', isReportFooter = false }) => {
  const whatsappUrl = "https://wa.me/923136451992?text=Hello%20Asad%20Mehmood,%20I%20need%20help%20with%20my%20AgroVet%20Pro%20farm%20account.";

  if (isReportFooter) {
    return (
      <div className={`mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-700">AgroVet Pro</span>
          <span className="text-slate-300">|</span>
          <span>Dairy &amp; Cattle Farm Management System</span>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
          <span>Support &amp; Assistance: +92 313 6451992 (Asad Mehmood)</span>
        </a>
      </div>
    );
  }

  return (
    <footer className={`w-full mt-12 bg-white border-t border-slate-200 py-6 px-4 sm:px-8 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding & Attribution */}
        <div className="flex items-center gap-3.5">
          <img
            src={AGROVET_LOGO_BASE64}
            alt="AgroVet Pro"
            className="w-11 h-11 rounded-xl object-cover shadow-md border border-slate-100 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 tracking-tight">AgroVet Pro</h4>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                V2.5 Stable
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Dairy &amp; Cattle Reproduction &amp; Health Platform &bull; Developed by <span className="font-bold text-slate-700">Asad Mehmood</span>
            </p>
          </div>
        </div>

        {/* WhatsApp Contact & Support CTA */}
        <div className="flex items-center gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 active:scale-95 transition-all duration-200"
          >
            <div className="p-1 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
              <MessageCircle className="w-4 h-4 fill-white" />
            </div>
            <span>Contact on WhatsApp: <strong className="tracking-wide">+92 313 6451992</strong></span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
          </a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <p>Your entered animals and herd database are securely isolated and automatically backed up to cloud &amp; local memory.</p>
        <p>If you are facing any issue, you can contact Asad Mehmood anytime on WhatsApp.</p>
      </div>
    </footer>
  );
};
