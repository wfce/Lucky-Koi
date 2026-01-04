
import React, { useEffect, useState, useRef } from 'react';
import { 
  Zap, Timer, Fuel, Coins, User, Activity, Hash, Copy, ExternalLink,
  X, Sparkles, PartyPopper, Ghost, Eye, ChevronLeft, ChevronRight, CheckCircle2,
  Loader2, ChevronRight as ChevronRightIcon, Settings
} from 'lucide-react';
import { LuckyLogo } from './Logo';
import { useLanguage } from '../contexts/LanguageContext';

export const formatBNBValue = (val: string | number) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? "0.0000" : num.toFixed(4);
};

export const StatusBadge: React.FC<{ active: boolean, inProgress: boolean, statusId?: number }> = ({ active, inProgress, statusId }) => {
  const { t } = useLanguage();
  
  if (inProgress) return (
    <span className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-500 text-[9px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse italic whitespace-nowrap pr-5">
      <Activity size={10} className="animate-spin"/> {t('dashboard.status.computing')}
    </span>
  );
  if (active) return (
    <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-sm italic whitespace-nowrap pr-5">
      <Zap size={10} className="fill-emerald-500 animate-bounce"/> {t('dashboard.status.ready')}
    </span>
  );
  
  let text = t('dashboard.status.cooldown');
  let icon = <Timer size={10} />;
  
  if (statusId === 6) { text = t('dashboard.status.noFuel'); icon = <Fuel size={10} />; }
  else if (statusId === 5) { text = t('dashboard.status.poolSmall'); icon = <Coins size={10} />; }
  else if (statusId === 4) { text = t('dashboard.status.noHolders'); icon = <User size={10} />; }

  return (
    <span className="px-3 py-1.5 bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 text-[9px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-sm italic whitespace-nowrap pr-5">
      {icon} {text}
    </span>
  );
};

export const NavTab: React.FC<{ active: boolean, onClick: () => void, label: string, icon: React.ReactNode, isMobile?: boolean }> = ({ active, onClick, label, icon, isMobile }) => (
  <button 
    onClick={onClick} 
    className={`
      flex items-center gap-3 px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider italic whitespace-nowrap transition-all duration-300 ease-out select-none
      ${isMobile ? 'w-full justify-start' : 'shrink-0 pr-5'}
      ${active 
        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-400/30 translate-y-[-1px]' 
        : 'text-zinc-500 bg-zinc-900/0 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent hover:border-white/5 active:scale-95'
      }
    `}
  >
    <span className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`}>{icon}</span>
    {label}
  </button>
);

export const AddressBox: React.FC<{ label: string, address: string, onCopy: (msg: string) => void, explorerLink?: string }> = ({ label, address, onCopy, explorerLink }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    onCopy(label + ' Copied');
  };
  return (
    <div className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/5 flex flex-row items-center justify-between gap-3 sm:gap-5 group flex-1 shadow-xl overflow-hidden hover:border-amber-500/20 transition-colors w-full">
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden flex-1">
        <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-zinc-900 text-zinc-500 shrink-0 group-hover:text-amber-500 transition-colors shadow-inner flex items-center justify-center`}>
            <Hash className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
        </div>
        <div className="flex flex-col min-w-0 overflow-hidden flex-1">
          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-600 italic pr-2 leading-none group-hover:text-amber-500/50 transition-colors">{label}</span>
          <span className="text-[9px] sm:text-xs font-mono font-bold text-zinc-400 mt-0.5 sm:mt-1 pr-1 w-full block break-all leading-tight">{address}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleCopy} className="p-2 sm:p-2.5 bg-zinc-950/80 rounded-lg sm:rounded-xl border border-white/5 text-zinc-500 hover:text-amber-500 transition-all shadow-inner active:scale-90 flex items-center justify-center">
            <Copy className="w-3.5 h-3.5 sm:w-[14px] sm:h-[14px]" />
        </button>
        {explorerLink && (
            <a href={explorerLink} target="_blank" rel="noreferrer" className="p-2 sm:p-2.5 bg-zinc-950/80 rounded-lg sm:rounded-xl border border-white/5 text-zinc-500 hover:text-emerald-500 transition-all shadow-inner active:scale-90 flex items-center justify-center">
                <ExternalLink className="w-3.5 h-3.5 sm:w-[14px] sm:h-[14px]" />
            </a>
        )}
      </div>
    </div>
  );
};

