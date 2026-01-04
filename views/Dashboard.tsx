
import React from 'react';
import { Globe, Trophy, TrendingUp, Coins, Users, ShieldCheck, Target, Zap, Waves, AlertCircle, Settings, Clock, Fuel, Sparkles } from 'lucide-react';
import { ContractStats, LotteryRecord, TriggerStatus } from '../types';
import { formatBNBValue, StatusBadge, DigitBox, HeroStat, CardIconBox } from '../components/Shared';
import { LuckyLogo } from '../components/Logo';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  stats: ContractStats | null;
  history: LotteryRecord[];
  triggerStatus: TriggerStatus;
  countdown: { h: string, m: string, s: string, isZero: boolean };
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, history, triggerStatus, countdown }) => {
  const { t } = useLanguage();
  const isFlipped = stats?.inProgress || stats?.canTrigger || (countdown.isZero && !stats?.canTrigger && triggerStatus !== TriggerStatus.IntervalNotReached);

  const renderCardBackContent = () => {
    if (stats?.inProgress) {
      return (
        <>
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
             <Waves size={32} className="text-white animate-spin-slow" />
          </div>
          <div className="space-y-1">
             <h3 className="text-white text-lg font-black uppercase italic">{t('dashboard.card.processing')}</h3>
             <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">{t('dashboard.card.processingDesc')}</p>
          </div>
        </>
      );
    }
    
    let icon = <AlertCircle size={32} className="text-white"/>;
    let title = t('dashboard.card.processing');
    let desc = t('dashboard.card.processingDesc');
    let colorClass = "bg-zinc-700 shadow-zinc-500/20";
    let textClass = "text-zinc-400";

    switch (triggerStatus) {
      case TriggerStatus.Success:
         icon = <Zap size={32} className="text-white"/>; title = t('dashboard.card.ready'); desc = t('dashboard.card.readyDesc'); colorClass = "bg-emerald-500 shadow-emerald-500/40"; textClass = "text-emerald-500"; break;
      case TriggerStatus.TokenNotSet:
         icon = <Settings size={32} className="text-white"/>; title = t('dashboard.card.tokenNotSet'); desc = t('dashboard.card.tokenNotSetDesc'); colorClass = "bg-amber-500 shadow-amber-500/40"; textClass = "text-amber-500"; break;
      case TriggerStatus.NoHolders:
         icon = <Users size={32} className="text-white"/>; title = t('dashboard.card.noHolders'); desc = t('dashboard.card.noHoldersDesc'); colorClass = "bg-red-500 shadow-red-500/40"; textClass = "text-red-500"; break;
      case TriggerStatus.PoolTooSmall:
         return (
            <div className="flex flex-col items-center gap-4 relative">
                <div className="absolute -top-4 -right-4 animate-pulse opacity-50"><Sparkles className="text-sky-300" size={16}/></div>
                <div className="absolute -bottom-2 -left-4 animate-bounce opacity-50"><Sparkles className="text-sky-400" size={12}/></div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/40 overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 right-0 bg-white/30 h-1/2 animate-[wave_2s_infinite_ease-in-out]"></div>
                    <Waves size={32} className="text-white animate-bounce relative z-10" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-white text-lg font-black uppercase italic tracking-tight">{t('dashboard.card.poolSmall')}</h3>
                    <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest animate-pulse">{t('dashboard.card.poolSmallDesc')}</p>
                </div>
            </div>
         );
      case TriggerStatus.InsufficientLink:
         icon = <Fuel size={32} className="text-white"/>; title = t('dashboard.card.noFuel'); desc = t('dashboard.card.noFuelDesc'); colorClass = "bg-red-600 shadow-red-600/40"; textClass = "text-red-600"; break;
      case TriggerStatus.IntervalNotReached:
          icon = <Clock size={32} className="text-white"/>; title = t('dashboard.card.cooldown'); desc = t('dashboard.card.cooldownDesc'); colorClass = "bg-zinc-600 shadow-zinc-600/40"; textClass = "text-zinc-400"; break;
    }
    
    return (
        <>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${colorClass}`}>{icon}</div>
          <div className="space-y-1"><h3 className="text-white text-lg font-black uppercase italic">{title}</h3><p className={`${textClass} text-[10px] font-black uppercase tracking-widest`}>{desc}</p></div>
        </>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      <div className="relative rounded-[2rem] sm:rounded-[3rem] glass-card p-5 sm:p-10 border border-white/10 shadow-2xl overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none scale-125"><LuckyLogo size={500} /></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-10 pb-4 sm:pb-6">
          <div className="space-y-4 sm:space-y-6 text-center md:text-left flex-1 w-full">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest italic pr-2"><Globe size={12}/> {t('dashboard.poolTitle')}</div>
            <div className="space-y-1">
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] italic pr-2">{t('dashboard.poolDesc')}</p>
              <div className="flex items-baseline justify-center md:justify-start gap-2 flex-wrap">
                <h1 className="text-5xl sm:text-7xl font-black text-white stat-glow tabular-nums tracking-tighter pr-2 sm:pr-6 pb-2 leading-tight accent-gradient">
                    {formatBNBValue(stats?.actualLotteryPool || "0")}
                </h1>
                <span className="text-base sm:text-xl font-black text-amber-500 uppercase italic pr-2">BNB</span>
              </div>
              {history.length > 0 && (
                <div className="pt-2 sm:pt-3 flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-lg shadow-inner">
                      <Trophy size={12} className="text-amber-500" />
                      <span className="text-[9px] font-black text-zinc-500 uppercase italic tracking-wider">{t('dashboard.latestWinner')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-zinc-300">{history[0].winner.slice(0, 6)}...{history[0].winner.slice(-4)}</span>
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 tabular-nums shadow-[0_0_10px_rgba(16,185,129,0.2)]">+{formatBNBValue(history[0].reward)} BNB</span>
                   </div>
                </div>
              )}
            </div>
          </div>
          <div className="flip-container w-full md:w-[320px] h-[180px] sm:h-[200px] mb-4 sm:mb-0">
            <div className={`flip-card w-full h-full ${isFlipped ? 'flipped' : ''}`}>
              <div className="flip-card-front bg-zinc-950/80 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between"><p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 italic pr-2"><Clock size={10}/> {t('dashboard.countdown')}</p><StatusBadge active={stats?.canTrigger || false} inProgress={false} statusId={triggerStatus} /></div>
                <div className="flex gap-2 sm:gap-3"><DigitBox label={t('dashboard.hour')} value={countdown.h} /><DigitBox label={t('dashboard.minute')} value={countdown.m} /><DigitBox label={t('dashboard.second')} value={countdown.s} /></div>
              </div>
              <div className="flip-card-back bg-gradient-to-br from-red-500/10 to-amber-500/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col justify-center items-center gap-4 text-center">
                 {renderCardBackContent()}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pt-8 sm:pt-10 mt-8 sm:mt-10 border-t border-white/5 relative z-10">
          <HeroStat icon={<TrendingUp size={14}/>} label={t('dashboard.stats.totalLotteries')} value={stats?.totalLotteries || 0} />
          <HeroStat icon={<Coins size={14}/>} label={t('dashboard.stats.contractTotal')} value={`${formatBNBValue(stats?.contractTotal || 0)}`} />
          <HeroStat icon={<Users size={14}/>} label={t('dashboard.stats.holderCount')} value={stats?.holderCount || 0} />
          <HeroStat icon={<ShieldCheck size={14}/>} label={t('dashboard.stats.vrf')} value="VRF V2.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardIconBox icon={<Target size={20}/>} title={t('dashboard.features.f1Title')} desc={t('dashboard.features.f1Desc')} color="emerald" />
        <CardIconBox icon={<Zap size={20}/>} title={t('dashboard.features.f2Title')} desc={t('dashboard.features.f2Desc')} color="orange" />
        <CardIconBox icon={<ShieldCheck size={20}/>} title={t('dashboard.features.f3Title')} desc={t('dashboard.features.f3Desc')} color="red" />
      </div>
    </div>
  );
};
