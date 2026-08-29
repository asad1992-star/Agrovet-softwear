import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Award,
  Users,
  FlaskConical,
  X,
  ChevronRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Percent,
  Download
} from 'lucide-react';
import {
  FertilityAnalyticsReport,
  RepeatBreederSummary,
  SemenPerformanceRecord,
  TechnicianPerformanceRecord
} from '../services/fertilityAnalytics';

interface FertilityAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: FertilityAnalyticsReport;
  onOpenAnimalProfile: (animalId: string) => void;
  onOpenReproFormForAnimal: (animalId: string) => void;
}

export const FertilityAnalyticsModal: React.FC<FertilityAnalyticsModalProps> = ({
  isOpen,
  onClose,
  analytics,
  onOpenAnimalProfile,
  onOpenReproFormForAnimal
}) => {
  const [activeTab, setActiveTab] = useState<'repeat' | 'semen' | 'technicians' | 'overview'>('repeat');
  const [selectedRepeatBreeder, setSelectedRepeatBreeder] = useState<RepeatBreederSummary | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Fertility & Conception Analytics</h2>
                <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {analytics.overallConceptionRate}% CR
                </span>
              </div>
              <p className="text-xs text-blue-100 font-bold flex items-center gap-1.5 mt-0.5">
                <span>Repeat Breeder Flagging • Semen Ranking • Technician Success</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 sm:px-8 pt-3 border-b border-slate-100 bg-slate-50 flex gap-3 overflow-x-auto no-scrollbar">
          {[
            {
              id: 'repeat',
              label: 'Repeat Breeders',
              badge: `${analytics.repeatBreederCount} Cows`,
              color: analytics.repeatBreederCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600',
              icon: AlertTriangle
            },
            {
              id: 'semen',
              label: 'Semen / Bull Performance',
              badge: `${analytics.semenPerformance.length} Semen`,
              color: 'bg-blue-100 text-blue-700',
              icon: FlaskConical
            },
            {
              id: 'technicians',
              label: 'AI Technicians',
              badge: `${analytics.technicianPerformance.length} Techs`,
              color: 'bg-indigo-100 text-indigo-700',
              icon: Users
            },
            {
              id: 'overview',
              label: 'Herd KPIs & Monthly Trend',
              badge: `${analytics.overallConceptionRate}%`,
              color: 'bg-emerald-100 text-emerald-700',
              icon: BarChart3
            }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3.5 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tab.color}`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Top KPI Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Herd Conception Rate</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{analytics.overallConceptionRate}%</span>
                <span className="text-[10px] text-slate-400 font-bold">({analytics.totalConfirmedPregnant}/{analytics.totalEvaluatedAI} AI)</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">1st Service CR</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-600">{analytics.firstServiceConceptionRate}%</span>
                <span className="text-[10px] text-slate-400 font-bold">Initial AI</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Services / Conception</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-indigo-600">{analytics.servicesPerConception || 0}</span>
                <span className="text-[10px] text-slate-400 font-bold">Target: &lt; 2.0</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Repeat Breeders</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black ${analytics.repeatBreederCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {analytics.repeatBreederCount}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">({analytics.repeatBreederPercentage}% of herd)</span>
              </div>
            </div>
          </div>

          {/* Tab 1: Repeat Breeders */}
          {activeTab === 'repeat' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <span>Repeat Breeder Cows (3+ Inseminations Without Conceiving)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    These cows require veterinary examination, uterine treatment, or protocol adjustments to prevent wasted semen.
                  </p>
                </div>
              </div>

              {analytics.repeatBreeders.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-emerald-100 text-center space-y-2 shadow-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="text-base font-black text-slate-800">No Repeat Breeders Detected!</h4>
                  <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                    All breeding cows in your herd are conceiving within 1 to 2 services. Excellent fertility management!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {analytics.repeatBreeders.map((rb) => (
                    <div
                      key={rb.animal.id}
                      className="p-5 bg-white rounded-3xl border border-slate-200 hover:border-rose-300 shadow-xs space-y-4 transition-all"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onOpenAnimalProfile(rb.animal.id)}
                                className="text-lg font-black text-slate-900 hover:text-blue-600 underline decoration-dotted"
                              >
                                Cow {rb.animal.tag}
                              </button>
                              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                {rb.animal.breed} • {rb.animal.herd}
                              </span>
                              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-rose-600 text-white rounded-lg shadow-xs">
                                ⚠️ AI #{rb.aiCount} (Repeat Breeder)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-bold mt-1">
                              Last AI: <span className="text-slate-800">{rb.lastAIDate}</span> • Last Semen: <span className="text-blue-600">{rb.lastSemen}</span> • Tech: {rb.lastTechnician}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenReproFormForAnimal(rb.animal.id)}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                          >
                            <span>Record AI / Repro</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenAnimalProfile(rb.animal.id)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
                          >
                            <span>View Card</span>
                          </button>
                        </div>
                      </div>

                      {/* Insemination History Timeline */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Insemination History in Current Cycle ({rb.servicesHistory.length} attempts):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {rb.servicesHistory.map((s, idx) => (
                            <div key={s.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-800">Service #{idx + 1}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  s.outcome === 'Pregnant' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {s.outcome}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-bold">{s.date}</p>
                              <p className="text-[10px] text-slate-600 truncate">🧬 {s.semenName}</p>
                              <p className="text-[10px] text-slate-400">👨‍⚕️ {s.technician}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Veterinary Recommendations */}
                      <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Recommended Clinical Actions for Cow {rb.animal.tag}:</span>
                        </p>
                        <ul className="list-disc list-inside text-xs text-amber-900 font-medium space-y-0.5 pl-1">
                          {rb.recommendations.map((rec, rIdx) => (
                            <li key={rIdx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Semen / Bull Performance */}
          {activeTab === 'semen' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-blue-600" />
                  <span>Semen / Bull Conception Rate Ranking</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Evaluates real pregnancy outcomes per semen brand or bull used in your liquid nitrogen tank.
                </p>
              </div>

              {analytics.semenPerformance.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-slate-100 text-center text-xs text-slate-400 font-bold">
                  No insemination records found to calculate semen conception rates.
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-3.5 px-5">Semen Name / Bull</th>
                          <th className="py-3.5 px-4 text-center">Total AI</th>
                          <th className="py-3.5 px-4 text-center">Confirmed Pregnant</th>
                          <th className="py-3.5 px-4 text-center">Confirmed Open</th>
                          <th className="py-3.5 px-4 text-center">Pending PD</th>
                          <th className="py-3.5 px-5 text-right">Conception Rate (CR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                        {analytics.semenPerformance.map((sem, idx) => {
                          const isTop = idx === 0 && sem.totalAI >= 2 && sem.conceptionRate >= 50;
                          return (
                            <tr key={sem.semenName} className="hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2">
                                  {isTop && <Award className="w-4 h-4 text-amber-500 shrink-0" />}
                                  <span className="font-black text-slate-900">{sem.semenName}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">{sem.totalAI}</td>
                              <td className="py-4 px-4 text-center text-emerald-600 font-black">{sem.confirmedPregnant}</td>
                              <td className="py-4 px-4 text-center text-rose-600 font-black">{sem.confirmedOpen}</td>
                              <td className="py-4 px-4 text-center text-slate-400">{sem.pendingPD}</td>
                              <td className="py-4 px-5 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
                                    <div
                                      className={`h-full rounded-full ${
                                        sem.conceptionRate >= 60
                                          ? 'bg-emerald-500'
                                          : sem.conceptionRate >= 45
                                          ? 'bg-blue-500'
                                          : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${sem.conceptionRate}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                                    sem.conceptionRate >= 60
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : sem.conceptionRate >= 45
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {sem.conceptionRate}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Technician Success */}
          {activeTab === 'technicians' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>AI Technician / Inseminator Success Ranking</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Monitors individual AI success rates to identify training or technique improvement opportunities.
                </p>
              </div>

              {analytics.technicianPerformance.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-slate-100 text-center text-xs text-slate-400 font-bold">
                  No technician data recorded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {analytics.technicianPerformance.map((tech) => (
                    <div key={tech.technician} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Users className="w-4 h-4" />
                          </div>
                          <h4 className="font-black text-slate-900">{tech.technician}</h4>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          tech.benchmark === 'Excellent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tech.benchmark === 'Good'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {tech.benchmark}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                        <span className="text-xs text-slate-400 font-bold">Conception Rate:</span>
                        <span className="text-2xl font-black text-indigo-700">{tech.conceptionRate}%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px] font-bold">
                        <div className="p-2 bg-slate-50 rounded-xl">
                          <p className="text-[9px] uppercase text-slate-400">Total AI</p>
                          <p className="text-slate-800 font-black">{tech.totalAI}</p>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-800">
                          <p className="text-[9px] uppercase text-emerald-600">Pregnant</p>
                          <p className="font-black">{tech.confirmedPregnant}</p>
                        </div>
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-800">
                          <p className="text-[9px] uppercase text-rose-600">Open</p>
                          <p className="font-black">{tech.confirmedOpen}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Overview & Trends */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  <span>Monthly Conception Trends & Targets</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Historical monthly progression of artificial insemination outcomes.
                </p>
              </div>

              {analytics.monthlyConceptionTrend.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-slate-100 text-center text-xs text-slate-400 font-bold">
                  No monthly trend data available yet.
                </div>
              ) : (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="space-y-3">
                    {analytics.monthlyConceptionTrend.map((m) => (
                      <div key={m.month} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-800 font-black">{m.month}</span>
                          <span className="text-slate-600">
                            {m.pregnant} Pregnant / {m.totalAI} Services ({m.cr}% CR)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, m.cr)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-bold hidden sm:block">
            Commercial benchmark: Aim for &gt; 50% Conception Rate and &lt; 10% Repeat Breeders.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