export const Notification: React.FC<{ show: boolean, type: 'error' | 'success' | 'info', title: string, message: string, onClose: () => void }> = ({ show, type, title, message, onClose }) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        if (onCloseRef.current) onCloseRef.current();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;
  const colors = { error: 'text-rose-500 border-rose-500/30', success: 'text-emerald-500 border-emerald-500/30', info: 'text-amber-500 border-amber-500/30' };
  return (
    <div className="fixed top-20 left-4 right-4 sm:left-auto sm:top-24 sm:right-12 z-[3000] animate-in slide-in-from-top-5 sm:slide-in-from-right-20">
      <div className={`glass-card p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border ${colors[type]} flex gap-4 items-center shadow-3xl w-full sm:w-auto sm:min-w-[280px] sm:max-w-[400px] backdrop-blur-2xl bg-[#0a0a0c]/95`}>
        <div className="flex-1 overflow-hidden">
          <h4 className="font-black text-white text-xs uppercase italic tracking-wider pr-4 truncate">{title}</h4>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide mt-1 italic pr-4 break-words">{message}</p>
        </div>
        <button onClick={onClose} className="text-zinc-700 hover:text-white shrink-0 active:scale-75 transition-transform"><X size={16}/></button>
      </div>
    </div>
  );
};

export const ResultModal: React.FC<{ 
  show: boolean, mode: 'winner' | 'loser' | 'guest', isWinner: boolean, amount: string, winnerAddress?: string, txHash?: string, onClose: () => void 
}> = ({ show, mode, isWinner, amount, winnerAddress, txHash, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const startTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!show || mode === 'winner') { 
        startTimeRef.current = null; 
        setTimeLeft(15); 
        return; 
    }
    startTimeRef.current = Date.now();
    const timer = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, 15 - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(timer); onClose(); }
    }, 100);
    return () => clearInterval(timer);
  }, [show, onClose, mode]);

  if (!show) return null;
  const content = {
    winner: { 
        title: '恭喜！锦鲤附体！', 
        subtitle: '鸿运当头 · 奖金已入账', 
        desc: 'Chainlink VRF 物理级随机数选中了您的地址！福泽深厚，大吉大利！', 
        icon: <div className="scale-125 relative"><LuckyLogo size={100} /><Sparkles className="absolute -top-4 -right-4 text-yellow-300 animate-pulse" size={30} /><PartyPopper className="absolute -bottom-4 -left-4 text-yellow-300 animate-bounce" size={30} /></div>, 
        theme: 'border-amber-500 bg-gradient-to-b from-red-900/90 to-amber-900/90 shadow-[0_0_100px_rgba(245,158,11,0.4)]' 
    },
    loser: { 
        title: '结算完毕', 
        subtitle: '本轮未中奖', 
        desc: '链上随机数已完成公平选取。只要持仓满足门槛，分红权将永久有效。', 
        icon: <Ghost className="text-zinc-600" size={64} />, 
        theme: 'border-zinc-800 bg-zinc-950/90' 
    },
    guest: { 
        title: '系统速报', 
        subtitle: '结算已触发', 
        desc: '协议检测到时间间隔已到，社区成员已唤醒锦鲤并执行派奖（已发放赏金）。', 
        icon: <Sparkles className="text-red-500" size={64} />, 
        theme: 'border-red-500/20 bg-gradient-to-b from-red-950/80 to-black/90' 
    }
  }[mode];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {isWinner && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-500 rounded-full animate-ping delay-75"></div>
              <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-red-500 rounded-full animate-ping delay-150"></div>
              <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-amber-500 rounded-full animate-ping delay-300"></div>
              <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
          </div>
      )}
      <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-700" onClick={onClose}></div>
      <div className={`relative glass-card w-full max-w-[90vw] sm:max-w-xl rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-14 border-2 ${content.theme} text-center space-y-8 sm:space-y-10 animate-in zoom-in-95 duration-500 overflow-hidden shadow-3xl`}>
        {!isWinner && (
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
                <div className="h-full bg-red-500 transition-all duration-100 ease-linear" style={{ width: `${(timeLeft / 15) * 100}%` }}></div>
            </div>
        )}
        <div className="space-y-6 pt-4 relative z-10">
          <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl relative overflow-visible ${isWinner ? 'bg-gradient-to-br from-amber-500/20 to-red-600/20 border border-amber-500/50' : 'bg-zinc-900 border border-white/10 overflow-hidden'}`}>
            {content.icon}
            {isWinner && <div className="absolute inset-0 bg-amber-500/10 rounded-[2.5rem] animate-ping pointer-events-none duration-1000"></div>}
          </div>
          <div className="space-y-2">
            <h2 className={`text-3xl sm:text-5xl font-black italic uppercase pr-4 leading-tight ${isWinner ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500' : 'text-white'}`}>{content.title}</h2>
            <p className={`${isWinner ? 'text-amber-300' : 'text-red-500'} text-[11px] font-black uppercase tracking-[0.5em] italic pr-4`}>{content.subtitle}</p>
          </div>
          <div className={`p-6 rounded-[2.5rem] border space-y-6 shadow-inner ${isWinner ? 'bg-gradient-to-br from-red-950/50 to-amber-900/30 border-amber-500/30' : 'bg-black/80 border-white/5'}`}>
            <div className="space-y-1">
              <span className={`text-[9px] font-black uppercase italic pr-4 ${isWinner ? 'text-amber-500' : 'text-zinc-600'}`}>{isWinner ? '您的收益' : '获胜锦鲤地址'}</span>
              <p className={`text-xs font-mono font-bold break-all select-all ${isWinner ? 'text-amber-200' : 'text-zinc-300'}`}>{isWinner ? '奖金已自动转入钱包' : winnerAddress}</p>
            </div>
            <div className="text-4xl sm:text-6xl font-black text-white stat-glow tabular-nums tracking-tighter leading-none">
              {formatBNBValue(amount)} <span className={`text-base sm:text-xl uppercase italic pr-2 ${isWinner ? 'text-amber-500' : 'accent-gradient'}`}>BNB</span>
            </div>
            {txHash && (
              <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase italic tracking-widest transition-all ${isWinner ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20' : 'bg-zinc-900/50 border border-white/5 text-zinc-500 hover:text-red-400'}`}><Eye size={12} /> 查看链上凭证</a>
            )}
          </div>
          <p className={`${isWinner ? 'text-amber-500/60' : 'text-zinc-500'} text-[10px] leading-relaxed font-bold uppercase italic pr-4`}>{content.desc}</p>
          <button onClick={onClose} className={`w-full py-5 rounded-[2rem] font-black uppercase italic active:scale-95 transition-all shadow-xl ${isWinner ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-red-500/30 hover:shadow-red-500/50' : 'action-button'}`}>确定</button>
        </div>
      </div>
    </div>
  );
};

