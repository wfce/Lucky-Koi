
import React from 'react';
import { Activity, ShieldAlert, Wallet, Search, Sparkles, ArrowRightCircle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserInfo, ContractConfig } from '../types';
import { formatTokens } from '../utils';
import { formatBNBValue } from './Shared';
import { useLanguage } from '../contexts/LanguageContext';

interface TerminalProps {
  account: string | null;
  loading: boolean;
  userInfo: UserInfo | null;
  config: ContractConfig | null;
  tokenSymbol: string;
  tokenDecimals: number;
  hasSufficientBalance: boolean;
  onConnect: () => void;
  onExecute: (method: string, args?: any[]) => void;
}

export const PersonalTerminal: React.FC<TerminalProps> = ({ account, loading, userInfo, config, tokenSymbol, tokenDecimals, hasSufficientBalance, onConnect, onExecute }) => {
  const { t } = useLanguage();

  return (
    <div className="glass-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 border-t-8 border-red-500 shadow-3xl overflow-hidden group space-y-8">
      <h3 className="text-xl font-black text-white flex items-center justify-between uppercase italic pr-4">{t('terminal.title')} <Activity size={16} className="text-red-500 animate-pulse" /></h3>
      
      {!account ? (
        <div className="space-y-6 py-6 animate-in slide-in-from-bottom-5 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent rounded-[2rem] pointer-events-none" />
          <div className="relative z-10 mx-auto w-max px-4 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full flex items-center gap-2 animate-pulse"><ShieldAlert size={12} className="text-red-500" /><span className="text-[9px] font-black text-red-500 uppercase italic tracking-wider">{t('terminal.notActive')}</span></div>
          <div className="relative w-24 h-24 mx-auto group cursor-pointer" onClick={() => !loading && onConnect()}>
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
              <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse delay-75" />
              <div className={`relative z-10 w-full h-full bg-[#0c0c0e] rounded-full flex items-center justify-center border-2 border-dashed border-red-500/30 shadow-2xl transition-transform duration-500 group-hover:border-red-500 ${!loading && 'group-hover:scale-110'}`}><Wallet className="text-red-500" size={36} /></div>
              <div className="absolute -bottom-1 -right-1 z-50 bg-red-500 text-white text-[8px] font-black px-3 py-1.5 rounded-xl border-2 border-[#0c0c0e] shadow-xl animate-bounce">{t('terminal.required')}</div>
          </div>
          <div className="text-center space-y-3 relative z-10 px-2"><h4 className="text-white font-black uppercase italic tracking-widest text-sm">{t('terminal.connectTitle')}</h4><p className="text-[10px] text-zinc-400 font-bold leading-relaxed">{t('terminal.connectDesc')}</p></div>
          <div className="grid grid-cols-2 gap-3 px-2">
              <div className="bg-zinc-950/80 border border-white/5 p-3 rounded-xl flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500"><Search size={14}/></div><div className="text-left"><div className="text-[9px] text-white font-black uppercase italic">{t('terminal.check1')}</div><div className="text-[8px] text-zinc-600 font-black">{t('terminal.check1Desc')}</div></div></div>
              <div className="bg-zinc-950/80 border border-white/5 p-3 rounded-xl flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500"><Sparkles size={14}/></div><div className="text-left"><div className="text-[9px] text-white font-black uppercase italic">{t('terminal.check2')}</div><div className="text-[8px] text-zinc-600 font-black">{t('terminal.check2Desc')}</div></div></div>
          </div>
          <button onClick={onConnect} disabled={loading} className={`w-full action-button py-5 rounded-2xl text-[11px] font-black uppercase italic flex items-center justify-center gap-2 shadow-red-500/20 shadow-xl relative overflow-hidden group transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-red-500/40 active:scale-95'}`}><span className="relative z-10 flex items-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <>{t('terminal.btnConnect')} <ArrowRightCircle size={14} /></>}</span></button>
        </div>
      ) : !userInfo?.registered ? (
        <div className="space-y-8 py-4 animate-in fade-in">
          <div className={`p-6 rounded-[2.5rem] border transition-all shadow-inner space-y-5 relative overflow-hidden ${hasSufficientBalance ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/10'}`}>
             <div className="flex items-center justify-between"><span className="text-[9px] font-black text-zinc-600 uppercase italic">{t('terminal.detectTitle')}</span>{hasSufficientBalance ? (<span className="flex items-center gap-1.5 text-[8px] font-black text-emerald-500 uppercase italic"><CheckCircle2 size={10}/> {t('terminal.ready')}</span>) : (<span className="flex items-center gap-1.5 text-[8px] font-black text-red-500 uppercase italic"><AlertCircle size={10}/> {t('terminal.insufficient')}</span>)}</div>
             <div className="space-y-1"><p className="text-[9px] text-zinc-600 font-black uppercase italic">{t('terminal.holding')} ({tokenSymbol})</p><div className="flex items-baseline gap-2"><h4 className="text-4xl font-black text-white tabular-nums tracking-tighter">{formatTokens(userInfo?.walletBalance, tokenDecimals)}</h4><span className="text-xs font-black text-zinc-700 uppercase italic">/ {config ? formatTokens(config.minHolding, tokenDecimals) : '--'}</span></div></div>
          </div>
          <div className="space-y-4">
              <button onClick={() => onExecute('register')} disabled={!hasSufficientBalance || loading} className={`w-full py-5 rounded-2xl text-xs font-black uppercase italic transition-all shadow-lg flex items-center justify-center gap-3 ${hasSufficientBalance && !loading ? 'action-button active:scale-95' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'}`}>{loading ? <Loader2 size={14} className="animate-spin" /> : (<>{hasSufficientBalance ? t('terminal.btnRegister') : t('terminal.btnRegisterDisable')}{hasSufficientBalance && <Sparkles size={14} className="animate-pulse" />}</>)}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in">
          <div className="p-5 bg-zinc-950 rounded-[1.8rem] border border-white/5 space-y-3 shadow-inner relative overflow-hidden">
             <div className="flex items-center justify-between"><span className="text-[9px] font-black text-zinc-600 uppercase italic">{t('terminal.realtime')}</span><div className={`w-2 h-2 rounded-full ${userInfo.currentlyValid ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} /></div>
             <div className="flex items-baseline gap-2"><h4 className="text-2xl font-black text-white tabular-nums tracking-tighter">{formatTokens(userInfo.walletBalance, tokenDecimals)}</h4><span className="text-[10px] font-black text-zinc-500 uppercase italic">{tokenSymbol}</span></div>
          </div>
          <div className="p-6 bg-zinc-950 rounded-[2rem] border border-white/5 space-y-5 shadow-inner">
            <div className="flex justify-between items-end"><div className="space-y-1"><p className="text-zinc-600 text-[9px] font-black uppercase italic">{t('terminal.weightTitle')}</p><h4 className="text-4xl font-black text-white stat-glow tabular-nums pr-8 leading-none">{userInfo.rewardPercentage}%</h4></div><div className={`mb-1 px-3 py-1 rounded-full text-[8px] font-black uppercase italic border ${userInfo.currentlyValid ? 'text-emerald-500 border-emerald-500/20' : 'text-red-500 border-red-500/20'}`}>{userInfo.currentlyValid ? t('terminal.weightActive') : t('terminal.weightInvalid')}</div></div>
            <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden shadow-inner"><div className="bg-gradient-to-r from-red-500 to-amber-600 h-full transition-all duration-1000" style={{width: `${userInfo.rewardPercentage}%`}}></div></div>
            {!userInfo.currentlyValid && (<div className="text-[8px] text-red-500 font-black uppercase italic text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{t('terminal.warning')}</div>)}
          </div>
          {parseFloat(userInfo.pending) > 0 ? (
             <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] space-y-5 shadow-inner">
                <div className="space-y-1"><p className="text-emerald-500 text-[9px] font-black uppercase italic">{t('terminal.pendingTitle')}</p><h4 className="text-3xl font-black text-white tabular-nums pr-8 leading-none">{formatBNBValue(userInfo.pending)} <span className="text-xs opacity-50 italic">BNB</span></h4></div>
                <button onClick={() => onExecute('claimPendingReward')} disabled={loading} className={`w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600 active:scale-95'}`}>{loading ? <Loader2 size={12} className="animate-spin" /> : t('terminal.btnClaim')}</button>
             </div>
          ) : (
            <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[9px] text-zinc-600 font-black uppercase italic">{t('terminal.waiting')}</p></div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
             <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[8px] text-zinc-600 font-black uppercase mb-1 italic">{t('terminal.winCount')}</p><p className="text-xs font-black text-white">{userInfo.winCount} 次</p></div>
             <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[8px] text-zinc-600 font-black uppercase mb-1 italic">{t('terminal.gasCollected')}</p><p className="text-xs font-black text-amber-500">{formatBNBValue(userInfo.gasRewardsCollected)}</p></div>
             <div className="col-span-2 bg-zinc-950 p-3 rounded-2xl border border-white/5 text-center shadow-inner flex items-center justify-between px-6"><p className="text-[8px] text-zinc-600 font-black uppercase italic">{t('terminal.donations')}</p><p className="text-xs font-black text-blue-400">{formatBNBValue(userInfo.donations)}</p></div>
          </div>
          <button onClick={() => onExecute('unregister')} disabled={loading} className={`w-full text-zinc-800 text-[9px] font-black uppercase tracking-[0.3em] transition-all text-center italic mt-2 flex items-center justify-center gap-2 ${loading ? 'cursor-not-allowed opacity-50' : 'hover:text-red-500 active:scale-95'}`}>{loading && <Loader2 size={10} className="animate-spin" />} {t('terminal.btnUnregister')}</button>
        </div>
      )}
    </div>
  );
};
