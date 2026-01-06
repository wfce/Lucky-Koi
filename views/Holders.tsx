
import React from 'react';
import { Shield, ExternalLink, CheckCircle2, Gavel, Trash2, XCircle, Activity, Scale, Loader2 } from 'lucide-react';
import { ContractConfig, ContractStats, HolderData } from '../types';
import { Pagination } from '../components/Shared';
import { formatTokens } from '../utils';
import { PAGE_SIZE } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface HoldersProps {
  stats: ContractStats | null;
  config: ContractConfig | null;
  tokenSymbol: string;
  tokenDecimals: number;
  holdersData: HolderData[];
  holdersPage: number;
  setHoldersPage: (page: number) => void;
  onExecute: (method: string, args: any[]) => void;
}

export const Holders: React.FC<HoldersProps> = ({ stats, config, tokenSymbol, tokenDecimals, holdersData, holdersPage, setHoldersPage, onExecute }) => {
  const { t } = useLanguage();
  const inProgress = stats?.inProgress || false;
  
  // 关键修复：如果不从 config 获取到值，设置为 null，而不是 '0'
  const minHolding = config ? BigInt(config.minHolding) : null;

  const renderAction = (h: HolderData) => {
    if (!config || minHolding === null) return <Loader2 size={10} className="animate-spin text-zinc-600" />;

    if (inProgress) {
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-white/5 text-zinc-600 cursor-not-allowed select-none italic">
            <Activity size={10} className="animate-spin" />
            <span className="text-[8px] font-black uppercase">甄选锁定</span>
          </div>
        );
    }

    // 只有余额确实低于要求的，才显示 Report 按钮
    if (BigInt(h.balance) < minHolding) {
      return (
        <button 
          onClick={() => onExecute('reportInvalid', [h.address])} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 active:scale-95 group/btn"
          title="立即移除不达标持有人"
        >
          <Gavel size={12} className="group-hover/btn:-rotate-12 transition-transform"/>
          <span className="text-[9px] font-black uppercase italic tracking-wider">{t('holders.report')}</span>
        </button>
      );
    }

    return <span className="text-zinc-700 text-[10px] font-black uppercase italic opacity-20">-</span>;
  };

  const renderStatus = (balance: bigint) => {
      if (minHolding === null) return <span className="text-zinc-600 text-[10px] font-black">---</span>;
      
      const isValid = balance >= minHolding;
      if (isValid) {
          return (
             <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black border border-emerald-500/20 uppercase italic">
                <CheckCircle2 size={10} /> {t('holders.valid')}
             </div>
          );
      } else {
          return (
             <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-500 rounded-full text-[9px] font-black border border-red-500/20 uppercase italic animate-pulse">
                <XCircle size={10} /> {t('holders.invalid')}
             </div>
          );
      }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ml-2">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 uppercase italic pr-2">
            <Shield size={24} className="text-amber-500" /> {t('holders.title', { count: stats?.holderCount })}
        </h2>
        <div className="flex items-center gap-3">
            {/* 显示最低持仓要求，与合约保持一致 */}
            <div className="px-4 py-2 bg-zinc-900/80 border border-white/10 rounded-xl flex items-center gap-2 shadow-inner">
                <Scale size={14} className="text-zinc-500" />
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-zinc-600 uppercase italic leading-none">最低持仓门槛</span>
                    <span className="text-[10px] font-black text-zinc-300 font-mono leading-tight">
                        {config ? formatTokens(config.minHolding, tokenDecimals) : <Loader2 size={10} className="animate-spin inline" />} <span className="text-zinc-500">{tokenSymbol}</span>
                    </span>
                </div>
            </div>
            {inProgress && <span className="text-[9px] font-black text-red-500 uppercase italic animate-pulse bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">合约锁定中</span>}
        </div>
      </div>

      <div className="glass-card rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl p-4 sm:p-0">
        <div className="hidden sm:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                <th className="px-6 sm:px-8 py-5 italic text-center w-16">{t('holders.rank')}</th>
                <th className="px-6 sm:px-8 py-5 italic">{t('holders.wallet')}</th>
                <th className="px-6 sm:px-8 py-5 text-right italic">{t('holders.balance', { symbol: tokenSymbol })}</th>
                <th className="px-6 sm:px-8 py-5 text-center italic">{t('holders.status')}</th>
                <th className="px-6 sm:px-8 py-5 text-right italic">{t('holders.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[10px]">
              {holdersData.length > 0 ? holdersData.map((h, i) => {
                const balance = BigInt(h.balance);
                const isValid = minHolding !== null && balance >= minHolding;
                
                return (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 sm:px-8 py-4 text-zinc-600 font-bold text-center group-hover:text-zinc-400">{(holdersPage * PAGE_SIZE + i + 1).toString().padStart(2, '0')}</td>
                  <td className="px-6 sm:px-8 py-4 text-zinc-300 font-bold flex items-center gap-2">
                     <span className="bg-zinc-900/50 px-2 py-1 rounded-md border border-white/5">{h.address.slice(0, 6)}...{h.address.slice(-4)}</span>
                     <a href={`https://bscscan.com/address/${h.address}`} target="_blank" rel="noreferrer" className="p-1 text-zinc-600 hover:text-amber-500 transition-colors bg-zinc-900 rounded border border-white/5 hover:border-amber-500/30"><ExternalLink size={10}/></a>
                  </td>
                  <td className={`px-6 sm:px-8 py-4 text-right font-black ${minHolding !== null ? (isValid ? 'text-zinc-300' : 'text-red-500') : 'text-zinc-500'}`}>
                    {formatTokens(h.balance, tokenDecimals)}
                  </td>
                  <td className="px-6 sm:px-8 py-4 text-center">
                      {renderStatus(balance)}
                  </td>
                  <td className="px-6 sm:px-8 py-4 text-right">
                     {renderAction(h)}
                  </td>
                </tr>
              )}) : <tr><td colSpan={5} className="text-center py-20 text-zinc-700 italic font-black uppercase">{t('holders.loading')}</td></tr>}
            </tbody>
          </table>
        </div>

         <div className="sm:hidden space-y-4">
          {holdersData.length > 0 ? holdersData.map((h, i) => {
            const balance = BigInt(h.balance);
            const isValid = minHolding !== null && balance >= minHolding;

            return (
            <div key={i} className="bg-zinc-950/50 border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                    <span className="text-[9px] font-black text-zinc-600 italic px-2 py-1 bg-zinc-900 rounded-lg border border-white/5">#{(holdersPage * PAGE_SIZE + i + 1).toString().padStart(2, '0')}</span>
                    <a href={`https://bscscan.com/address/${h.address}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white p-1"><ExternalLink size={14}/></a>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-300 font-mono font-bold bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-white/5 inline-block">{h.address.slice(0, 10)}...{h.address.slice(-8)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                     <div>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic mb-1">{t('holders.balance', { symbol: '' })}</p>
                        <p className={`text-sm font-black ${minHolding !== null ? (isValid ? 'text-emerald-400' : 'text-red-500') : 'text-zinc-500'}`}>{formatTokens(h.balance, tokenDecimals)}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic mb-1">{t('holders.status')}</p>
                        <div className="flex justify-end">{renderStatus(balance)}</div>
                     </div>
                </div>
                
                <div className="pt-2">
                   {renderAction(h)}
                </div>
            </div>
          )}) : (
            <div className="text-center py-10 text-zinc-700 italic font-black uppercase text-xs">{t('holders.empty')}</div>
          )}
        </div>

        <Pagination current={holdersPage} total={Math.ceil((stats?.holderCount || 0) / PAGE_SIZE)} onChange={setHoldersPage} />
      </div>
    </div>
  );
};
