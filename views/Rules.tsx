
import React from 'react';
import { FileText, Scale, Wallet, Dna, Zap, Gavel, Siren, Clock, Fuel, RotateCcw, Trash2, Globe, Github, Terminal, Eye, TrendingUp, Table } from 'lucide-react';
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

  const thresholds = [
    { cap: "≤ $10,000", price: "~$0.00001", min: "1,500,000", full: "10,000,000", valMin: "≈ $15", valFull: "≈ $100" },
    { cap: "≤ $20,000", price: "~$0.00002", min: "750,000", full: "10,000,000", valMin: "≈ $15", valFull: "≈ $200" },
    { cap: "≤ $50,000", price: "~$0.00005", min: "300,000", full: "5,000,000", valMin: "≈ $15", valFull: "≈ $250" },
    { cap: "≤ $100,000", price: "~$0.0001", min: "150,000", full: "5,000,000", valMin: "≈ $15", valFull: "≈ $500" },
    { cap: "≤ $200,000", price: "~$0.0002", min: "75,000", full: "5,000,000", valMin: "≈ $15", valFull: "≈ $1,000" },
    { cap: "≤ $500,000", price: "~$0.0005", min: "30,000", full: "5,000,000", valMin: "≈ $15", valFull: "≈ $2,500" },
    { cap: "≤ $1,000,000", price: "~$0.001", min: "15,000", full: "5,000,000", valMin: "≈ $15", valFull: "≈ $5,000" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="glass-card rounded-[2rem] p-8 border border-white/10 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-5"><FileText size={200} /></div>
         <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-3 relative z-10"><Scale className="text-red-500"/> {t('rules.title')}</h2>
         <p className="mt-4 text-zinc-400 text-xs font-bold leading-relaxed max-w-2xl relative z-10">
            {t('rules.desc')}
         </p>
         <div className="mt-4 flex items-center gap-3 relative z-10">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase italic rounded-full">Zero Backend</span>
            <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase italic rounded-full">3% Auto-Inject</span>
            <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-black uppercase italic rounded-full">Open Source UI</span>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* Rule 1: Hold to Activate */}
         <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-red-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Wallet size={24}/></div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r1Title')}</h3>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
               {t('rules.r1Desc', { min: config ? formatTokens(config.minHolding, tokenDecimals) : '...', symbol: tokenSymbol })}
            </p>
         </div>

         {/* Rule 2: Linear Weights */}
         <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-amber-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><Dna size={24}/></div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r2Title')}</h3>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
               {t('rules.r2Desc', { min: config ? formatTokens(config.minHolding, tokenDecimals) : '...', max: config ? formatTokens(config.fullRewardHolding, tokenDecimals) : '...' })}
            </p>
         </div>

         {/* Rule 3: Awakener Bounty */}
         <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-emerald-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Zap size={24}/></div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r3Title')}</h3>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
               {t('rules.r3Desc', { minTime: config ? config.lotteryInterval / 60 : '...' })}
            </p>
         </div>

         {/* Rule 4: Community Supervision */}
         <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-purple-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform"><Gavel size={24}/></div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r4Title')}</h3>
            <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
               {t('rules.r4Desc')}
            </p>
         </div>

         {/* Rule 5 - Perpetual & Zero Backend */}
         <div className="p-6 bg-gradient-to-br from-sky-950/40 to-black border border-sky-500/20 rounded-2xl space-y-4 shadow-xl hover:border-sky-500/50 transition-all group md:col-span-2">
            <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform"><Terminal size={24}/></div>
                <div className="flex gap-2">
                    <a href="https://github.com/wfce/Lucky-Koi" target="_blank" rel="noreferrer" className="p-2 bg-zinc-900 border border-white/5 rounded-lg text-zinc-500 hover:text-sky-400 transition-all"><Github size={14}/></a>
                    <a href={`https://bscscan.com/address/${config?.tokenAddress}`} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900 border border-white/5 rounded-lg text-zinc-500 hover:text-amber-500 transition-all"><Eye size={14}/></a>
                </div>
            </div>
            <h3 className="text-lg font-black text-white uppercase italic">{t('rules.r5Title')}</h3>
            <p className="text-[11px] text-zinc-400 font-bold leading-relaxed max-w-xl">
               {t('rules.r5Desc')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <h4 className="text-[9px] font-black text-sky-400 uppercase italic mb-1">自定义终端</h4>
                    <p className="text-[8px] text-zinc-500 font-bold">前端完全解耦，支持 IPFS、Vercel 或本地部署。</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <h4 className="text-[9px] font-black text-amber-500 uppercase italic mb-1">直连合约</h4>
                    <p className="text-[8px] text-zinc-500 font-bold">即便没有前端，也可通过 BscScan 直接调用 register/trigger 函数。</p>
                </div>
            </div>
         </div>
      </div>
      
      {/* Dynamic Threshold Table Section */}
      <div className="mt-8 pt-8 border-t border-white/5">
         <div className="glass-card rounded-[2rem] p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-5 rotate-12"><TrendingUp size={200} /></div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"><Table size={24}/></div>
                <div>
                   <h3 className="text-lg sm:text-xl font-black text-white uppercase italic">动态持仓门槛调整机制</h3>
                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                       每 5 分钟自动锚定市值 (Auto-Peg)，确保入场门槛恒定在约 $15 USD
                   </p>
                </div>
            </div>

            <div className="overflow-x-auto no-scrollbar relative z-10 rounded-xl border border-white/5">
                <table className="w-full text-left min-w-[600px]">
                    <thead>
                        <tr className="bg-zinc-950/80 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                            <th className="px-6 py-4 italic">市值区间 (USD)</th>
                            <th className="px-6 py-4 italic text-right">参考单价</th>
                            <th className="px-6 py-4 italic text-right">最低持仓要求 (Token)</th>
                            <th className="px-6 py-4 italic text-right">满额权重持仓 (Token)</th>
                            <th className="px-6 py-4 italic text-right">最低门槛价值</th>
                            <th className="px-6 py-4 italic text-right">满额权重价值</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                        {thresholds.map((row, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-3.5 text-zinc-300 font-bold">{row.cap}</td>
                                <td className="px-6 py-3.5 text-right text-zinc-500 font-bold">{row.price}</td>
                                <td className="px-6 py-3.5 text-right text-emerald-400 font-black">{row.min}</td>
                                <td className="px-6 py-3.5 text-right text-amber-500 font-black">{row.full}</td>
                                <td className="px-6 py-3.5 text-right text-zinc-500">{row.valMin}</td>
                                <td className="px-6 py-3.5 text-right text-zinc-500">{row.valFull}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[9px] text-zinc-600 font-black italic relative z-10">
                <Clock size={12} />
                <span>注：自动化脚本每 5 分钟检查一次链上市值，若区间变动将自动调用合约更新参数。</span>
            </div>
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