export const DigitBox: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
  <div className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-zinc-900/50 border border-white/5 rounded-2xl min-w-[60px] sm:min-w-[80px] shadow-inner flex-1">
    <span className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tighter">{value}</span>
    <span className="text-[7px] sm:text-[8px] font-black text-zinc-600 uppercase italic pr-1">{label}</span>
  </div>
);

export const HeroStat: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-zinc-500 group-hover:text-amber-500/50 transition-colors">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-wider italic pr-2 whitespace-nowrap">{label}</span>
    </div>
    <div className="text-lg sm:text-xl font-black text-white italic tabular-nums pr-4 truncate">{value}</div>
  </div>
);

export const Pagination: React.FC<{ current: number, total: number, onChange: (page: number) => void }> = ({ current, total, onChange }) => (
  <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-white/5 border-t border-white/5">
    <span className="text-[9px] font-black text-zinc-600 uppercase italic">第 {current + 1} / {Math.max(1, total)} 页</span>
    <div className="flex items-center gap-2">
      <button disabled={current === 0} onClick={() => onChange(current - 1)} className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-all"><ChevronLeft size={14} /></button>
      <button disabled={current >= total - 1} onClick={() => onChange(current + 1)} className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-all"><ChevronRight size={14} /></button>
    </div>
  </div>
);

