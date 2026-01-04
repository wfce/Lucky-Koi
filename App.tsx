
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutDashboard, History as HistoryIcon, FileText, Shield, Settings, Power, Loader2, Menu, X, Github, Twitter, Send, Globe, ShieldCheck } from 'lucide-react';
import { ethers } from 'ethers';
import { LUCKY_LOTTERY_ABI, ERC20_ABI } from './abi';
import { ContractStats, UserInfo, ContractConfig, LinkStats, GasRewardStats, TriggerStatus, LotteryRecord, WalletProvider, HolderData } from './types';
import { NavTab, AddressBox, Notification, ResultModal, WalletButton } from './components/Shared';
import { LuckyLogo } from './components/Logo';
import { MetaMaskIcon, OKXIcon, BinanceIcon, TrustWalletIcon, TokenPocketIcon, GenericWalletIcon } from './components/WalletIcons';
import { CONTRACT_ADDRESS, BSC_RPC, CHAIN_ID, PAGE_SIZE, STORAGE_KEY } from './constants';
import { parseRpcError } from './utils';
import { useLanguage } from './contexts/LanguageContext';

import { Dashboard } from './views/Dashboard';
import { Rules } from './views/Rules';
import { Holders } from './views/Holders';
import { History } from './views/History';
import { Admin } from './views/Admin';
import { PersonalTerminal } from './components/Terminal';

const SUPPORTED_WALLETS: WalletProvider[] = [
  { id: 'injected', name: 'Generic Wallet', icon: <GenericWalletIcon />, detectFlag: 'isMetaMask' },
  { id: 'metamask', name: 'MetaMask', icon: <MetaMaskIcon />, detectFlag: 'isMetaMask' },
  { id: 'okx', name: 'OKX Wallet', icon: <OKXIcon />, detectFlag: 'isOKXWallet', globalVar: 'okxwallet' },
  { id: 'binance', name: 'Binance Wallet', icon: <BinanceIcon />, detectFlag: 'isBinance', globalVar: 'BinanceChain' },
  { id: 'trust', name: 'Trust Wallet', icon: <TrustWalletIcon />, detectFlag: 'isTrust', globalVar: 'trustwallet' },
  { id: 'tokenpocket', name: 'TokenPocket', icon: <TokenPocketIcon />, detectFlag: 'isTokenPocket', globalVar: 'tokenpocket' }
];

