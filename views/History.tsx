
import React from 'react';
import { History as HistoryIcon, ExternalLink } from 'lucide-react';
import { LotteryRecord } from '../types';
import { formatBNBValue, Pagination } from '../components/Shared';
import { PAGE_SIZE } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface HistoryProps {
  history: LotteryRecord[];
  historyPage: number;
  setHistoryPage: (page: number) => void;
}

export const History: React.FC<HistoryProps> = ({ history, historyPage, setHistoryPage }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 ml-2 uppercase italic pr-2"><HistoryIcon className="text-red-500" /> {t('history.title')}</h2>
      <div className="glass-card rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl p-4 sm:p-0">
        <div className="hidden sm:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                <th className="px-6 sm:px-8 py-5 italic">{t('history.wallet')}</th><th className="px-6 sm:px-8 py-5 text-right italic">{t('history.reward')}</th><th className="px-6 sm:px-8 py-5 text-right italic">{t('history.weight')}</th><th className="px-6 sm:px-8 py-5 text-right italic">{t('history.proof')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[10px]">
              {history.length > 0 ? history.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE).map((rec, i) => (
                <tr key={i} className="hover:bg-red-500/5 transition-colors group">
                  <td className="px-6 sm:px-8 py-4 text-zinc-300 font-bold">{rec.winner}</td>
                  <td className="px-6 sm:px-8 py-4 text-right font-black text-emerald-400">{formatBNBValue(rec.reward)} BNB</td>
                  <td className="px-6 sm:px-8 py-4 text-right text-red-500 font-black pr-12">{rec.percentage}%</td>
                  <td className="px-6 sm:px-8 py-4 text-right"><a href={`https://bscscan.com/tx/${rec.txHash}`} target="_blank" rel="noreferrer" className="inline-flex p-1.5 bg-zinc-950 border border-white/5 rounded-lg text-zinc-500 hover:text-white transition-all shadow-inner"><ExternalLink size={12}/></a></td>
                </tr>
              )) : <tr><td colSpan={4} className="text-center py-20 text-zinc-700 italic font-black uppercase">{t('history.loading')}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden space-y-4">
          {history.length > 0 ? history.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE).map((rec, i) => (
            <div key={i} className="bg-zinc-950/50 border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">{t('history.wallet')}</p>
                        <p className="text-xs text-white font-mono font-bold break-all">{rec.winner}</p>
                    </div>
                    <a href={`https://bscscan.com/tx/${rec.txHash}`} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900 border border-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"><ExternalLink size={14}/></a>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                     <div>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">{t('history.reward')}</p>
                        <p className="text-sm text-emerald-400 font-black">{formatBNBValue(rec.reward)} <span className="text-[9px]">BNB</span></p>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">{t('history.weight')}</p>
                        <p className="text-sm text-red-500 font-black">{rec.percentage}%</p>
                     </div>
                </div>
            </div>
          )) : (
            <div className="text-center py-10 text-zinc-700 italic font-black uppercase text-xs">{t('history.empty')}</div>
          )}
        </div>

        <Pagination current={historyPage} total={Math.ceil(history.length / PAGE_SIZE)} onChange={setHistoryPage} />
      </div>
    </div>
  );
};
