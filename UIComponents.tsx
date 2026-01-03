
import React, { useEffect, useState, useRef } from 'react';
import { 
  Zap, Clock, Lock, ChevronLeft, ChevronRight, 
  Settings, TrendingUp, Coins, Copy, ExternalLink,
  X, Trophy, Sparkles, Hash, Activity, Ghost, User, 
  Eye, Wallet, ChevronRight as ChevronRightIcon,
  ShieldCheck, Info, Gift, Timer, CheckCircle2, Loader2,
  AlertTriangle, Flame, PartyPopper, Fuel
} from 'lucide-react';
import { LuckyLogo } from './Logo';

export const formatBNBValue = (val: string | number) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? "0.0000" : num.toFixed(4);
};

export const StatusBadge: React.FC<{ active: boolean, inProgress: boolean, statusId?: number }> = ({ active, inProgress, statusId }) => {
  if (inProgress) return (
    <span className="px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-500 text-[9px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(225,29,72,0.3)] animate-pulse italic whitespace-nowrap pr-5">
      <Activity size={10} className="animate-spin"/> VRF 运算中
    </span>
  );
  if (active) return (
    <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-sm italic whitespace-nowrap pr-5">
      <Zap size={10} className="fill-emerald-500 animate-bounce"/> 系统就绪
    </span>
  );
  
  // Map specific status codes if provided
  let text = "冷却中";
  let icon = <Timer size={10} />;
  
  if (statusId === 6) { text = "LINK 燃料不足"; icon = <Fuel size={10} />; }
  else if (statusId === 5) { text = "奖池过小"; icon = <Coins size={10} />; }
  else if (statusId === 4) { text = "暂无持币者"; icon = <User size={10} />; }

  return (
    <span className="px-3 py-1.5 bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 text-[9px] font-black uppercase rounded-full flex items-center gap-1.5 shadow-sm italic whitespace-nowrap pr-5">
      {icon} {text}
    </span>
  );
};

export const RiskBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase rounded-md whitespace-nowrap ml-2">
    <AlertTriangle size={8} /> 审计风险
  </span>
);

