
import React from 'react';
import { Shield, ExternalLink, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 ml-2 uppercase italic pr-2"><Shield size={24} className="text-amber-500" /> {t('holders.title', { count: stats?.holderCount })}</h2>
      <div className="glass-card rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl p-4 sm:p-0">
        <div className="hidden sm:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                <th className="px-6 sm:px-8 py-5 italic">{t('holders.rank')}</th>
                <th className="px-6 sm:px-8 py-5 italic">{t('holders.wallet')}</th>
                <th className="px-6 sm:px-8 py-5 text-right italic">{t('holders.balance', { symbol: tokenSymbol })}</th>
                <th className="px-6 sm:px-8 py-5 text-center italic">{t('holders.status')}</th>
                <th className="px-6 sm:px-8 py-5 text-right italic">{t('holders.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[10px]">
              {holdersData.length > 0 ? holdersData.map((h, i) => (
                <tr key={i} className="hover:bg-amber-500/5 transition-colors group">
                  <td className="px-6 sm:px-8 py-4 text-zinc-500 font-bold">{holdersPage * PAGE_SIZE + i + 1}</td>
                  <td className="px-6 sm:px-8 py-4 text-zinc-300 font-bold flex items-center gap-2">
                     {h.address}
                     <a href={`https://bscscan.com/address/${h.address}`} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-white"><ExternalLink size={10}/></a>
                  </td>
                  <td className={`px-6 sm:px-8 py-4 text-right font-black ${h.isValid ? 'text-emerald-400' : 'text-red-500'}`}>{formatTokens(h.balance, tokenDecimals)}</td>
                  <td className="px-6 sm:px-8 py-4 text-center">
                      {h.isValid ? <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] border border-emerald-500/20">{t('holders.valid')}</span> : <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-[9px] border border-red-500/20 flex items-center justify-center gap-1"><AlertTriangle size={8}/> {t('holders.invalid')}</span>}
                  </td>
                  <td className="px-6 sm:px-8 py-4 text-right">
                     {!h.isValid ? (
                        h.graceEnd > 0 ? 
                        <span className="text-zinc-500 text-[9px] italic">{t('holders.grace')}</span> :
                        <button onClick={() => onExecute('reportInvalid', [h.address])} className="text-red-500 hover:text-white transition-colors underline decoration-red-500/50 underline-offset-2">{t('holders.report')}</button>
                     ) : (
                        BigInt(h.balance) < BigInt(config?.minHolding || '0') && 
                        <button onClick={() => onExecute('reportInvalid', [h.address])} className="text-amber-500 hover:text-white transition-colors underline decoration-amber-500/50 underline-offset-2">{t('holders.reportStart')}</button>
                     )}
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="text-center py-20 text-zinc-700 italic font-black uppercase">{t('holders.loading')}</td></tr>}
            </tbody>
          </table>
        </div>

         <div className="sm:hidden space-y-4">
          {holdersData.length > 0 ? holdersData.map((h, i) => (
            <div key={i} className="bg-zinc-950/50 border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black text-zinc-600 italic">#{holdersPage * PAGE_SIZE + i + 1}</span>
                    <a href={`https://bscscan.com/address/${h.address}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white"><ExternalLink size={12}/></a>
                </div>
                <p className="text-xs text-white font-mono font-bold break-all">{h.address}</p>
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                     <div>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">{t('holders.balance', { symbol: '' })}</p>
                        <p className={`text-sm font-black ${h.isValid ? 'text-emerald-400' : 'text-red-500'}`}>{formatTokens(h.balance, tokenDecimals)}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">{t('holders.status')}</p>
                        {h.isValid ? <span className="text-emerald-500 text-[10px] font-black uppercase">{t('holders.valid')}</span> : <span className="text-red-500 text-[10px] font-black uppercase">{t('holders.invalid')}</span>}
                     </div>
                </div>
                {(!h.isValid || BigInt(h.balance) < BigInt(config?.minHolding || '0')) && (
                     <button onClick={() => onExecute('reportInvalid', [h.address])} className="w-full py-2 mt-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase italic hover:bg-red-500 hover:text-white transition-all">{t('holders.reportStart')}</button>
                )}
            </div>
          )) : (
            <div className="text-center py-10 text-zinc-700 italic font-black uppercase text-xs">{t('holders.empty')}</div>
          )}
        </div>

        <Pagination current={holdersPage} total={Math.ceil((stats?.holderCount || 0) / PAGE_SIZE)} onChange={setHoldersPage} />
      </div>
    </div>
  );
};