export const WalletButton: React.FC<{ name: string, icon: React.ReactNode, installed: boolean, onClick: () => void, disabled?: boolean, t: any }> = ({ name, icon, installed, onClick, disabled, t }) => (
  <button onClick={onClick} disabled={disabled} className={`w-full flex items-center justify-between p-4 bg-zinc-950/50 border border-white/5 rounded-2xl transition-all group shadow-inner relative overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-900 active:scale-[0.98] hover:border-amber-500/20'}`}>
    <div className="flex items-center gap-4 relative z-10">
      <div className={`w-10 h-10 rounded-xl bg-zinc-900 p-1.5 flex items-center justify-center border border-white/5 transition-transform shadow-lg ${!disabled && 'group-hover:scale-110'}`}>{icon}</div>
      <div className="text-left">
        <span className="block text-xs font-black text-zinc-300 uppercase italic leading-none group-hover:text-white transition-colors">{name}</span>
        {installed ? <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase italic mt-1.5"><CheckCircle2 size={8} /> {t('wallet.detected')}</span> : <span className="inline-flex items-center gap-1 text-[8px] font-black text-zinc-600 uppercase italic mt-1.5">{t('wallet.notInstalled')}</span>}
      </div>
    </div>
    {disabled ? <Loader2 size={16} className="text-zinc-600 animate-spin relative z-10"/> : <ChevronRightIcon size={16} className="text-zinc-700 group-hover:text-amber-500 group-hover:translate-x-1 transition-all relative z-10" />}
    {installed && (<div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full"></div>)}
  </button>
);

export const CardIconBox: React.FC<{ icon: React.ReactNode, title: string, desc: string, color: 'emerald' | 'orange' | 'amber' | 'red' }> = ({ icon, title, desc, color }) => {
  const themes = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10',
    red: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/10',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-orange-500/10',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10'
  };
  return (
    <div className="glass-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 space-y-4 sm:space-y-6 shadow-xl hover:translate-y-[-4px] transition-all duration-300 group">
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${themes[color]} border shadow-lg group-hover:scale-110 transition-transform`}>{icon}</div>
      <div className="space-y-2">
        <h4 className="font-black text-sm text-white uppercase italic pr-4">{title}</h4>
        <p className="text-[10px] text-zinc-500 font-bold leading-relaxed uppercase italic pr-4 group-hover:text-zinc-400 transition-colors">{desc}</p>
      </div>
    </div>
  );
};

export const AdminSection: React.FC<{ 
  title: string, 
  stats: { label: string, value: string | number }[], 
  actions: { label: string, method: string, args?: any[] }[],
  onAction: (method: string, args?: any[]) => void,
  loading?: boolean
}> = ({ title, stats, actions, onAction, loading }) => (
  <div className="glass-card rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6 sm:space-y-8">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-black text-white uppercase italic pr-4">{title}</h3>
      <Settings size={16} className="text-zinc-700" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {stats.map((s, i) => (
        <div key={i} className="space-y-1">
          <p className="text-zinc-600 text-[9px] font-black uppercase italic pr-2">{s.label}</p>
          <p className="text-sm font-mono font-black text-zinc-300">{s.value}</p>
        </div>
      ))}
    </div>
    <div className="space-y-3 pt-4 border-t border-white/5">
      {actions.map((a, i) => (
        <button 
          key={i} 
          disabled={loading}
          onClick={() => onAction(a.method, a.args)}
          className={`w-full py-4 px-6 bg-zinc-950/80 border border-white/5 rounded-2xl text-[10px] font-black text-zinc-400 transition-all uppercase italic text-left flex items-center justify-between group ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:border-red-500/30'}`}
        >
          {a.label}
          {loading ? <Loader2 size={12} className="animate-spin text-zinc-600"/> : <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
        </button>
      ))}
    </div>
  </div>
);
