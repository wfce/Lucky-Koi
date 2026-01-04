
import React from 'react';
import { FileText, Scale, Wallet, Dna, Zap, Gavel, Siren, Clock, Fuel, RotateCcw, Trash2 } from 'lucide-react';
import { ContractConfig } from '../types';
import { formatTokens } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

interface RulesProps {
  config: ContractConfig | null;
  tokenSymbol: string;
  tokenDecimals: number;
}

export const Rules: React.FC<RulesProps> = ({ config, tokenSymbol, tokenDecimals }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="glass-card rounded-[2rem] p-8 border border-white/10 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-5"><FileText size={200} /></div>
         <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-3 relative z-10"><Scale className="text-red-500"/> {t('rules.title')}</h2>
         <p className="mt-4 text-zinc-400 text-xs font-bold leading-relaxed max-w-2xl relative z-10">
            {t('rules.desc')}
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Rule 1 */}
         <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-red-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Wallet size={24}/></div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r1Title')}</h3>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
               {t('rules.r1Desc', { min: config ? formatTokens(config.minHolding, tokenDecimals) : '...', symbol: tokenSymbol })}
            </p>
         </div>
         {/* Rule 2 */}
         <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-amber-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><Dna size={24}/></div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r2Title')}</h3>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
               {t('rules.r2Desc', { min: config ? formatTokens(config.minHolding, tokenDecimals) : '...', max: config ? formatTokens(config.fullRewardHolding, tokenDecimals) : '...' })}
            </p>
         </div>
         {/* Rule 3 */}
         <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-emerald-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Zap size={24}/></div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r3Title')}</h3>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
               {t('rules.r3Desc', { minTime: config ? config.lotteryInterval / 60 : '...' })}
            </p>
         </div>
         {/* Rule 4 */}
         <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-purple-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform"><Gavel size={24}/></div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r4Title')}</h3>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
               {t('rules.r4Desc')}
            </p>
         </div>
      </div>
      
      {/* Maintenance Guide Section */}
      <div className="mt-8 pt-8 border-t border-white/5">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"><Siren size={24}/></div>
            <div>
                <h3 className="text-xl font-black text-white uppercase italic">{t('rules.guideTitle')}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('rules.guideDesc')}</p>
            </div>
        </div>
        
        <div className="space-y-4">
            {/* Item 1 */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group">
                <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0"><Clock size={18}/></div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-black text-white uppercase italic">{t('rules.g1Title')}</h4>
                        <div className="text-[10px] text-zinc-400 font-bold leading-relaxed space-y-1">
                            <p>{t('rules.g1Desc1')}</p>
                            <p>{t('rules.g1Desc2')}</p>
                            <p>{t('rules.g1Desc3')}</p>
                            <p className="text-amber-500/80 italic">{t('rules.g1Note')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Item 2 */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group">
                <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0"><Fuel size={18}/></div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-black text-white uppercase italic">{t('rules.g2Title')}</h4>
                        <div className="text-[10px] text-zinc-400 font-bold leading-relaxed space-y-1">
                            <p>{t('rules.g2Desc1')}</p>
                            <p>{t('rules.g2Desc2')}</p>
                            <p>{t('rules.g2Desc3')}</p>
                            <p className="text-zinc-500 italic">{t('rules.g2Note')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Item 3 */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all group">
                <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-red-500/10 rounded-lg text-red-500 shrink-0"><RotateCcw size={18}/></div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-black text-white uppercase italic">{t('rules.g3Title')}</h4>
                        <div className="text-[10px] text-zinc-400 font-bold leading-relaxed space-y-1">
                            <p>{t('rules.g3Desc1')}</p>
                            <p>{t('rules.g3Desc2')}</p>
                            <p>{t('rules.g3Desc3')}</p>
                            <p className="text-zinc-500 italic">{t('rules.g3Note')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Item 4 */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group">
                <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-purple-500/10 rounded-lg text-purple-500 shrink-0"><Trash2 size={18}/></div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-black text-white uppercase italic">{t('rules.g4Title')}</h4>
                        <div className="text-[10px] text-zinc-400 font-bold leading-relaxed space-y-1">
                            <p>{t('rules.g4Desc1')}</p>
                            <p>{t('rules.g4Desc2')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