const App: React.FC = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [detectedWallets, setDetectedWallets] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'rules' | 'holders' | 'admin'>('stats');
  
  // Data States
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [linkStats, setLinkStats] = useState<LinkStats | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [gasRewardStats, setGasRewardStats] = useState<GasRewardStats | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<TriggerStatus>(TriggerStatus.IntervalNotReached);
  const [holdersData, setHoldersData] = useState<HolderData[]>([]);
  const [history, setHistory] = useState<LotteryRecord[]>([]);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [tokenSymbol, setTokenSymbol] = useState<string>("TOKEN");
  const [countdown, setCountdown] = useState<{h:string, m:string, s:string, isZero: boolean}>({h:"00", m:"00", s:"00", isZero: false});
  const [holdersPage, setHoldersPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [cleanupProgress, setCleanupProgress] = useState<{remaining: number, percent: number} | null>(null);

  // UI States
  const [notification, setNotification] = useState<{show: boolean, type: 'error' | 'success' | 'info', title: string, message: string}>({ show: false, type: 'info', title: '', message: '' });
  const [resultModal, setResultModal] = useState<{show: boolean, mode: 'winner' | 'loser' | 'guest', isWinner: boolean, amount: string, winnerAddress: string, txHash: string}>({ show: false, mode: 'guest', isWinner: false, amount: '0', winnerAddress: '', txHash: '' });

  const lastProcessedRequestId = useRef<string | null>(null);
  const previousInProgress = useRef<boolean>(false);
  const isInitialLoad = useRef<boolean>(true);
  const postLotteryCheckCounter = useRef<number>(0); 
  const currentTimeRef = useRef<number>(Math.floor(Date.now() / 1000));

  const readOnlyProvider = useMemo(() => new ethers.JsonRpcProvider(BSC_RPC, { chainId: 56, name: 'binance' }), []);
  const readOnlyContract = useMemo(() => new ethers.Contract(CONTRACT_ADDRESS, LUCKY_LOTTERY_ABI, readOnlyProvider), [readOnlyProvider]);

  const showNotification = useCallback((type: 'error' | 'success' | 'info', title: string, message: string) => { setNotification({ show: true, type, title, message }); }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    const timer = setInterval(() => { currentTimeRef.current = Math.floor(Date.now() / 1000); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasSufficientBalance = useMemo(() => {
    if (!userInfo || !config) return false;
    try { return BigInt(userInfo.walletBalance) >= BigInt(config.minHolding); } catch (e) { return false; }
  }, [userInfo, config]);

  // Wallet Detection
  useEffect(() => {
    const detect = () => {
      const w = window as any;
      const found = new Set<string>();
      const ethereum = w.ethereum;
      const providers = ethereum?.providers || (ethereum ? [ethereum] : []);
      if (ethereum) found.add('injected');
      SUPPORTED_WALLETS.forEach(wallet => {
        if (wallet.id === 'tokenpocket' && w.ethereum?.isTokenPocket) { found.add('tokenpocket'); return; }
        if (wallet.globalVar && w[wallet.globalVar]) { found.add(wallet.id); return; }
        if (wallet.id === 'binance' && (ethereum?.isBinance || w.BinanceChain)) { found.add('binance'); return; }
        const isFoundInProviders = providers.some((p: any) => p?.[wallet.detectFlag]);
        if (isFoundInProviders) { found.add(wallet.id); return; }
        if (ethereum?.[wallet.detectFlag]) { found.add(wallet.id); }
      });
      setDetectedWallets(found);
    };
    detect();
    setTimeout(detect, 1000);
    window.addEventListener('ethereum#initialized', detect);
    window.addEventListener("eip6963:announceProvider", detect as any);
    window.addEventListener('load', detect);
    return () => {
        window.removeEventListener('ethereum#initialized', detect);
        window.removeEventListener("eip6963:announceProvider", detect as any);
        window.removeEventListener('load', detect);
    };
  }, []);

  // Wallet Connection
  const connectSpecificWallet = async (wallet: WalletProvider) => {
    let targetProvider: any = null;
    const w = window as any;
    const ethereum = w.ethereum;

    if (wallet.id === 'tokenpocket') {
        if (w.ethereum?.isTokenPocket) targetProvider = w.ethereum;
        else if (w.tokenpocket) targetProvider = w.tokenpocket;
    } else if (wallet.globalVar && w[wallet.globalVar]) { 
        targetProvider = w[wallet.globalVar]; 
    }

    if (!targetProvider && ethereum) {
        const providers = ethereum.providers || [];
        if (providers.length > 0) {
            if (wallet.id === 'metamask') {
                 targetProvider = providers.find((p: any) => p.isMetaMask && !p.isOKXWallet && !p.isTrust && !p.isTokenPocket && !p.isBinance);
                 if (!targetProvider) targetProvider = providers.find((p: any) => p.isMetaMask);
            } else {
                 targetProvider = providers.find((p: any) => p[wallet.detectFlag]);
            }
        }
    }

    if (!targetProvider && ethereum) {
        if (wallet.id === 'injected') targetProvider = ethereum; 
        else if (wallet.id === 'binance' && ethereum.isBinance) targetProvider = ethereum;
        else if (ethereum[wallet.detectFlag]) targetProvider = ethereum; 
        if (!targetProvider && wallet.id === 'metamask' && ethereum.isMetaMask) targetProvider = ethereum; 
    }

    if (!targetProvider) {
         if (wallet.id === 'tokenpocket' && ethereum) targetProvider = ethereum;
         else {
             if (wallet.id === 'injected') return showNotification('info', t('wallet.envNotReady'), t('wallet.envNotReadyDesc'));
             return showNotification('info', t('wallet.notFound'), t('wallet.notFoundDesc', { name: wallet.name }));
         }
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(targetProvider);
      try {
          const network = await provider.getNetwork();
          if (network.chainId.toString() !== BigInt(CHAIN_ID).toString()) {
            try { 
                await targetProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID }] }); 
            } catch (switchError: any) {
                if (switchError.code === 4902 || switchError.toString().includes('Unrecognized chain ID') || switchError.code === -32603) {
                    await targetProvider.request({ 
                        method: 'wallet_addEthereumChain', 
                        params: [{ chainId: CHAIN_ID, chainName: 'BSC Mainnet', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: [BSC_RPC], blockExplorerUrls: ['https://bscscan.com'] }] 
                    });
                } else console.warn("Switch chain failed", switchError);
            }
          }
      } catch (netErr) { console.warn("Network check failed", netErr); }
      
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]); 
      localStorage.setItem(STORAGE_KEY, "true"); 
      setIsModalOpen(false);
      showNotification('success', t('wallet.connectSuccess'), t('wallet.connectSuccessDesc', { name: wallet.name }));
    } catch (err: any) { 
        console.error(err);
        showNotification('error', t('wallet.connectError'), t('wallet.connectErrorDesc')); 
    } finally { setLoading(false); }
  };

  useEffect(() => {
      const storedConnected = localStorage.getItem(STORAGE_KEY);
      const w = window as any;
      if (storedConnected === "true") {
        try {
          let providerToUse = w.ethereum;
          if (w.BinanceChain && (!w.ethereum || w.BinanceChain.bnbSign)) providerToUse = w.BinanceChain;
          if (providerToUse) {
              const provider = new ethers.BrowserProvider(providerToUse);
              provider.send("eth_accounts", []).then(accounts => {
                  if (accounts.length > 0) setAccount(accounts[0]);
                  else localStorage.removeItem(STORAGE_KEY);
              });
          }
        } catch (error) { console.error("Auto connect failed:", error); }
      }
  }, []);

  const fetchHistoryAndDetectWinner = useCallback(async () => {
    try {
      const filter = readOnlyContract.filters.WinnerSelected();
      const events = await readOnlyContract.queryFilter(filter, -4900); 
      const records: LotteryRecord[] = events.map((event: any) => ({
        requestId: event.args[0].toString(),
        winner: event.args[1],
        reward: ethers.formatEther(event.args[2]),
        percentage: Number(event.args[3]),
        blockNumber: event.blockNumber,
        txHash: event.transactionHash
      })).reverse();
      setHistory(records);
      
      if (isInitialLoad.current) {
        if (records.length > 0) lastProcessedRequestId.current = records[0].requestId; 
        isInitialLoad.current = false;
        return;
      }

      if (records.length > 0) {
        const latest = records[0];
        if (latest.requestId !== lastProcessedRequestId.current) {
          lastProcessedRequestId.current = latest.requestId;
          postLotteryCheckCounter.current = 0;
          let mode: 'winner' | 'loser' | 'guest' = 'guest';
          let isWinner = false;
          if (account) { 
              isWinner = latest.winner.toLowerCase() === account.toLowerCase(); 
              mode = isWinner ? 'winner' : 'loser'; 
          }
          setResultModal({ show: true, mode, isWinner, amount: latest.reward, winnerAddress: latest.winner, txHash: latest.txHash });
        }
      }
    } catch (err) { console.error("Fetch history error:", err); }
  }, [readOnlyContract, account]);

  const fetchData = useCallback(async () => {
    try {
      const c = await readOnlyContract.getConfig().catch((e: any) => { throw e; });
      const currentConfig = {
        tokenAddress: c[0], link677Address: c[1], linkBep20Address: c[2], pegSwapAddress: c[3],
        swapRouter: c[4], wbnb: c[5], minHolding: c[6].toString(), fullRewardHolding: c[7].toString(), 
        lotteryInterval: Number(c[8]), maxHolders: Number(c[9]), callbackGasLimit: Number(c[10]), 
        tokenSet: c[11], configLocked: c[12]
      };
      setConfig(currentConfig);

      if (c[11] && c[0] !== ethers.ZeroAddress) {
          const tokenContract = new ethers.Contract(c[0], ERC20_ABI, readOnlyProvider);
          try {
             const [sym, dec] = await Promise.all([tokenContract.symbol(), tokenContract.decimals()]);
             setTokenSymbol(sym); setTokenDecimals(Number(dec));
          } catch(e) { setTokenSymbol("TOKEN"); setTokenDecimals(18); }
      }

      const [s, l, rawBalance, clProg, actualPool, trigStatusDetails, gasRewards] = await Promise.all([
        readOnlyContract.getContractStats(), readOnlyContract.getLinkStats(), readOnlyProvider.getBalance(CONTRACT_ADDRESS),
        readOnlyContract.getCleanupProgress().catch(() => null), readOnlyContract.getActualKoiPool().catch(() => BigInt(0)),
        readOnlyContract.getTriggerStatusDetails(), readOnlyContract.getGasRewardStats()
      ]);
      
      if (clProg) setCleanupProgress({ remaining: Number(clProg.remaining), percent: Number(clProg.pct) });
      if (previousInProgress.current && !s.inProg) {
         postLotteryCheckCounter.current = 10;
         fetchHistoryAndDetectWinner(); 
      }
      previousInProgress.current = s.inProg;

      setStats({
        holderCount: Number(s.holderCnt), lotteryPool: ethers.formatEther(s.pool),
        actualLotteryPool: ethers.formatEther(actualPool), nextLotteryTime: Number(s.nextTime), 
        totalLotteries: Number(s.lotteries), totalRewards: ethers.formatEther(s.rewards), 
        totalPending: ethers.formatEther(s.pendingTotal), canTrigger: s.canTrig, 
        inProgress: s.inProg, contractTotal: ethers.formatEther(rawBalance)
      });
      
      setTriggerStatus(Number(trigStatusDetails.status));
      setGasRewardStats({
        totalPaid: ethers.formatEther(gasRewards.total), currentBounty: ethers.formatEther(gasRewards.current),
        baseReward: ethers.formatEther(gasRewards.base), maxReward: ethers.formatEther(gasRewards.max)
      });
      
      setLinkStats({
        erc677Balance: ethers.formatEther(l[0]), bep20Balance: ethers.formatEther(l[1]),
        subscriptionBalance: ethers.formatEther(l[2]), totalLinkBalance: ethers.formatEther(l[3]), 
        availableEthForLink: ethers.formatEther(l[4]), needsBuy: l[5], needsConvert: l[6],
        needsTopUp: l[7], totalLinkPurchased: ethers.formatEther(l[8]),
        totalEthSpent: ethers.formatEther(l[9]), received: ethers.formatEther(l[10])
      });

      if (currentConfig.tokenSet && currentConfig.tokenAddress !== ethers.ZeroAddress) {
        if (account) {
          const tokenContract = new ethers.Contract(currentConfig.tokenAddress, ERC20_ABI, readOnlyProvider);
          const [u, walletBal, uTrigger] = await Promise.all([
            readOnlyContract.getUserInfo(account).catch(() => ({ registered: false, balance: 0, rewardPct: 0, valid: false, won: 0, winCnt: 0, pendingAmt: 0 })),
            tokenContract.balanceOf(account).catch(() => BigInt(0)),
            readOnlyContract.getUserTriggerInfo(account).catch(() => ({ triggers: 0, gasRewards: 0, attempts: 0, donations: 0 }))
          ]);
          setUserInfo({
            registered: u.registered, currentBalance: u.balance.toString(), walletBalance: walletBal.toString(), 
            rewardPercentage: Number(u.rewardPct), currentlyValid: u.valid, totalWon: ethers.formatEther(u.won), winCount: Number(u.winCnt),
            pending: ethers.formatEther(u.pendingAmt), triggers: Number(uTrigger.triggers), gasRewardsCollected: ethers.formatEther(uTrigger.gasRewards),
            donations: ethers.formatEther(uTrigger.donations)
          });
        }
        const hList = await readOnlyContract.getHolders(holdersPage * PAGE_SIZE, PAGE_SIZE);
        const tokenContract = new ethers.Contract(currentConfig.tokenAddress, ERC20_ABI, readOnlyProvider);
        const holdersWithDetails = await Promise.all(hList.map(async (addr: string) => {
          try {
            const [bal, uInfo] = await Promise.all([
               tokenContract.balanceOf(addr).catch(() => BigInt(0)),
               readOnlyContract.getUserInfo(addr).catch(() => ({ valid: true }))
            ]);
            let graceEnd = 0;
            if (!uInfo.valid) {
               try {
                   const filter = readOnlyContract.filters.InvalidMarked(addr);
                   const events = await readOnlyContract.queryFilter(filter, -4900); 
                   if (events.length > 0) graceEnd = Number((events[events.length - 1] as any).args[1]);
               } catch(e) {}
            }
            return { address: addr, balance: bal.toString(), isValid: uInfo.valid !== undefined ? uInfo.valid : true, graceEnd: graceEnd };
          } catch (e) { return { address: addr, balance: "0", isValid: true, graceEnd: 0 }; }
        }));
        setHoldersData(holdersWithDetails);
      }
    } catch (err) { console.error("Fetch data error:", err); }
  }, [readOnlyContract, readOnlyProvider, account, holdersPage, fetchHistoryAndDetectWinner]);

  useEffect(() => {
    fetchData(); fetchHistoryAndDetectWinner();
    const isFastPolling = stats?.inProgress || countdown.isZero || postLotteryCheckCounter.current > 0;
    const poll = setInterval(() => {
        fetchData();
        if (postLotteryCheckCounter.current > 0) {
            postLotteryCheckCounter.current -= 1;
            fetchHistoryAndDetectWinner();
        }
    }, isFastPolling ? 2000 : 15000);
    return () => clearInterval(poll);
  }, [fetchData, fetchHistoryAndDetectWinner, stats?.inProgress, countdown.isZero]);

  useEffect(() => {
    if (!stats) return;
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, stats.nextLotteryTime - now);
      setCountdown({ h: Math.floor(diff / 3600).toString().padStart(2, '0'), m: Math.floor((diff % 3600) / 60).toString().padStart(2, '0'), s: (diff % 60).toString().padStart(2, '0'), isZero: diff === 0 });
    }, 1000);
    return () => clearInterval(timer);
  }, [stats]);

  const executeTx = async (method: string, args: any[] = []) => {
    const { ethereum } = window as any;
    if (!ethereum || !account) return setIsModalOpen(true);
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const signedContract = new ethers.Contract(CONTRACT_ADDRESS, LUCKY_LOTTERY_ABI, signer);
      const tx = await signedContract[method](...args);
      showNotification('info', t('tx.processing'), t('tx.processingDesc'));
      await tx.wait(); fetchData();
      showNotification('success', t('tx.success'), t('tx.successDesc'));
    } catch (err: any) { const parsed = parseRpcError(err, t); showNotification('error', parsed.title, parsed.message); } finally { setLoading(false); }
  };

  const sortedWallets = useMemo(() => {
    return [...SUPPORTED_WALLETS].sort((a, b) => {
        if (a.id === 'injected') return -1;
        if (b.id === 'injected') return 1;
        const aInstalled = detectedWallets.has(a.id);
        const bInstalled = detectedWallets.has(b.id);
        if (aInstalled && !bInstalled) return -1;
        if (!aInstalled && bInstalled) return 1;
        return 0;
    });
  }, [detectedWallets]);

  const disconnectWallet = () => {
    setAccount(null);
    localStorage.removeItem(STORAGE_KEY);
    showNotification('info', t('wallet.disconnected'), t('wallet.disconnectedDesc'));
  };

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <Notification show={notification.show} type={notification.type} title={notification.title} message={notification.message} onClose={() => setNotification(p => ({...p, show: false}))} />
      <ResultModal show={resultModal.show} mode={resultModal.mode} isWinner={resultModal.isWinner} amount={resultModal.amount} winnerAddress={resultModal.winnerAddress} txHash={resultModal.txHash} onClose={() => setResultModal(p => ({...p, show: false}))} />

      {isMenuOpen && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in" onClick={() => setIsMenuOpen(false)} />}
      <div className={`fixed top-0 right-0 h-full w-64 bg-[#0a0a0c] border-l border-white/10 z-[60] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col shadow-2xl ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between"><span className="text-sm font-black text-white uppercase italic">{t('nav.menu')}</span><button onClick={() => setIsMenuOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <NavTab active={activeTab === 'stats'} onClick={() => { setActiveTab('stats'); setIsMenuOpen(false); }} label={t('nav.dashboard')} icon={<LayoutDashboard size={16}/>} isMobile />
              <NavTab active={activeTab === 'history'} onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }} label={t('nav.history')} icon={<HistoryIcon size={16}/>} isMobile />
              <NavTab active={activeTab === 'rules'} onClick={() => { setActiveTab('rules'); setIsMenuOpen(false); }} label={t('nav.rules')} icon={<FileText size={16}/>} isMobile />
              <NavTab active={activeTab === 'holders'} onClick={() => { setActiveTab('holders'); setIsMenuOpen(false); }} label={t('nav.holders')} icon={<Shield size={16}/>} isMobile />
              <NavTab active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); setIsMenuOpen(false); }} label={t('nav.admin')} icon={<Settings size={16}/>} isMobile />
          </div>
          <div className="p-6 border-t border-white/5 text-center flex flex-col gap-4">
             <button onClick={toggleLanguage} className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 font-bold uppercase hover:text-white hover:bg-zinc-800 transition-all">
                <Globe size={16} /> {language === 'en' ? 'English' : '中文'}
             </button>
             <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{t('nav.version')}</p>
          </div>
      </div>

      <nav className="sticky top-0 z-40 glass-card border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group select-none" onClick={() => setActiveTab('stats')}>
                <div className="bg-[#0c0c0e] border border-white/5 p-1 rounded-xl sm:rounded-2xl shadow-2xl relative transition-transform group-hover:scale-105 duration-500 shrink-0">
                    <div className="block sm:hidden"><LuckyLogo size={32} /></div>
                    <div className="hidden sm:block"><LuckyLogo size={46} /></div>
                    <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full animate-pulse -z-10" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-2xl font-black text-white tracking-tighter uppercase italic pr-2 leading-none group-hover:text-red-400 transition-colors">{t('app.name')}</span>
                  <span className="text-[7px] sm:text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-0.5 sm:mt-1 pr-2">{t('app.subtitle')}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-2 p-1 bg-zinc-950/50 rounded-xl border border-white/5 shadow-inner mr-4">
                  <NavTab active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label={t('nav.dashboard')} icon={<LayoutDashboard size={14}/>} />
                  <NavTab active={activeTab === 'history'} onClick={() => setActiveTab('history')} label={t('nav.history')} icon={<HistoryIcon size={14}/>} />
                  <NavTab active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} label={t('nav.rules')} icon={<FileText size={14}/>} />
                  <NavTab active={activeTab === 'holders'} onClick={() => setActiveTab('holders')} label={t('nav.holders')} icon={<Shield size={14}/>} />
                  <NavTab active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} label={t('nav.admin')} icon={<Settings size={14}/>} />
               </div>
               
               <button onClick={toggleLanguage} className="hidden lg:flex p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-all shadow-inner active:scale-95" title="Switch Language">
                  <Globe size={14} />
               </button>

                {account ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:block px-5 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-[11px] font-black uppercase tracking-wider text-zinc-400">{account.slice(0, 6)}...{account.slice(-4)}</div>
                    <button onClick={disconnectWallet} className="p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-red-500 active:bg-zinc-800 shadow-inner transition-all"><Power size={14}/></button>
                  </div>
                ) : (
                  <button onClick={() => setIsModalOpen(true)} disabled={loading} className={`flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-wider action-button ${loading && 'opacity-75 cursor-not-allowed'}`}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <span className="hidden sm:inline">{t('nav.connect')}</span>}
                    {loading ? '' : <span className="sm:hidden">{t('nav.connect')}</span>}
                  </button>
                )}
                <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white active:scale-95 transition-all"><Menu size={18} /></button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start mt-6">
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {activeTab === 'stats' && (
              <Dashboard 
                stats={stats} 
                history={history} 
                triggerStatus={triggerStatus} 
                countdown={countdown}
                mobileTerminal={
                  <PersonalTerminal account={account} loading={loading} userInfo={userInfo} config={config} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} hasSufficientBalance={hasSufficientBalance} onConnect={() => setIsModalOpen(true)} onExecute={executeTx} />
                }
              />
          )}
          {activeTab === 'rules' && <Rules config={config} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} />}
          {activeTab === 'holders' && <Holders stats={stats} config={config} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} holdersData={holdersData} holdersPage={holdersPage} setHoldersPage={setHoldersPage} onExecute={executeTx} />}
          {activeTab === 'history' && <History history={history} historyPage={historyPage} setHistoryPage={setHistoryPage} />}
          {activeTab === 'admin' && <Admin loading={loading} linkStats={linkStats} gasRewardStats={gasRewardStats} cleanupProgress={cleanupProgress} readOnlyContract={readOnlyContract} onExecute={executeTx} showNotification={showNotification} />}
        </div>
        <div className="lg:col-span-4 sticky top-24 hidden lg:block">
          <PersonalTerminal account={account} loading={loading} userInfo={userInfo} config={config} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} hasSufficientBalance={hasSufficientBalance} onConnect={() => setIsModalOpen(true)} onExecute={executeTx} />
        </div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 flex flex-col md:flex-row gap-4 sm:gap-6">
        <AddressBox label="TOKEN CA" address={config?.tokenAddress || "..."} onCopy={(m) => showNotification('info', t('wallet.copySuccess'), m)} explorerLink={`https://bscscan.com/address/${config?.tokenAddress}`} />
        <AddressBox label="CONTRACT CA" address={CONTRACT_ADDRESS} onCopy={(m) => showNotification('info', t('wallet.copySuccess'), m)} explorerLink={`https://bscscan.com/address/${CONTRACT_ADDRESS}`} />
      </div>

      <footer className="mt-20 border-t border-white/5 bg-[#08080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                    <LuckyLogo size={32} />
                    <div>
                        <h4 className="text-sm font-black text-white uppercase italic tracking-wider">{t('app.name')}</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{t('app.desc')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <a href="https://github.com/wfce/Lucky-Koi" target="_blank" rel="noreferrer" className="p-2 text-zinc-600 hover:text-white transition-colors"><Github size={18} /></a>
                    <a href="https://x.com/jinli_bnb" target="_blank" rel="noreferrer" className="p-2 text-zinc-600 hover:text-sky-500 transition-colors"><Twitter size={18} /></a>
                    <a href="https://t.me/jinli_bnb" target="_blank" rel="noreferrer" className="p-2 text-zinc-600 hover:text-blue-400 transition-colors"><Send size={18} /></a>
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                <p>{t('app.copyright')}</p>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500"/> Chainlink VRF V2.5</span>
                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 opacity-80 saturate-50"><BinanceIcon/></div> {t('app.network')}</span>
                </div>
            </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => !loading && setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-300 shadow-3xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-white uppercase italic pr-4">{t('wallet.title')}</h2><button onClick={() => setIsModalOpen(false)} disabled={loading} className="p-2 text-zinc-600 hover:text-white transition-colors disabled:opacity-30"><X size={20}/></button></div>
            <p className="text-[10px] font-black text-zinc-600 uppercase italic mb-6 leading-relaxed">{t('wallet.desc')}</p>
            <div className="space-y-3">
              {sortedWallets.map(wallet => (<WalletButton key={wallet.id} name={wallet.name} icon={wallet.icon} installed={detectedWallets.has(wallet.id)} onClick={() => connectSpecificWallet(wallet)} disabled={loading} t={t} />))}
            </div>
            <div className="mt-8 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10"><p className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest italic pr-2 text-center">{t('wallet.currentNetwork')}</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
