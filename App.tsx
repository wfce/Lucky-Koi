
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutDashboard, History as HistoryIcon, FileText, Shield, Settings, Power, Loader2, Menu, X, Github, Twitter, Send, Globe, ShieldCheck, Waves } from 'lucide-react';
import { ethers } from 'ethers';
import { LUCKY_LOTTERY_ABI, ERC20_ABI } from './abi';
import { ContractStats, UserInfo, ContractConfig, LinkStats, GasRewardStats, TriggerStatus, LotteryRecord, WalletProvider, HolderData } from './types';
import { NavTab, AddressBox, Notification, ResultModal, WalletButton } from './components/Shared';
import { LuckyLogo } from './components/Logo';
import { MetaMaskIcon, OKXIcon, BinanceIcon, TrustWalletIcon, TokenPocketIcon, GenericWalletIcon } from './components/WalletIcons';
import { CONTRACT_ADDRESS, BSC_RPC, CHAIN_ID, PAGE_SIZE, STORAGE_KEY, HISTORY_BLOCK_RANGE } from './constants';
import { parseRpcError } from './utils';
import { useLanguage } from './contexts/LanguageContext';

import { Dashboard } from './views/Dashboard';
import { Rules } from './views/Rules';
import { Holders } from './views/Holders';
import { History } from './views/History';
import { Community } from './views/Community';
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
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'rules' | 'holders' | 'community'>('stats');
  
  // EIP-6963 Providers
  const [eip6963Providers, setEip6963Providers] = useState<any[]>([]);

  // Data States
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [isSyncingInitial, setIsSyncingInitial] = useState<boolean>(true);
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
  
  const isFetchingDataRef = useRef<boolean>(false);
  const isFetchingHistoryRef = useRef<boolean>(false);

  const readOnlyProvider = useMemo(() => new ethers.JsonRpcProvider(BSC_RPC, { chainId: 56, name: 'binance' }), []);
  const readOnlyContract = useMemo(() => new ethers.Contract(CONTRACT_ADDRESS, LUCKY_LOTTERY_ABI, readOnlyProvider), [readOnlyProvider]);

  const showNotification = useCallback((type: 'error' | 'success' | 'info', title: string, message: string) => { setNotification({ show: true, type, title, message }); }, []);

  const switchNetwork = async (targetEthereum: any) => {
    try {
      await targetEthereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID }],
      });
      return true;
    } catch (switchError: any) {
      // 4902: Unrecognized chain; -32603: Internal error (common in some mobile wallets)
      if (switchError.code === 4902 || switchError.code === -32603) {
        try {
          await targetEthereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: CHAIN_ID,
              chainName: 'BNB Smart Chain Mainnet',
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              rpcUrls: [BSC_RPC],
              blockExplorerUrls: ['https://bscscan.com']
            }]
          });
          return true;
        } catch (addError) {
          return false;
        }
      }
      return false;
    }
  };

  const hasSufficientBalance = useMemo(() => {
    if (!userInfo || !config) return false;
    try { return BigInt(userInfo.walletBalance) >= BigInt(config.minHolding); } catch (e) { return false; }
  }, [userInfo, config]);

  // Wallet Detection
  useEffect(() => {
    // EIP-6963 Handler
    const handleEIP6963 = (event: any) => {
        setEip6963Providers(prev => {
            if (prev.find(p => p.info.uuid === event.detail.info.uuid)) return prev;
            return [...prev, event.detail];
        });
        const rdns = event.detail.info.rdns.toLowerCase();
        setDetectedWallets(prev => {
            const next = new Set(prev);
            if (rdns.includes('metamask')) next.add('metamask');
            else if (rdns.includes('okx')) next.add('okx');
            else if (rdns.includes('trust') || rdns.includes('trustwallet')) next.add('trust');
            else if (rdns.includes('tokenpocket')) next.add('tokenpocket');
            else if (rdns.includes('binance')) next.add('binance');
            next.add('injected');
            return next;
        });
    };
    window.addEventListener("eip6963:announceProvider", handleEIP6963);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

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
      // Merge with EIP-6963 findings
      setDetectedWallets(prev => {
          const next = new Set(prev);
          found.forEach(id => next.add(id));
          return next;
      });
    };
    detect();
    setTimeout(detect, 1000);
    window.addEventListener('ethereum#initialized', detect);
    window.addEventListener('load', detect);
    
    // Global chain change listener
    const w = window as any;
    if (w.ethereum) {
        w.ethereum.on('chainChanged', (chainId: string) => {
            if (chainId !== CHAIN_ID && BigInt(chainId).toString() !== BigInt(CHAIN_ID).toString()) {
                window.location.reload(); 
            }
        });
    }

    return () => {
        window.removeEventListener("eip6963:announceProvider", handleEIP6963);
        window.removeEventListener('ethereum#initialized', detect);
        window.removeEventListener('load', detect);
    };
  }, []);

  // Wallet Connection
  const connectSpecificWallet = async (wallet: WalletProvider) => {
    let targetProvider: any = null;
    const w = window as any;
    const ethereum = w.ethereum;

    // 1. Check EIP-6963 Providers first (High Priority & No Conflicts)
    const eipMatch = eip6963Providers.find(p => {
        const rdns = p.info.rdns.toLowerCase();
        if (wallet.id === 'metamask') return rdns.includes('metamask');
        if (wallet.id === 'okx') return rdns.includes('okx');
        if (wallet.id === 'trust') return rdns.includes('trust');
        if (wallet.id === 'tokenpocket') return rdns.includes('tokenpocket');
        if (wallet.id === 'binance') return rdns.includes('binance');
        return false;
    });

    if (eipMatch) {
        targetProvider = eipMatch.provider;
    }

    // 2. Legacy / Global Injection Checks
    if (!targetProvider) {
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
            if (wallet.id === 'injected' || (wallet.id === 'binance' && ethereum.isBinance) || ethereum[wallet.detectFlag]) targetProvider = ethereum; 
            if (!targetProvider && wallet.id === 'metamask' && ethereum.isMetaMask) targetProvider = ethereum; 
        }
    }

    if (!targetProvider) {
         if (wallet.id === 'tokenpocket' && ethereum) targetProvider = ethereum;
         else return showNotification('info', t('wallet.notFound'), t('wallet.notFoundDesc', { name: wallet.name }));
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(targetProvider);
      
      // CRITICAL FIX: Request accounts BEFORE getting network.
      // Binance Wallet and some mobile wallets fail getNetwork() if locked/unconnected.
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]); 
      
      const network = await provider.getNetwork();
      
      // Force BNB Chain (ChainID: 56)
      if (network.chainId.toString() !== BigInt(CHAIN_ID).toString()) {
        const switched = await switchNetwork(targetProvider);
        if (!switched) {
          // Double check if switch actually happened but returned false/error
          const newNetwork = await provider.getNetwork();
          if (newNetwork.chainId.toString() !== BigInt(CHAIN_ID).toString()) {
              setLoading(false);
              return showNotification('error', t('wallet.connectError'), "本应用必须在 BNB Chain 上运行，切换网络失败。");
          }
        }
      }
      
      localStorage.setItem(STORAGE_KEY, "true"); 
      setIsModalOpen(false);
      showNotification('success', t('wallet.connectSuccess'), t('wallet.connectSuccessDesc', { name: wallet.name }));
    } catch (err: any) { 
        console.error("Connect Error:", err);
        showNotification('error', t('wallet.connectError'), t('wallet.connectErrorDesc')); 
    } finally { setLoading(false); }
  };

  useEffect(() => {
      const storedConnected = localStorage.getItem(STORAGE_KEY);
      const w = window as any;
      if (storedConnected === "true" && w.ethereum) {
        const provider = new ethers.BrowserProvider(w.ethereum);
        // Silent connect
        provider.send("eth_accounts", []).then(accounts => {
            if (accounts.length > 0) setAccount(accounts[0]);
            else localStorage.removeItem(STORAGE_KEY);
        }).catch(() => localStorage.removeItem(STORAGE_KEY));
      }
  }, []);

  const fetchHistoryAndDetectWinner = useCallback(async () => {
    if (isFetchingHistoryRef.current) return;
    isFetchingHistoryRef.current = true;
    try {
      const filter = readOnlyContract.filters.WinnerSelected();
      const events = await readOnlyContract.queryFilter(filter, -HISTORY_BLOCK_RANGE); 
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
          let mode: 'winner' | 'loser' | 'guest' = account ? (latest.winner.toLowerCase() === account.toLowerCase() ? 'winner' : 'loser') : 'guest';
          setResultModal({ show: true, mode, isWinner: mode === 'winner', amount: latest.reward, winnerAddress: latest.winner, txHash: latest.txHash });
        }
      }
    } catch (err) { console.error(err); }
    finally { isFetchingHistoryRef.current = false; }
  }, [readOnlyContract, account]);

  const fetchData = useCallback(async () => {
    if (isFetchingDataRef.current) return;
    isFetchingDataRef.current = true;
    try {
      const c = await readOnlyContract.getConfig();
      // getConfig returns a 16-element tuple in the new contract
      const currentConfig: ContractConfig = {
        tokenAddress: c[0], 
        link677Address: c[1], 
        linkBep20Address: c[2], 
        pegSwapAddress: c[3],
        swapRouter: c[4], 
        wbnb: c[5], 
        minHolding: c[6].toString(), 
        fullRewardHolding: c[7].toString(), 
        lotteryInterval: Number(c[8]), 
        maxHolders: Number(c[9]), 
        callbackGasLimit: Number(c[10]), 
        tokenSet: c[11], 
        tokenLocked: c[12],
        admin: c[13],
        ownershipRenounced: c[14],
        adminRenounced: c[15],
        configLocked: c[12] // alias for tokenLocked logic in frontend if needed
      };
      setConfig(currentConfig);

      if (c[11] && c[0] !== ethers.ZeroAddress) {
          const tokenContract = new ethers.Contract(c[0], ERC20_ABI, readOnlyProvider);
          const [sym, dec] = await Promise.all([tokenContract.symbol(), tokenContract.decimals()]);
          setTokenSymbol(sym); setTokenDecimals(Number(dec));
      }

      const [s, l, rawBalance, clProg, actualPool, trigStatusDetails, gasRewards] = await Promise.all([
        readOnlyContract.getContractStats(), readOnlyContract.getLinkStats(), readOnlyProvider.getBalance(CONTRACT_ADDRESS),
        readOnlyContract.getCleanupProgress().catch(() => null), readOnlyContract.getActualKoiPool().catch(() => BigInt(0)),
        readOnlyContract.getTriggerStatusDetails(), readOnlyContract.getGasRewardStats()
      ]);
      
      if (clProg) setCleanupProgress({ remaining: Number(clProg.remaining), percent: Number(clProg.pct) });
      if (previousInProgress.current && !s.inProg) fetchHistoryAndDetectWinner(); 
      previousInProgress.current = s.inProg;

      setStats({
        holderCount: Number(s.holderCnt), lotteryPool: ethers.formatEther(s.pool),
        actualLotteryPool: ethers.formatEther(actualPool), nextLotteryTime: Number(s.nextTime), 
        totalLotteries: Number(s.lotteries), totalRewards: ethers.formatEther(s.rewards), 
        totalPending: ethers.formatEther(s.pendingTotal), canTrigger: s.canTrig, 
        inProgress: s.inProg, contractTotal: ethers.formatEther(rawBalance)
      });
      setIsSyncingInitial(false);

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

      if (currentConfig.tokenSet && account) {
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
          const bal = await tokenContract.balanceOf(addr).catch(() => BigInt(0));
          return { address: addr, balance: bal.toString(), isValid: true, graceEnd: 0 };
      }));
      setHoldersData(holdersWithDetails);
    } catch (err) { setIsSyncingInitial(false); }
    finally { isFetchingDataRef.current = false; }
  }, [readOnlyContract, readOnlyProvider, account, holdersPage, fetchHistoryAndDetectWinner]);

  useEffect(() => {
    fetchData(); fetchHistoryAndDetectWinner();
    const poll = setInterval(() => { fetchData(); fetchHistoryAndDetectWinner(); }, 4000);
    return () => clearInterval(poll);
  }, [fetchData, fetchHistoryAndDetectWinner]);

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
    
    const provider = new ethers.BrowserProvider(ethereum);
    const network = await provider.getNetwork();
    
    // Safety check: verify chain before transaction
    if (network.chainId.toString() !== BigInt(CHAIN_ID).toString()) {
      const switched = await switchNetwork(ethereum);
      if (!switched) {
        return showNotification('error', "链不匹配", "请先将钱包切换至 BNB Chain 以执行该操作。");
      }
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const signedContract = new ethers.Contract(CONTRACT_ADDRESS, LUCKY_LOTTERY_ABI, signer);
      const tx = await signedContract[method](...args);
      showNotification('info', t('tx.processing'), t('tx.processingDesc'));
      await tx.wait(); 
      fetchData();
      showNotification('success', t('tx.success'), t('tx.successDesc'));
    } catch (err: any) { 
        const parsed = parseRpcError(err, t); 
        showNotification('error', parsed.title, parsed.message); 
    } finally { setLoading(false); }
  };

  const sortedWallets = useMemo(() => {
    return [...SUPPORTED_WALLETS].sort((a, b) => (detectedWallets.has(a.id) ? -1 : 1));
  }, [detectedWallets]);

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      {isSyncingInitial && (
        <div className="fixed inset-0 z-[5000] flex flex-col items-center justify-center bg-[#050507]">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.18)_0%,rgba(0,0,0,0)_75%)] pointer-events-none" />
           <div className="relative flex flex-col items-center justify-center p-12">
              <div className="absolute inset-0 bg-amber-500/15 blur-[100px] rounded-full animate-pulse" />
              <div className="relative z-10 animate-[float_6s_ease-in-out_infinite]"><LuckyLogo size={140} /></div>
           </div>
           <div className="relative z-10 text-center space-y-4 mt-12">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 uppercase italic tracking-widest animate-pulse">{t('app.syncing')}</h2>
              <div className="flex items-center gap-2 justify-center text-red-500/80 text-[10px] font-black uppercase tracking-[0.5em]"><Waves size={12} className="animate-bounce" /><span>{t('app.syncingDesc')}</span><Waves size={12} className="animate-bounce delay-150" /></div>
           </div>
           <style>{` @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.02); } } `}</style>
        </div>
      )}

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
              <NavTab active={activeTab === 'community'} onClick={() => { setActiveTab('community'); setIsMenuOpen(false); }} label={t('nav.community')} icon={<Settings size={16}/>} isMobile />
          </div>
          <div className="p-6 border-t border-white/5 text-center flex flex-col gap-4">
             <button onClick={toggleLanguage} className="flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 font-bold uppercase hover:text-white hover:bg-zinc-800 transition-all"><Globe size={16} /> {language === 'en' ? 'English' : '中文'}</button>
             <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{t('nav.version')}</p>
          </div>
      </div>

      <nav className="sticky top-0 z-40 glass-card border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group select-none" onClick={() => setActiveTab('stats')}>
                <div className="bg-[#0c0c0e] border border-white/5 p-1 rounded-xl sm:rounded-2xl shadow-2xl relative shrink-0"><LuckyLogo size={46} /><div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full animate-pulse -z-10" /></div>
                <div className="flex flex-col"><span className="text-base sm:text-2xl font-black text-white tracking-tighter uppercase italic leading-none group-hover:text-red-400 transition-colors">{t('app.name')}</span><span className="text-[7px] sm:text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-0.5 sm:mt-1">{t('app.subtitle')}</span></div>
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-2 p-1 bg-zinc-950/50 rounded-xl border border-white/5 shadow-inner mr-4">
                  <NavTab active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label={t('nav.dashboard')} icon={<LayoutDashboard size={14}/>} />
                  <NavTab active={activeTab === 'history'} onClick={() => setActiveTab('history')} label={t('nav.history')} icon={<HistoryIcon size={14}/>} />
                  <NavTab active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} label={t('nav.rules')} icon={<FileText size={14}/>} />
                  <NavTab active={activeTab === 'holders'} onClick={() => setActiveTab('holders')} label={t('nav.holders')} icon={<Shield size={14}/>} />
                  <NavTab active={activeTab === 'community'} onClick={() => setActiveTab('community')} label={t('nav.community')} icon={<Settings size={14}/>} />
               </div>
               <button onClick={toggleLanguage} className="hidden lg:flex p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-all shadow-inner"><Globe size={14} /></button>
                {account ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:block px-5 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-[11px] font-black uppercase tracking-wider text-zinc-400">{account.slice(0, 6)}...{account.slice(-4)}</div>
                    <button onClick={() => { setAccount(null); localStorage.removeItem(STORAGE_KEY); }} className="p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-red-500 transition-all"><Power size={14}/></button>
                  </div>
                ) : (
                  <button onClick={() => setIsModalOpen(true)} className={`flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-wider action-button ${loading && 'opacity-75'}`}>{loading ? <Loader2 size={14} className="animate-spin" /> : t('nav.connect')}</button>
                )}
                <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white active:scale-95 transition-all"><Menu size={18} /></button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start mt-6">
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {activeTab === 'stats' && <Dashboard stats={stats} history={history} triggerStatus={triggerStatus} countdown={countdown} mobileTerminal={<PersonalTerminal account={account} loading={loading} userInfo={userInfo} stats={stats} config={config} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} hasSufficientBalance={hasSufficientBalance} onConnect={() => setIsModalOpen(true)} onExecute={executeTx} />} />}
          {activeTab === 'rules' && <Rules config={config} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} />}
          {activeTab === 'holders' && <Holders stats={stats} config={config} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} holdersData={holdersData} holdersPage={holdersPage} setHoldersPage={setHoldersPage} onExecute={executeTx} />}
          {activeTab === 'history' && <History history={history} historyPage={historyPage} setHistoryPage={setHistoryPage} />}
          {activeTab === 'community' && <Community loading={loading} account={account} linkStats={linkStats} gasRewardStats={gasRewardStats} config={config} cleanupProgress={cleanupProgress} readOnlyContract={readOnlyContract} onExecute={executeTx} showNotification={showNotification} />}
        </div>
        <div className="lg:col-span-4 sticky top-24 hidden lg:block"><PersonalTerminal account={account} loading={loading} userInfo={userInfo} stats={stats} config={config} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} hasSufficientBalance={hasSufficientBalance} onConnect={() => setIsModalOpen(true)} onExecute={executeTx} /></div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 flex flex-col md:flex-row gap-4"><AddressBox label="TOKEN CA" address={config?.tokenAddress || "..."} onCopy={(m) => showNotification('info', t('wallet.copySuccess'), m)} explorerLink={`https://bscscan.com/address/${config?.tokenAddress}`} /><AddressBox label="CONTRACT CA" address={CONTRACT_ADDRESS} onCopy={(m) => showNotification('info', t('wallet.copySuccess'), m)} explorerLink={`https://bscscan.com/address/${CONTRACT_ADDRESS}`} /></div>

      <footer className="mt-20 border-t border-white/5 bg-[#08080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3"><LuckyLogo size={32} /><div><h4 className="text-sm font-black text-white uppercase italic">{t('app.name')}</h4><p className="text-[10px] text-zinc-500 font-bold uppercase">{t('app.desc')}</p></div></div>
            <div className="flex items-center gap-6"><a href="https://github.com/wfce/Lucky-Koi" target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-white"><Github size={18} /></a><a href="https://x.com/jinli_bnb" target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-sky-500"><Twitter size={18} /></a><a href="https://t.me/jinli_bnb" target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-blue-400"><Send size={18} /></a></div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={() => !loading && setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] p-8 animate-in zoom-in-95 shadow-3xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-white uppercase italic">{t('wallet.title')}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-600 hover:text-white"><X size={20}/></button></div>
            <p className="text-[10px] font-black text-zinc-600 uppercase italic mb-6 leading-relaxed">{t('wallet.desc')}</p>
            <div className="space-y-3">{sortedWallets.map(wallet => (<WalletButton key={wallet.id} name={wallet.name} icon={wallet.icon} installed={detectedWallets.has(wallet.id)} onClick={() => connectSpecificWallet(wallet)} disabled={loading} t={t} />))}</div>
            <div className="mt-8 p-4 bg-red-500/10 rounded-2xl border border-red-500/20"><p className="text-[10px] font-black text-red-500 uppercase italic text-center">必须使用 BNB Smart Chain (BSC)</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