export const NavTab: React.FC<{ active: boolean, onClick: () => void, label: string, icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider italic pr-5 whitespace-nowrap shrink-0 ${active ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'text-zinc-600 hover:text-zinc-300 active:scale-95'}`}>
    {icon} {label}
  </button>
);

// BountyCard component removed as requested

export const AddressBox: React.FC<{ label: string, address: string, onCopy: (msg: string) => void, explorerLink?: string }> = ({ label, address, onCopy, explorerLink }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    onCopy(label + ' 已复制');
  };
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-5 group flex-1 shadow-xl overflow-hidden">
      <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
        <div className={`p-2.5 rounded-xl bg-zinc-900 text-zinc-500 shrink-0 group-hover:text-rose-500 transition-colors shadow-inner`}><Hash size={18} /></div>
        <div className="flex flex-col min-w-0 overflow-hidden">
          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-600 italic pr-4 leading-none">{label}</span>
          <span className="text-xs font-mono font-bold text-zinc-400 truncate mt-1 pr-4">{address}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleCopy} className="p-2.5 bg-zinc-950/80 rounded-xl border border-white/5 text-zinc-500 hover:text-rose-500 transition-all shadow-inner active:scale-90"><Copy size={14} /></button>
        {explorerLink && (
            <a href={explorerLink} target="_blank" rel="noreferrer" className="p-2.5 bg-zinc-950/80 rounded-xl border border-white/5 text-zinc-500 hover:text-emerald-500 transition-all shadow-inner active:scale-90"><ExternalLink size={14} /></a>
        )}
      </div>
    </div>
  );
};

export const Notification: React.FC<{ show: boolean, type: 'error' | 'success' | 'info', title: string, message: string, onClose: () => void }> = ({ show, type, title, message, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);
  if (!show) return null;
  const colors = { error: 'text-rose-500 border-rose-500/30', success: 'text-emerald-500 border-emerald-500/30', info: 'text-sky-500 border-sky-500/30' };
  return (
    <div className="fixed top-24 right-6 sm:top-24 sm:right-12 z-[3000] animate-in slide-in-from-right-20">
      <div className={`glass-card p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border ${colors[type]} flex gap-4 items-center shadow-3xl min-w-[280px] max-w-[400px] backdrop-blur-2xl bg-[#0a0a0c]/90`}>
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
        theme: 'border-amber-500 bg-gradient-to-b from-rose-900/90 to-amber-900/90 shadow-[0_0_100px_rgba(245,158,11,0.4)]' 
    },
    loser: { 
        title: '结算完毕', 
        subtitle: '本轮未中奖', 
        desc: '链上随机数已完成公平选取。只要持仓满足门槛，分红权将永久有效。', 
        icon: <Ghost className="text-zinc-600" size={64} />, 
        theme: 'border-zinc-700 bg-zinc-950/80' 
    },
    guest: { 
        title: '系统速报', 
        subtitle: '结算自动触发', 
        desc: '协议检测到时间间隔已到，Automation 已自动执行派奖逻辑。', 
        icon: <Sparkles className="text-rose-500" size={64} />, 
        theme: 'border-rose-500/40 bg-rose-950/60' 
    }
  }[mode];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {isWinner && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-500 rounded-full animate-ping delay-75"></div>
              <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-red-500 rounded-full animate-ping delay-150"></div>
              <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-rose-500 rounded-full animate-ping delay-300"></div>
              <div className="absolute inset-0 bg-rose-500/10 animate-pulse"></div>
          </div>
      )}
      
      <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-700" onClick={onClose}></div>
      <div className={`relative glass-card w-full max-w-[90vw] sm:max-w-xl rounded-[3rem] p-6 sm:p-14 border-2 ${content.theme} text-center space-y-8 sm:space-y-10 animate-in zoom-in-95 duration-500 overflow-hidden shadow-3xl`}>
        {!isWinner && (
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
                <div className="h-full bg-rose-500 transition-all duration-100 ease-linear" style={{ width: `${(timeLeft / 15) * 100}%` }}></div>
            </div>
        )}

        <div className="space-y-6 pt-4 relative z-10">
          <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl relative overflow-visible ${isWinner ? 'bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/50' : 'bg-zinc-900 border border-white/10 overflow-hidden'}`}>
            {content.icon}
            {isWinner && <div className="absolute inset-0 bg-amber-500/10 rounded-[2.5rem] animate-ping pointer-events-none duration-1000"></div>}
          </div>
          <div className="space-y-2">
            <h2 className={`text-3xl sm:text-5xl font-black italic uppercase pr-4 leading-tight ${isWinner ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500' : 'text-white'}`}>{content.title}</h2>
            <p className={`${isWinner ? 'text-amber-300' : 'text-rose-500'} text-[11px] font-black uppercase tracking-[0.5em] italic pr-4`}>{content.subtitle}</p>
          </div>
          <div className={`p-6 rounded-[2.5rem] border space-y-6 shadow-inner ${isWinner ? 'bg-gradient-to-br from-rose-950/50 to-amber-900/30 border-amber-500/30' : 'bg-black/80 border-white/5'}`}>
            <div className="space-y-1">
              <span className={`text-[9px] font-black uppercase italic pr-4 ${isWinner ? 'text-amber-500' : 'text-zinc-600'}`}>{isWinner ? '您的收益' : '获胜锦鲤地址'}</span>
              <p className={`text-xs font-mono font-bold break-all select-all ${isWinner ? 'text-amber-200' : 'text-zinc-300'}`}>{isWinner ? '直接入账待领池' : winnerAddress}</p>
            </div>
            <div className="text-4xl sm:text-6xl font-black text-white stat-glow tabular-nums tracking-tighter pr-8 leading-none">
              {formatBNBValue(amount)} <span className={`text-base sm:text-xl uppercase italic pr-2 ${isWinner ? 'text-amber-500' : 'accent-gradient'}`}>BNB</span>
            </div>
            {txHash && (
              <a href={`https://testnet.bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase italic tracking-widest transition-all ${isWinner ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20' : 'bg-zinc-900/50 border border-white/5 text-zinc-500 hover:text-rose-400'}`}><Eye size={12} /> 查看链上凭证</a>
            )}
          </div>
          <p className={`${isWinner ? 'text-amber-500/60' : 'text-zinc-500'} text-[10px] leading-relaxed font-bold uppercase italic pr-4`}>{content.desc}</p>
          <button onClick={onClose} className={`w-full py-5 rounded-[2rem] font-black uppercase italic active:scale-95 transition-all shadow-xl ${isWinner ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-rose-500/30 hover:shadow-rose-500/50' : 'action-button'}`}>确定</button>
        </div>
      </div>
    </div>
  );
};

