
import React, { useEffect, useState } from 'react';
import { RotateCcw, Search, Flame, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { LinkStats, GasRewardStats } from '../types';
import { formatBNBValue, GovernanceSection } from '../components/Shared';
import { useLanguage } from '../contexts/LanguageContext';

interface CommunityProps {
  loading: boolean;
  linkStats: LinkStats | null;
  gasRewardStats: GasRewardStats | null;
  cleanupProgress: { remaining: number, percent: number } | null;
  readOnlyContract: ethers.Contract;
  onExecute: (method: string, args: any[]) => void;
  showNotification: (type: 'error' | 'success' | 'info', title: string, message: string) => void;
}

export const Community: React.FC<CommunityProps> = ({ loading, linkStats, gasRewardStats, cleanupProgress, readOnlyContract, onExecute, showNotification }) => {
  const { t } = useLanguage();
  const [recycleAddr, setRecycleAddr] = useState("");
  const [pendingDetails, setPendingDetails] = useState<{amount: string, since: number, canRecycle: boolean, recycleTime: number} | null>(null);

  useEffect(() => {
      if(ethers.isAddress(recycleAddr)) {
          readOnlyContract.getPendingDetails(recycleAddr).then((res: any) => {
              setPendingDetails({ amount: ethers.formatEther(res.amount), since: Number(res.since), canRecycle: res.canRecycle, recycleTime: Number(res.recycleTime) });
          }).catch(() => setPendingDetails(null));
      } else { setPendingDetails(null); }
  }, [recycleAddr, readOnlyContract]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 animate-in fade-in pb-16">
       <GovernanceSection loading={loading} title={t('community.oracleTitle')}
          stats={[
            { label: "ERC-677 LINK (VRF)", value: `${formatBNBValue(linkStats?.erc677Balance || '0')} LINK` },
            { label: "BEP-20 LINK", value: `${formatBNBValue(linkStats?.bep20Balance || '0')} LINK` },
            { label: "VRF Sub Balance", value: `${formatBNBValue(linkStats?.subscriptionBalance || '0')} LINK` }, 
            { label: "Donated LINK", value: `${formatBNBValue(linkStats?.received || '0')} LINK` }
          ]} 
          onAction={onExecute} 
          actions={[
            { label: t('community.actions.maintain'), method: "maintainLink" }, 
            { label: t('community.actions.unwrap'), method: "unwrapAllWBNB" },
            { label: t('community.actions.convert'), method: "convertLink" }
          ]} 
       />
       <GovernanceSection loading={loading} title={t('community.hunterTitle')}
          stats={[
            { label: "Total Paid Gas Bounty", value: `${formatBNBValue(gasRewardStats?.totalPaid || '0')} BNB` }, 
            { label: "Current Base Bounty", value: `${formatBNBValue(gasRewardStats?.baseReward || '0')} BNB` }
          ]} 
          actions={[
            { label: t('community.actions.trigger'), method: "triggerKoiStrict" }, 
            { label: `${t('community.actions.cleanup')} ${cleanupProgress && cleanupProgress.percent > 0 && cleanupProgress.percent < 100 ? `(${cleanupProgress.percent}%)` : ''}`, method: "cleanup", args: [50] }, 
            { label: t('community.actions.reset'), method: "cancelStuckKoi" }
          ]} 
          onAction={onExecute} 
       />
       
       <div className="md:col-span-2 glass-card rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
         <h3 className="text-lg font-black text-white uppercase italic pr-4 flex items-center gap-2"><RotateCcw size={18} className="text-red-500"/> {t('community.recycleTitle')}</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-red-500 transition-colors"><Search size={14}/></div>
                    <input type="text" value={recycleAddr} onChange={(e) => setRecycleAddr(e.target.value)} placeholder={t('community.searchPlaceholder')} disabled={loading} className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-mono text-zinc-300 focus:outline-none focus:border-red-500/50 transition-all shadow-inner disabled:opacity-50"/>
                </div>
                {pendingDetails ? (
                     <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl space-y-2">
                         <div className="flex justify-between text-[9px] uppercase font-black text-zinc-500 italic"><span>{t('community.pendingAmount')}</span><span className="text-emerald-400">{pendingDetails.amount} BNB</span></div>
                         <div className="flex justify-between text-[9px] uppercase font-black text-zinc-500 italic"><span>{t('community.timeGenerated')}</span><span>{new Date(pendingDetails.since * 1000).toLocaleString()}</span></div>
                         <div className="flex justify-between text-[9px] uppercase font-black text-zinc-500 italic"><span>{t('community.timeUnlock')}</span><span>{new Date(pendingDetails.recycleTime * 1000).toLocaleString()}</span></div>
                         <div className={`mt-2 text-center p-2 rounded-lg text-[9px] font-black uppercase italic border ${pendingDetails.canRecycle ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>{pendingDetails.canRecycle ? t('community.unlocked') : t('community.locked')}</div>
                     </div>
                ) : (<div className="p-4 text-center text-[9px] text-zinc-600 font-black uppercase italic">{t('community.checkStatus')}</div>)}
            </div>
            <div className="flex flex-col gap-4 h-full">
                 <div className="flex-1 p-4 bg-red-900/10 border border-red-500/10 rounded-2xl">
                     <p className="text-[10px] text-zinc-400 leading-relaxed font-bold"><Flame size={12} className="inline text-red-500 mr-1"/>{t('community.recycleDesc')}</p>
                 </div>
                 <button disabled={loading || !pendingDetails?.canRecycle} onClick={() => { if (!ethers.isAddress(recycleAddr)) return showNotification('error', t('errors.invalidAddress'), t('errors.invalidAddressDesc')); onExecute('recycleStuckPending', [recycleAddr]); }} className={`w-full py-4 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black text-zinc-400 uppercase italic shadow-lg flex items-center justify-center gap-2 ${loading || !pendingDetails?.canRecycle ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:bg-red-500 transition-all active:scale-95'}`}>{loading && <Loader2 size={12} className="animate-spin"/>} {t('community.confirmRecycle')}</button>
            </div>
         </div>
       </div>
    </div>
  );
};
