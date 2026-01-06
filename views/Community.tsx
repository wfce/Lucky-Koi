import React, { useEffect, useState } from 'react';
import { RotateCcw, Search, Flame, Loader2, Heart, Info, Fuel, Coins } from 'lucide-react';
import { ethers } from 'ethers';
import { LinkStats, GasRewardStats, ContractConfig } from '../types';
import { formatBNBValue, GovernanceSection } from '../components/Shared';
import { useLanguage } from '../contexts/LanguageContext';
import { CONTRACT_ADDRESS } from '../constants';
import { ERC20_ABI } from '../abi';

interface CommunityProps {
  loading: boolean;
  account: string | null;
  linkStats: LinkStats | null;
  gasRewardStats: GasRewardStats | null;
  config: ContractConfig | null;
  cleanupProgress: { remaining: number, percent: number } | null;
  readOnlyContract: ethers.Contract;
  onExecute: (method: string, args: any[]) => void;
  showNotification: (type: 'error' | 'success' | 'info', title: string, message: string) => void;
}

export const Community: React.FC<CommunityProps> = ({ loading, account, linkStats, gasRewardStats, config, cleanupProgress, readOnlyContract, onExecute, showNotification }) => {
  const { t } = useLanguage();
  const [recycleAddr, setRecycleAddr] = useState("");
  const [pendingDetails, setPendingDetails] = useState<{amount: string, since: number, canRecycle: boolean, recycleTime: number} | null>(null);
  
  // Donation states
  const [donateAmount, setDonateAmount] = useState("");
  const [isDonating, setIsDonating] = useState(false);

  useEffect(() => {
      if(ethers.isAddress(recycleAddr)) {
          readOnlyContract.getPendingDetails(recycleAddr).then((res: any) => {
              setPendingDetails({ amount: ethers.formatEther(res.amount), since: Number(res.since), canRecycle: res.canRecycle, recycleTime: Number(res.recycleTime) });
          }).catch(() => setPendingDetails(null));
      } else { setPendingDetails(null); }
  }, [recycleAddr, readOnlyContract]);

  const handleDonate = async () => {
    if (!account) return showNotification('info', t('nav.connect'), t('terminal.connectDesc'));
    if (!donateAmount || isNaN(parseFloat(donateAmount)) || parseFloat(donateAmount) <= 0) return;
    if (!config?.linkBep20Address) return;

    setIsDonating(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const linkContract = new ethers.Contract(config.linkBep20Address, ERC20_ABI, signer);
      
      const amountWei = ethers.parseUnits(donateAmount, 18);
      showNotification('info', t('tx.processing'), t('tx.processingDesc'));
      
      const tx = await linkContract.transfer(CONTRACT_ADDRESS, amountWei);
      await tx.wait();
      
      showNotification('success', t('tx.success'), t('tx.successDesc'));
      setDonateAmount("");
    } catch (err: any) {
      console.error(err);
      showNotification('error', t('errors.unknown'), t('errors.unknownDesc'));
    } finally {
      setIsDonating(false);
    }
  };

  const totalLink = parseFloat(linkStats?.totalLinkBalance || '0');
  const fuelHealth = Math.min(100, (totalLink / 20) * 100);
  const isLowFuel = totalLink < 20;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 animate-in fade-in pb-16">
       {/* Top Row: Core Governance */}
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
       
       {/* Donation Section */}
       <div className="md:col-span-2 glass-card rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/10 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Heart size={160} className="text-red-500" /></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
                <Heart size={20} className="text-red-500 fill-red-500 animate-pulse"/> {t('community.donationTitle')}
              </h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('community.donationNote')}</p>
            </div>
            
            <div className="flex items-center gap-4 bg-zinc-950/50 p-4 rounded-2xl border border-white/5 shadow-inner min-w-[200px]">
               <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><Fuel size={20} /></div>
               <div className="flex-1 space-y-1">
                 <div className="flex justify-between text-[9px] font-black uppercase italic">
                   <span className="text-zinc-600">协议燃料库存</span>
                   <span className={isLowFuel ? 'text-red-500' : 'text-emerald-500'}>{totalLink.toFixed(2)} / 20 LINK</span>
                 </div>
                 <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                   <div className={`h-full transition-all duration-1000 ${isLowFuel ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`} style={{ width: `${fuelHealth}%` }}></div>
                 </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-red-500 font-black text-xs uppercase italic"><Info size={14}/> 为什么需要 LINK？</div>
                <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">{t('community.donationDesc')}</p>
              </div>
              
              <div className="flex gap-2">
                {[1, 5, 10, 20].map(amt => (
                  <button key={amt} onClick={() => setDonateAmount(amt.toString())} className="flex-1 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-[10px] font-black text-zinc-500 hover:text-white hover:border-red-500/50 transition-all uppercase italic">+{amt} LINK</button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-center gap-4">
              <div className="relative group">
                 <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-red-500 transition-colors"><Coins size={16}/></div>
                 <input 
                  type="number" 
                  value={donateAmount} 
                  onChange={(e) => setDonateAmount(e.target.value)} 
                  placeholder={t('community.donationPlaceholder')} 
                  className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-sm font-mono font-black text-white focus:outline-none focus:border-red-500/50 transition-all shadow-inner"
                 />
              </div>
              <button 
                onClick={handleDonate}
                disabled={isDonating || !donateAmount}
                className={`w-full py-5 rounded-2xl text-xs font-black uppercase italic flex items-center justify-center gap-3 transition-all shadow-xl ${!donateAmount || isDonating ? 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed' : 'action-button active:scale-95'}`}
              >
                {isDonating ? <Loader2 size={16} className="animate-spin" /> : <><Heart size={16} /> {t('community.btnDonate')}</>}
              </button>
            </div>
          </div>
       </div>

       {/* Recycle Section */}
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