export const DigitBox: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
  <div className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-zinc-900/50 border border-white/5 rounded-2xl min-w-[70px] sm:min-w-[80px] shadow-inner">
    <span className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tighter">{value}</span>
    <span className="text-[8px] font-black text-zinc-600 uppercase italic pr-2">{label}</span>
  </div>
);

export const HeroStat: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-zinc-500">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-wider italic pr-2">{label}</span>
    </div>
    <div className="text-lg sm:text-xl font-black text-white italic tabular-nums pr-4">{value}</div>
  </div>
);

export const Pagination: React.FC<{ current: number, total: number, onChange: (page: number) => void }> = ({ current, total, onChange }) => (
  <div className="flex items-center justify-between px-8 py-4 bg-white/5 border-t border-white/5">
    <span className="text-[9px] font-black text-zinc-600 uppercase italic">第 {current + 1} / {Math.max(1, total)} 页</span>
    <div className="flex items-center gap-2">
      <button 
        disabled={current === 0} 
        onClick={() => onChange(current - 1)}
        className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-all"
      >
        <ChevronLeft size={14} />
      </button>
      <button 
        disabled={current >= total - 1} 
        onClick={() => onChange(current + 1)}
        className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-all"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  </div>
);

export const WalletButton: React.FC<{ name: string, icon: React.ReactNode, installed: boolean, onClick: () => void, disabled?: boolean }> = ({ name, icon, installed, onClick, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-between p-4 bg-zinc-950/50 border border-white/5 rounded-2xl transition-all group shadow-inner relative overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800 active:scale-[0.98]'}`}
  >
    <div className="flex items-center gap-4 relative z-10">
      <div className={`w-10 h-10 rounded-xl bg-zinc-900 p-1.5 flex items-center justify-center border border-white/5 transition-transform shadow-lg ${!disabled && 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <div className="text-left">
        <span className="block text-xs font-black text-zinc-300 uppercase italic leading-none">{name}</span>
        {installed ? (
          <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase italic mt-1.5"><CheckCircle2 size={8} /> 已检测到</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[8px] font-black text-zinc-600 uppercase italic mt-1.5">未安装</span>
        )}
      </div>
    </div>
    {disabled ? <Loader2 size={16} className="text-zinc-600 animate-spin relative z-10"/> : <ChevronRightIcon size={16} className="text-zinc-700 group-hover:text-rose-500 group-hover:translate-x-1 transition-all relative z-10" />}
    {installed && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full"></div>
    )}
  </button>
);

export const CardIconBox: React.FC<{ icon: React.ReactNode, title: string, desc: string, color: 'emerald' | 'rose' | 'violet' }> = ({ icon, title, desc, color }) => {
  const themes = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/10',
    violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20 shadow-violet-500/10'
  };
  return (
    <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl hover:translate-y-[-4px] transition-all duration-300">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${themes[color]} border shadow-lg`}>
        {icon}
      </div>
      <div className="space-y-2">
        <h4 className="font-black text-sm text-white uppercase italic pr-4">{title}</h4>
        <p className="text-[10px] text-zinc-500 font-bold leading-relaxed uppercase italic pr-4">{desc}</p>
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
  <div className="glass-card rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-8">
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
          className={`w-full py-4 px-6 bg-zinc-950/80 border border-white/5 rounded-2xl text-[10px] font-black text-zinc-400 transition-all uppercase italic text-left flex items-center justify-between group ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:border-rose-500/30'}`}
        >
          {a.label}
          {loading ? <Loader2 size={12} className="animate-spin text-zinc-600"/> : <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
        </button>
      ))}
    </div>
  </div>
);
