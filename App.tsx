
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  History, Settings, LayoutDashboard, FileText, Shield, 
  TrendingUp, Coins, Users, ShieldCheck, Activity, Globe,
  Clock, Target, Zap, Sparkles, Fingerprint, ShieldAlert,
  Power, Wallet, ExternalLink, Info, Gift, Trophy, X,
  CheckCircle2, ArrowRightCircle, AlertCircle, Sparkle,
  Waves, RefreshCw, AlertTriangle, Trash2, Search, RotateCcw,
  Loader2, Flame, Timer, Scroll, Scale, Siren, Gavel, Dna,
  Fuel, MousePointerClick, Heart, Github
} from 'lucide-react';
import { ethers } from 'ethers';
import { LUCKY_LOTTERY_ABI, ERC20_ABI } from './abi';
import { ContractStats, UserInfo, ContractConfig, LinkStats, GasRewardStats, TriggerStatus } from './types';
import { 
  formatBNBValue, StatusBadge, DigitBox, HeroStat, NavTab, 
  AdminSection, Pagination, AddressBox,
  Notification, ResultModal, WalletButton, CardIconBox, RiskBadge 
} from './UIComponents';
import { LuckyLogo } from './Logo';
import { 
  MetaMaskIcon, OKXIcon, BinanceIcon, TrustWalletIcon, TokenPocketIcon 
} from './WalletIcons';
import { 
  CONTRACT_ADDRESS, BSC_TESTNET_RPC, CHAIN_ID, 
  PAGE_SIZE, STORAGE_KEY 
} from './constants';
import { parseRpcError, formatTokens } from './utils';

interface LotteryRecord {
  requestId: string;
  winner: string;
  reward: string;
  percentage: number;
  blockNumber: number;
  txHash: string;
}

interface WalletProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  detectFlag: string;
}

interface HolderData {
  address: string;
  balance: string;
  isValid: boolean;
  graceEnd: number;
}

const SUPPORTED_WALLETS: WalletProvider[] = [
  { id: 'metamask', name: 'MetaMask', icon: <MetaMaskIcon />, detectFlag: 'isMetaMask' },
  { id: 'okx', name: 'OKX Wallet', icon: <OKXIcon />, detectFlag: 'isOKXWallet' },
  { id: 'binance', name: 'Binance Wallet', icon: <BinanceIcon />, detectFlag: 'isBinanceChainWallet' },
  { id: 'trust', name: 'Trust Wallet', icon: <TrustWalletIcon />, detectFlag: 'isTrust' },
  { id: 'tokenpocket', name: 'TokenPocket', icon: <TokenPocketIcon />, detectFlag: 'isTokenPocket' }
];

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [detectedWallets, setDetectedWallets] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'rules' | 'holders' | 'admin'>('stats');
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [linkStats, setLinkStats] = useState<LinkStats | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [gasRewardStats, setGasRewardStats] = useState<GasRewardStats | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<number>(0);
  const [holdersData, setHoldersData] = useState<HolderData[]>([]);
  const [history, setHistory] = useState<LotteryRecord[]>([]);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [tokenSymbol, setTokenSymbol] = useState<string>("TOKEN");
  const [countdown, setCountdown] = useState<{h:string, m:string, s:string, isZero: boolean}>({h:"00", m:"00", s:"00", isZero: false});
  const [holdersPage, setHoldersPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [notification, setNotification] = useState<{show: boolean, type: 'error' | 'success' | 'info', title: string, message: string}>({ show: false, type: 'info', title: '', message: '' });
  const [resultModal, setResultModal] = useState<{show: boolean, mode: 'winner' | 'loser' | 'guest', isWinner: boolean, amount: string, winnerAddress: string, txHash: string}>({ show: false, mode: 'guest', isWinner: false, amount: '0', winnerAddress: '', txHash: '' });
  const [recycleAddr, setRecycleAddr] = useState("");
  const [cleanupProgress, setCleanupProgress] = useState<{remaining: number, percent: number} | null>(null);
  const [pendingDetails, setPendingDetails] = useState<{amount: string, since: number, canRecycle: boolean, recycleTime: number} | null>(null);

  const lastProcessedRequestId = useRef<string | null>(null);
  const previousInProgress = useRef<boolean>(false);
  const isInitialLoad = useRef<boolean>(true);
  const currentTimeRef = useRef<number>(Math.floor(Date.now() / 1000));

  const readOnlyProvider = useMemo(() => new ethers.JsonRpcProvider(BSC_TESTNET_RPC, {
      chainId: 97,
      name: 'bsc-testnet'
  }), []);
  
  const readOnlyContract = useMemo(() => new ethers.Contract(CONTRACT_ADDRESS, LUCKY_LOTTERY_ABI, readOnlyProvider), [readOnlyProvider]);

  const showNotification = useCallback((type: 'error' | 'success' | 'info', title: string, message: string) => { setNotification({ show: true, type, title, message }); }, []);

  // Timer for current time update
  useEffect(() => {
    const timer = setInterval(() => {
        currentTimeRef.current = Math.floor(Date.now() / 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasSufficientBalance = useMemo(() => {
    if (!userInfo || !config) return false;
    try {
      return BigInt(userInfo.walletBalance) >= BigInt(config.minHolding);
    } catch (e) {
      return false;
    }
  }, [userInfo, config]);

  // 检测钱包插件
  useEffect(() => {
    const detect = () => {
      const providers = (window as any).ethereum?.providers || [(window as any).ethereum];
      const found = new Set<string>();
      SUPPORTED_WALLETS.forEach(w => {
        const isFound = providers.some((p: any) => p?.[w.detectFlag]);
        if (isFound) found.add(w.id);
      });
      if ((window as any).BinanceChain) found.add('binance');
      setDetectedWallets(found);
    };
    detect();
    window.addEventListener('ethereum#initialized', detect);
    return () => window.removeEventListener('ethereum#initialized', detect);
  }, []);

  // 自动连接逻辑
  useEffect(() => {
    const autoConnect = async () => {
      const storedConnected = localStorage.getItem(STORAGE_KEY);
      if (storedConnected === "true" && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            const network = await provider.getNetwork();
            if (network.chainId.toString() !== BigInt(CHAIN_ID).toString()) {
               showNotification('info', '网络不匹配', '当前未连接到 BSC 测试网，请手动切换。');
            }
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (error) {
          console.error("Auto connect failed:", error);
        }
      }
    };
    autoConnect();
  }, [showNotification]);

  // 监听钱包账户切换
  useEffect(() => {
    if ((window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          localStorage.setItem(STORAGE_KEY, "true");
          showNotification('info', '账户已切换', `当前账户: ${accounts[0].slice(0, 6)}...`);
        } else {
          setAccount(null);
          localStorage.removeItem(STORAGE_KEY);
          showNotification('info', '连接断开', '钱包已断开连接');
        }
      };
      const handleChainChanged = () => window.location.reload();
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('chainChanged', handleChainChanged);
      return () => {
        try {
            if ((window as any).ethereum.removeListener) {
                (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
                (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
            }
        } catch(e) {}
      };
    }
  }, [showNotification]);

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
      
      if (records.length > 0) {
        const latest = records[0];
        if (isInitialLoad.current) { 
            lastProcessedRequestId.current = latest.requestId; 
            isInitialLoad.current = false; 
            return; 
        }
        if (latest.requestId !== lastProcessedRequestId.current) {
          lastProcessedRequestId.current = latest.requestId;
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
      const c = await readOnlyContract.getConfig().catch((e: any) => { console.error("Config error", e); throw e; });
      const currentConfig = {
        tokenAddress: c.tokenAddr, 
        linkToken: c.linkAddr,
        swapRouter: c.routerAddr,
        weth: c.wbnbAddr,
        quoter: c.quoterAddr,
        minHolding: c.minHold.toString(),
        fullRewardHolding: c.fullHold.toString(), 
        lotteryInterval: Number(c.koiInterval),
        maxHolders: Number(c.maxH), 
        callbackGasLimit: Number(c.gasLimit),
        tokenSet: c.tokenIsSet
      };
      setConfig(currentConfig);

      if (c.tokenIsSet && c.tokenAddr !== ethers.ZeroAddress) {
          const tokenContract = new ethers.Contract(c.tokenAddr, ERC20_ABI, readOnlyProvider);
          try {
             const [sym, dec] = await Promise.all([tokenContract.symbol(), tokenContract.decimals()]);
             setTokenSymbol(sym);
             setTokenDecimals(Number(dec));
          } catch(e) { setTokenSymbol("TOKEN"); setTokenDecimals(18); }
      }

      const [s, l, rawBalance, clProg, actualPool, trigStatusDetails, gasRewards] = await Promise.all([
        readOnlyContract.getContractStats().catch((e: any) => { console.error("Stats error", e); throw e; }),
        readOnlyContract.getLinkStats(),
        readOnlyProvider.getBalance(CONTRACT_ADDRESS),
        readOnlyContract.getCleanupProgress().catch(() => null),
        readOnlyContract.getActualKoiPool().catch(() => BigInt(0)),
        readOnlyContract.getTriggerStatusDetails(),
        readOnlyContract.getGasRewardStats()
      ]);
      
      if (clProg) setCleanupProgress({ remaining: Number(clProg.remaining), percent: Number(clProg.pct) });
      
      // Update logic for detecting completion of lottery
      if (previousInProgress.current && !s.inProg) setTimeout(fetchHistoryAndDetectWinner, 2000);
      previousInProgress.current = s.inProg;

      setStats({
        holderCount: Number(s.holderCnt), 
        lotteryPool: ethers.formatEther(s.pool),
        actualLotteryPool: ethers.formatEther(actualPool), 
        nextLotteryTime: Number(s.nextTime), 
        totalLotteries: Number(s.lotteries),
        totalRewards: ethers.formatEther(s.rewards), 
        totalPending: ethers.formatEther(s.pendingTotal),
        canTrigger: s.canTrig, 
        inProgress: s.inProg, 
        contractTotal: ethers.formatEther(rawBalance)
      });
      
      setTriggerStatus(Number(trigStatusDetails.status));

      setGasRewardStats({
        totalPaid: ethers.formatEther(gasRewards.total),
        currentBounty: ethers.formatEther(gasRewards.current),
        baseReward: ethers.formatEther(gasRewards.base),
        maxReward: ethers.formatEther(gasRewards.max)
      });

      setLinkStats({
        contractLinkBalance: ethers.formatEther(l.contractBal), subscriptionBalance: ethers.formatEther(l.subBal),
        totalLinkBalance: ethers.formatEther(l.totalBal), availableEthForLink: ethers.formatEther(l.availEth),
        needsBuy: l.needsBuy, needsTopUp: l.hasTopUp, totalLinkPurchased: ethers.formatEther(l.purchased),
        totalEthSpent: ethers.formatEther(l.spent)
      });

      if (c.tokenIsSet && c.tokenAddr !== ethers.ZeroAddress) {
        if (account) {
          const tokenContract = new ethers.Contract(c.tokenAddr, ERC20_ABI, readOnlyProvider);
          const [u, walletBal, uTrigger] = await Promise.all([
            readOnlyContract.getUserInfo(account).catch(() => ({ registered: false, balance: 0, rewardPct: 0, valid: false, won: 0, winCnt: 0, pendingAmt: 0 })),
            tokenContract.balanceOf(account).catch(() => BigInt(0)),
            readOnlyContract.getUserTriggerInfo(account).catch(() => ({ triggers: 0, gasRewards: 0 }))
          ]);
          
          setUserInfo({
            registered: u.registered, 
            currentBalance: u.balance.toString(),
            walletBalance: walletBal.toString(), 
            rewardPercentage: Number(u.rewardPct), 
            currentlyValid: u.valid,
            totalWon: ethers.formatEther(u.won), 
            winCount: Number(u.winCnt),
            pending: ethers.formatEther(u.pendingAmt),
            triggers: Number(uTrigger.triggers),
            gasRewardsCollected: ethers.formatEther(uTrigger.gasRewards)
          });
        }

        const hList = await readOnlyContract.getHolders(holdersPage * PAGE_SIZE, PAGE_SIZE);
        const tokenContract = new ethers.Contract(c.tokenAddr, ERC20_ABI, readOnlyProvider);
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
               } catch(e) { console.error("Event fetch failed", e); }
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
    const poll = setInterval(fetchData, (stats?.inProgress || countdown.isZero) ? 2000 : 15000);
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

  // 检查回收地址详情
  useEffect(() => {
      if(activeTab === 'admin' && ethers.isAddress(recycleAddr)) {
          readOnlyContract.getPendingDetails(recycleAddr).then((res: any) => {
              setPendingDetails({ amount: ethers.formatEther(res.amount), since: Number(res.since), canRecycle: res.canRecycle, recycleTime: Number(res.recycleTime) });
          }).catch(() => setPendingDetails(null));
      } else { setPendingDetails(null); }
  }, [activeTab, recycleAddr, readOnlyContract]);

  const connectSpecificWallet = async (wallet: WalletProvider) => {
    let ethereum = (window as any).ethereum;
    if (!ethereum) { if (wallet.id === 'binance') ethereum = (window as any).BinanceChain; }
    if (ethereum?.providers) { ethereum = ethereum.providers.find((p: any) => p[wallet.detectFlag]) || ethereum; }
    if (!ethereum || (wallet.id !== 'binance' && !ethereum[wallet.detectFlag] && !ethereum.isMetaMask)) {
        return showNotification('info', '未检测到钱包', `请先安装 ${wallet.name} 扩展。`);
    }
    setLoading(true);
    try {
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      if (chainId !== CHAIN_ID) {
        try { await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID }] }); } 
        catch (switchError: any) {
            if (switchError.code === 4902) {
                await ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: CHAIN_ID, chainName: 'BSC Testnet', nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 }, rpcUrls: [BSC_TESTNET_RPC], blockExplorerUrls: ['https://testnet.bscscan.com'] }] });
            } else throw switchError;
        }
      }
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]); localStorage.setItem(STORAGE_KEY, "true"); setIsModalOpen(false);
      showNotification('success', '接入成功', `已通过 ${wallet.name} 安全接入协议。`);
    } catch (err: any) { showNotification('error', '接入受阻', parseRpcError(err).message); } finally { setLoading(false); }
  };

  const handleDisconnect = () => { setAccount(null); localStorage.removeItem(STORAGE_KEY); showNotification('info', '已断开', '您已断开钱包连接'); };

  const executeTx = async (method: string, args: any[] = []) => {
    const { ethereum } = window as any;
    if (!ethereum || !account) return setIsModalOpen(true);
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const signedContract = new ethers.Contract(CONTRACT_ADDRESS, LUCKY_LOTTERY_ABI, signer);
      const tx = await signedContract[method](...args);
      showNotification('info', '上链执行中', '正在通过智能合约执行您的请求...');
      await tx.wait(); fetchData();
      showNotification('success', '执行成功', '合约状态已在链上完成同步。');
    } catch (err: any) { const parsed = parseRpcError(err); showNotification('error', parsed.title, parsed.message); } finally { setLoading(false); }
  };

  const sortedWallets = useMemo(() => {
    return [...SUPPORTED_WALLETS].sort((a, b) => {
        const aInstalled = detectedWallets.has(a.id);
        const bInstalled = detectedWallets.has(b.id);
        if (aInstalled && !bInstalled) return -1;
        if (!aInstalled && bInstalled) return 1;
        return 0;
    });
  }, [detectedWallets]);

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <Notification show={notification.show} type={notification.type} title={notification.title} message={notification.message} onClose={() => setNotification(p => ({...p, show: false}))} />
      <ResultModal show={resultModal.show} mode={resultModal.mode} isWinner={resultModal.isWinner} amount={resultModal.amount} winnerAddress={resultModal.winnerAddress} txHash={resultModal.txHash} onClose={() => setResultModal(p => ({...p, show: false}))} />

      <nav className="sticky top-0 z-40 glass-card border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-y-4">
            <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group select-none" onClick={() => setActiveTab('stats')}>
                <div className="bg-[#0c0c0e] border border-white/5 p-1 rounded-xl sm:rounded-2xl shadow-2xl relative transition-transform group-hover:scale-105 duration-500 shrink-0">
                    <div className="block sm:hidden"><LuckyLogo size={36} /></div>
                    <div className="hidden sm:block"><LuckyLogo size={46} /></div>
                    <div className="absolute inset-0 bg-rose-500/10 blur-2xl rounded-full animate-pulse -z-10" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg sm:text-2xl font-black text-white tracking-tighter uppercase italic pr-2 leading-none group-hover:text-rose-400 transition-colors">幸运锦鲤</span>
                  <span className="text-[7px] sm:text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-1 pr-2">LUCKY KOI PROTOCOL</span>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-6 order-2 xl:order-3 shrink-0">
                {account ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:block px-5 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-[11px] font-black uppercase tracking-wider text-zinc-400">{account.slice(0, 6)}...{account.slice(-4)}</div>
                    <button onClick={handleDisconnect} className="p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-rose-500 active:bg-zinc-800 shadow-inner transition-all"><Power size={14}/></button>
                  </div>
                ) : (
                  <button onClick={() => setIsModalOpen(true)} disabled={loading} className={`flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-wider action-button ${loading && 'opacity-75 cursor-not-allowed'}`}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : '开启鸿运之旅'}
                  </button>
                )}
            </div>
            <div className="order-3 xl:order-2 w-full xl:w-auto overflow-x-auto no-scrollbar -mx-4 px-4 xl:mx-0 xl:px-0">
               <div className="flex items-center gap-2 p-1 bg-zinc-950/50 xl:bg-zinc-950/80 rounded-xl border border-white/5 xl:border-white/5 shadow-inner min-w-max mx-auto">
                  <NavTab active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="鸿运面板" icon={<LayoutDashboard size={14}/>} />
                  <NavTab active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="瑞气英雄" icon={<History size={14}/>} />
                  <NavTab active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} label="跃迁法则" icon={<FileText size={14}/>} />
                  <NavTab active={activeTab === 'holders'} onClick={() => setActiveTab('holders')} label="锦鲤名册" icon={<Shield size={14}/>} />
                  <NavTab active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} label="协议中枢" icon={<Settings size={14}/>} />
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {activeTab === 'stats' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="relative rounded-[2.5rem] sm:rounded-[3rem] glass-card p-6 sm:p-10 border border-white/10 shadow-2xl overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none scale-125"><LuckyLogo size={500} /></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 pb-6">
                  <div className="space-y-6 text-center md:text-left flex-1 w-full">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest italic pr-2"><Globe size={12}/> 实时瑞气总奖池</div>
                    <div className="space-y-1">
                      <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] italic pr-2">当前可分配福泽 (BNB)</p>
                      <div className="flex items-baseline justify-center md:justify-start gap-3 flex-wrap">
                        <h1 className="text-4xl sm:text-7xl font-black text-white stat-glow tabular-nums tracking-tighter pr-6 pb-2 leading-tight">
                            {formatBNBValue(stats?.actualLotteryPool || "0")}
                        </h1>
                        <span className="text-lg sm:text-xl font-black accent-gradient uppercase italic pr-2">BNB</span>
                      </div>
                      {history.length > 0 && (
                        <div className="pt-3 flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-lg shadow-inner">
                              <Trophy size={12} className="text-amber-500" />
                              <span className="text-[9px] font-black text-zinc-500 uppercase italic tracking-wider">最新锦鲤</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-bold text-zinc-300">{history[0].winner.slice(0, 6)}...{history[0].winner.slice(-4)}</span>
                              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 tabular-nums shadow-[0_0_10px_rgba(16,185,129,0.2)]">+{formatBNBValue(history[0].reward)} BNB</span>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flip-container w-full md:w-[320px] h-[200px] mb-8 md:mb-0">
                    <div className={`flip-card w-full h-full ${(stats?.inProgress || countdown.isZero) ? 'flipped' : ''}`}>
                      <div className="flip-card-front bg-zinc-950/80 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col justify-between">
                        <div className="flex items-center justify-between"><p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 italic pr-2"><Clock size={10}/> 下轮甄选倒计时</p><StatusBadge active={stats?.canTrigger || false} inProgress={false} statusId={triggerStatus} /></div>
                        <div className="flex gap-2 sm:gap-3"><DigitBox label="小时" value={countdown.h} /><DigitBox label="分钟" value={countdown.m} /><DigitBox label="秒数" value={countdown.s} /></div>
                      </div>
                      <div className="flip-card-back bg-rose-500/10 p-8 rounded-[2.5rem] border border-rose-500/30 shadow-[0_0_50px_rgba(225,29,72,0.2)] flex flex-col justify-center items-center gap-4 text-center">
                         <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40 animate-pulse"><Waves size={32} className="text-white animate-spin-slow" /></div>
                         <div className="space-y-1"><p className="text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse pr-2">Chainlink VRF 正在甄选锦鲤...</p></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pt-10 mt-10 border-t border-white/5 relative z-10">
                  <HeroStat icon={<TrendingUp size={14}/>} label="已跃迁锦鲤" value={stats?.totalLotteries || 0} />
                  <HeroStat icon={<Coins size={14}/>} label="合约账面总额" value={`${formatBNBValue(stats?.contractTotal || 0)}`} />
                  <HeroStat icon={<Users size={14}/>} label="当前瑞气席位" value={stats?.holderCount || 0} />
                  <HeroStat icon={<ShieldCheck size={14}/>} label="物理随机保障" value="VRF V2.5" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardIconBox icon={<Target size={20}/>} title="终身参与资格" desc="一币双吃。持有 10,000 BUSD 不仅是资产，更是永续彩票。一次注册，终身自动参与每轮抽奖，资金零损耗，权益全掌控。" color="emerald" />
                <CardIconBox icon={<Zap size={20}/>} title="协议自治系统" desc="全自动去中心化。Chainlink Automation 7x24小时链上巡航，触发、开奖、派发全流程自动执行，告别中心化黑箱，代码即信用。" color="violet" />
                <CardIconBox icon={<ShieldCheck size={20}/>} title="可验证真随机" desc="真随机数引擎。集成 Chainlink VRF V2.5 物理级随机源，提供链上可验证的加密证明，确保每一次锦鲤诞生都绝对公平、不可预测。" color="rose" />
              </div>
            </div>
          )}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-black text-white flex items-center gap-3 ml-2 uppercase italic pr-2"><History className="text-rose-500" /> 历届锦鲤芳名录 (最近 5000 区块)</h2>
              <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                        <th className="px-8 py-5 italic">瑞气锦鲤钱包</th><th className="px-8 py-5 text-right italic">斩获福泽</th><th className="px-8 py-5 text-right italic">持仓权重</th><th className="px-8 py-5 text-right italic">链上凭据</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                      {history.length > 0 ? history.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE).map((rec, i) => (
                        <tr key={i} className="hover:bg-rose-500/5 transition-colors group">
                          <td className="px-8 py-4 text-zinc-300 font-bold">{rec.winner}</td>
                          <td className="px-8 py-4 text-right font-black text-emerald-400">{formatBNBValue(rec.reward)} BNB</td>
                          <td className="px-8 py-4 text-right text-rose-500 font-black pr-12">{rec.percentage}%</td>
                          <td className="px-8 py-4 text-right"><a href={`https://testnet.bscscan.com/tx/${rec.txHash}`} target="_blank" rel="noreferrer" className="inline-flex p-1.5 bg-zinc-950 border border-white/5 rounded-lg text-zinc-500 hover:text-white transition-all shadow-inner"><ExternalLink size={12}/></a></td>
                        </tr>
                      )) : <tr><td colSpan={4} className="text-center py-20 text-zinc-700 italic font-black uppercase">历史长河加载中...</td></tr>}
                    </tbody>
                  </table>
                </div>
                <Pagination current={historyPage} total={Math.ceil(history.length / PAGE_SIZE)} onChange={setHistoryPage} />
              </div>
            </div>
          )}
          {activeTab === 'rules' && (
             <div className="space-y-8 animate-in fade-in pb-16">
               <div className="space-y-4 px-2">
                 <h2 className="text-3xl font-black text-white uppercase italic pr-4 flex items-center gap-3"><Scroll className="text-rose-500" size={32} /> 锦鲤社区治理白皮书</h2>
                 <p className="text-xs text-zinc-500 font-bold leading-relaxed max-w-3xl">Lucky Koi Protocol 是一个完全去中心化的链上实验。代码即法律 (Code is Law)。所有规则由智能合约强制执行，没有任何管理员可以干预结果。社区成员共同维护协议的公平性与活力。</p>
               </div>
               <div className="grid grid-cols-1 gap-6">
                  <div className="glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Fingerprint size={120} /></div>
                      <div className="relative z-10 space-y-4">
                          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-lg font-black italic">01</div><h3 className="text-lg font-black text-white uppercase italic">锦鲤身份认证 (Identity)</h3></div>
                          <div className="space-y-3 pl-14">
                              <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">协议不售卖彩票。参与资格完全基于您的社区忠诚度（持仓）。</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5"><h4 className="text-[9px] text-emerald-500 font-black uppercase italic mb-2">准入门槛</h4><p className="text-[10px] text-zinc-300">钱包需实时持有至少 <span className="text-white font-black">10,000 BUSD</span> (以合约配置为准)。</p></div>
                                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5"><h4 className="text-[9px] text-emerald-500 font-black uppercase italic mb-2">永久有效</h4><p className="text-[10px] text-zinc-300">手动执行一次 <span className="text-white font-black">Register</span> 上链操作后，只要持仓不低于门槛，资格永久保留。</p></div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-violet-500/30 transition-colors">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Dna size={120} /></div>
                      <div className="relative z-10 space-y-4">
                          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/20 shadow-lg font-black italic">02</div><h3 className="text-lg font-black text-white uppercase italic">真随机与唤醒悬赏 (Entropy & Bounty)</h3></div>
                          <div className="space-y-3 pl-14">
                              <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">拒绝伪随机。协议集成 Chainlink VRF V2.5 直接从链下预言机获取不可预测的随机数。为了激励社区自治，触发开奖者将获得 BNB 补偿。</p>
                              <div className="bg-violet-950/20 p-4 rounded-xl border border-violet-500/20 mb-2">
                                  <h4 className="text-[9px] text-violet-500 font-black uppercase italic mb-2 flex items-center gap-2"><Fuel size={12}/> 燃料补偿机制</h4>
                                  <p className="text-[10px] text-zinc-300">每轮倒计时结束后，首位点击“唤醒锦鲤”的用户，合约将自动向其支付 <span className="text-white font-black">0.001 - 0.005 BNB</span> 作为 Gas 费补偿。人人为我，我为人人。</p>
                              </div>
                              <ul className="space-y-2">
                                  <li className="flex items-center gap-2 text-[10px] text-zinc-300"><div className="w-1.5 h-1.5 bg-violet-500 rounded-full"></div> 随机数回调交易包含加密证明，数学上不可篡改。</li>
                                  <li className="flex items-center gap-2 text-[10px] text-zinc-300"><div className="w-1.5 h-1.5 bg-violet-500 rounded-full"></div> 自动 Swap 维护：合约会自动将闲置的 ETH 兑换为 LINK 代币以维持 VRF 服务。</li>
                              </ul>
                          </div>
                      </div>
                  </div>
                  <div className="glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Scale size={120} /></div>
                      <div className="relative z-10 space-y-4">
                          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-lg font-black italic">03</div><h3 className="text-lg font-black text-white uppercase italic">福泽动态分配 (Distribution)</h3></div>
                          <div className="space-y-3 pl-14">
                              <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">中奖并非终点，持仓决定高度。奖金比例由您的持仓量动态决定，鼓励社区做大做强。</p>
                              <div className="p-4 bg-zinc-950/80 rounded-xl border border-white/5 font-mono text-[10px] text-zinc-400 space-y-1">
                                  <p className="text-amber-500 font-black mb-2">// 智能合约核心算法</p>
                                  <p>Min_Reward = Pool * 50%; <span className="text-zinc-600">// 基础持仓 (10k)</span></p>
                                  <p>Max_Reward = Pool * 100%; <span className="text-zinc-600">// 满额持仓 (20k+)</span></p>
                                  <p className="mt-2 text-zinc-500 italic">Example: 若奖池 10 BNB，您持有 15k BUSD，您将获得约 7.5 BNB。</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-rose-500/30 transition-colors">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Siren size={120} /></div>
                      <div className="relative z-10 space-y-4">
                          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-lg font-black italic">04</div><h3 className="text-lg font-black text-white uppercase italic">持仓审计与熔断 (Governance)</h3></div>
                          <div className="space-y-3 pl-14">
                              <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">为了维护社区公平，防止投机者注册后抛售代币占用抽奖名额，协议引入了“黑暗森林”法则。</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-500/20"><h4 className="text-[9px] text-rose-500 font-black uppercase italic mb-2">审计 (Audit)</h4><p className="text-[10px] text-zinc-300">任何人都可以在“锦鲤名册”中发起审计。若某地址持仓低于门槛，将被标记。</p></div>
                                  <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-500/20"><h4 className="text-[9px] text-rose-500 font-black uppercase italic mb-2">熔断 (Cleanup)</h4><p className="text-[10px] text-zinc-300">被标记用户有 <span className="text-white font-black">1 小时宽限期</span> 补足持仓。超时未补，任何人可将其从名册中永久移除。</p></div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-sky-500/30 transition-colors">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Gavel size={120} /></div>
                      <div className="relative z-10 space-y-4">
                          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20 shadow-lg font-black italic">05</div><h3 className="text-lg font-black text-white uppercase italic">滞留资产回收 (Recycle)</h3></div>
                          <div className="space-y-3 pl-14">
                              <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">若中奖者接收转账失败（如合约被拉黑、Gas不足等），奖金将进入“待领池”。待领资金仅保留 <span className="text-white font-black">30 天</span>。30 天后，任何人可调用回收函数，将这笔资金重新注入总奖池。</p>
                          </div>
                      </div>
                  </div>
               </div>
            </div>
          )}
          {activeTab === 'holders' && (
             <div className="space-y-6 animate-in fade-in">
               <h2 className="text-2xl font-black text-white ml-2 uppercase italic pr-4">全网锦鲤名录 (持仓审计公示)</h2>
               <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        <th className="px-8 py-5 italic">锦鲤地址标识</th><th className="px-8 py-5 text-right italic">实时钱包余额 ({tokenSymbol})</th><th className="px-8 py-5 text-right italic">社区治理</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                      {holdersData.length > 0 ? holdersData.map((h, i) => {
                          const balanceBN = BigInt(h.balance);
                          const minHoldingBN = config ? BigInt(config.minHolding) : BigInt(0);
                          const isRisk = balanceBN < minHoldingBN;
                          const inGracePeriod = !h.isValid && h.graceEnd > currentTimeRef.current;
                          let buttonContent = <><ShieldCheck size={10} /> 持仓合规</>;
                          let buttonClass = "opacity-30 cursor-not-allowed text-zinc-600 border-zinc-900";
                          let isDisabled = true;
                          let clickAction = () => {};

                          if (isRisk) {
                              if (h.isValid) {
                                  buttonContent = <><AlertTriangle size={10} /> 发起审计</>;
                                  buttonClass = "text-amber-500 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500 hover:text-white active:scale-95";
                                  isDisabled = false;
                                  clickAction = () => executeTx('reportInvalid', [h.address]);
                              } else if (inGracePeriod) {
                                  buttonContent = <><Timer size={10} className="animate-pulse"/> 宽限期中</>;
                                  buttonClass = "text-sky-500 border-sky-500/20 bg-sky-500/10 cursor-not-allowed";
                                  isDisabled = true;
                              } else {
                                  buttonContent = <><Trash2 size={10} /> 清理该地址</>;
                                  buttonClass = "text-rose-500 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white active:scale-95";
                                  isDisabled = false;
                                  clickAction = () => executeTx('reportInvalid', [h.address]); 
                              }
                          }
                          return (
                            <tr key={i} className={`hover:bg-white/5 transition-colors group ${isRisk ? (inGracePeriod ? 'bg-sky-500/5' : 'bg-rose-500/5') : ''}`}>
                              <td className="px-8 py-4 text-zinc-300 font-bold flex items-center">{h.address} {isRisk && <RiskBadge />}</td>
                              <td className="px-8 py-4 text-right"><span className={`font-black text-xs tabular-nums ${isRisk ? 'text-rose-400' : 'text-emerald-400'}`}>{formatTokens(h.balance, tokenDecimals)}</span></td>
                              <td className="px-8 py-4 text-right"><button disabled={loading || isDisabled} onClick={clickAction} className={`px-4 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all shadow-inner flex items-center gap-2 ml-auto ${buttonClass}`}>{loading && !isDisabled ? <Loader2 size={10} className="animate-spin"/> : buttonContent}</button></td>
                            </tr>
                          );
                      }) : <tr><td colSpan={3} className="text-center py-20 text-zinc-700 italic font-black uppercase">同步区块链持仓数据中...</td></tr>}
                    </tbody>
                  </table>
                </div>
                <Pagination current={holdersPage} total={Math.ceil((stats?.holderCount || 0) / PAGE_SIZE)} onChange={setHoldersPage} />
              </div>
            </div>
          )}
          {activeTab === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in pb-16">
               <AdminSection loading={loading} title="Chainlink 预言机维护" stats={[{ label: "合约内 LINK 余额", value: `${formatBNBValue(linkStats?.contractLinkBalance || '0')} LINK` }, { label: "VRF 订阅池余额", value: `${formatBNBValue(linkStats?.subscriptionBalance || '0')} LINK` }]} onAction={executeTx} actions={[{ label: "智能维护 (自动 Swap ETH->LINK)", method: "maintainLink" }, { label: "奖池原生解包 (Unwrap WBNB)", method: "unwrapAllWBNB" }]} />
               <AdminSection loading={loading} title="悬赏猎人公报 (Trigger Stats)" stats={[{ label: "已支付 Gas 赏金", value: `${formatBNBValue(gasRewardStats?.totalPaid || '0')} BNB` }, { label: "当前基础赏金", value: `${formatBNBValue(gasRewardStats?.baseReward || '0')} BNB` }]} actions={[{ label: "手动触发结算 (赚取赏金)", method: "triggerKoi" }, { label: `批量清理无效持仓 ${cleanupProgress && cleanupProgress.percent > 0 && cleanupProgress.percent < 100 ? `(${cleanupProgress.percent}%)` : ''}`, method: "cleanup", args: [50] }, { label: "强制重置异常请求", method: "cancelStuckKoi" }]} onAction={executeTx} />
               
               <div className="md:col-span-2 glass-card rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                 <h3 className="text-lg font-black text-white uppercase italic pr-4 flex items-center gap-2"><RotateCcw size={18} className="text-rose-500"/> 过期奖金安全回收 (社区悬赏)</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-rose-500 transition-colors"><Search size={14}/></div>
                            <input type="text" value={recycleAddr} onChange={(e) => setRecycleAddr(e.target.value)} placeholder="输入待查钱包地址..." disabled={loading} className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-mono text-zinc-300 focus:outline-none focus:border-rose-500/50 transition-all shadow-inner disabled:opacity-50"/>
                        </div>
                        {pendingDetails ? (
                             <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl space-y-2">
                                 <div className="flex justify-between text-[9px] uppercase font-black text-zinc-500 italic"><span>待领金额</span><span className="text-emerald-400">{pendingDetails.amount} BNB</span></div>
                                 <div className="flex justify-between text-[9px] uppercase font-black text-zinc-500 italic"><span>产生时间</span><span>{new Date(pendingDetails.since * 1000).toLocaleString()}</span></div>
                                 <div className="flex justify-between text-[9px] uppercase font-black text-zinc-500 italic"><span>回收解锁</span><span>{new Date(pendingDetails.recycleTime * 1000).toLocaleString()}</span></div>
                                 <div className={`mt-2 text-center p-2 rounded-lg text-[9px] font-black uppercase italic border ${pendingDetails.canRecycle ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>{pendingDetails.canRecycle ? '已解锁，可执行回收' : '锁定期内，无法回收'}</div>
                             </div>
                        ) : (<div className="p-4 text-center text-[9px] text-zinc-600 font-black uppercase italic">输入地址以查询待领状态</div>)}
                    </div>
                    <div className="flex flex-col gap-4 h-full">
                         <div className="flex-1 p-4 bg-rose-900/10 border border-rose-500/10 rounded-2xl">
                             <p className="text-[10px] text-zinc-400 leading-relaxed font-bold"><Flame size={12} className="inline text-rose-500 mr-1"/>为了维持奖池活力，任何超过 <span className="text-white">30 天</span> 未领取的奖金，均可被任何人触发回收。回收的 BNB 将直接注入下轮奖池。</p>
                         </div>
                         <button disabled={loading || !pendingDetails?.canRecycle} onClick={() => { if (!ethers.isAddress(recycleAddr)) return showNotification('error', '地址错误', '请输入合法的钱包地址。'); executeTx('recycleStuckPending', [recycleAddr]); }} className={`w-full py-4 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black text-zinc-400 uppercase italic shadow-lg flex items-center justify-center gap-2 ${loading || !pendingDetails?.canRecycle ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:bg-rose-500 transition-all active:scale-95'}`}>{loading && <Loader2 size={12} className="animate-spin"/>} 确认执行回收</button>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-4 sticky top-32">
          <div className="glass-card rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 border-t-8 border-rose-500 shadow-3xl overflow-hidden group space-y-8">
            <h3 className="text-xl font-black text-white flex items-center justify-between uppercase italic pr-4">个人锦鲤终端 <Activity size={16} className="text-rose-500 animate-pulse" /></h3>
            
            {!account ? (
              <div className="space-y-6 py-6 animate-in slide-in-from-bottom-5 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 to-transparent rounded-[2rem] pointer-events-none" />
                <div className="relative z-10 mx-auto w-max px-4 py-1.5 bg-rose-500/20 border border-rose-500/30 rounded-full flex items-center gap-2 animate-pulse"><ShieldAlert size={12} className="text-rose-500" /><span className="text-[9px] font-black text-rose-500 uppercase italic tracking-wider">参与资格未激活</span></div>
                <div className="relative w-24 h-24 mx-auto group cursor-pointer" onClick={() => !loading && setIsModalOpen(true)}>
                    <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping" />
                    <div className="absolute inset-0 bg-rose-500/10 rounded-full animate-pulse delay-75" />
                    <div className={`relative z-10 w-full h-full bg-[#0c0c0e] rounded-full flex items-center justify-center border-2 border-dashed border-rose-500/30 shadow-2xl transition-transform duration-500 group-hover:border-rose-500 ${!loading && 'group-hover:scale-110'}`}><Wallet className="text-rose-500" size={36} /></div>
                    <div className="absolute -bottom-1 -right-1 z-50 bg-rose-500 text-white text-[8px] font-black px-3 py-1.5 rounded-xl border-2 border-[#0c0c0e] shadow-xl animate-bounce">必需</div>
                </div>
                <div className="text-center space-y-3 relative z-10 px-2"><h4 className="text-white font-black uppercase italic tracking-widest text-sm">请先连接钱包</h4><p className="text-[10px] text-zinc-400 font-bold leading-relaxed">您当前处于<span className="text-rose-500">离线状态</span>。智能合约无法读取您的持仓数据，<br/><span className="text-white underline decoration-rose-500/50 underline-offset-4">无法将您列入抽奖名单</span>。</p></div>
                <div className="grid grid-cols-2 gap-3 px-2">
                    <div className="bg-zinc-950/80 border border-white/5 p-3 rounded-xl flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500"><Search size={14}/></div><div className="text-left"><div className="text-[9px] text-white font-black uppercase italic">持仓验证</div><div className="text-[8px] text-zinc-600 font-black">自动扫描余额</div></div></div>
                    <div className="bg-zinc-950/80 border border-white/5 p-3 rounded-xl flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500"><Sparkles size={14}/></div><div className="text-left"><div className="text-[9px] text-white font-black uppercase italic">资格激活</div><div className="text-[8px] text-zinc-600 font-black">获取入场券</div></div></div>
                </div>
                <button onClick={() => setIsModalOpen(true)} disabled={loading} className={`w-full action-button py-5 rounded-2xl text-[11px] font-black uppercase italic flex items-center justify-center gap-2 shadow-rose-500/20 shadow-xl relative overflow-hidden group transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-rose-500/40 active:scale-95'}`}><span className="relative z-10 flex items-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <>连接钱包并激活资格 <ArrowRightCircle size={14} /></>}</span></button>
              </div>
            ) : !userInfo?.registered ? (
              <div className="space-y-8 py-4 animate-in fade-in">
                <div className={`p-6 rounded-[2.5rem] border transition-all shadow-inner space-y-5 relative overflow-hidden ${hasSufficientBalance ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/10'}`}>
                   <div className="flex items-center justify-between"><span className="text-[9px] font-black text-zinc-600 uppercase italic">瑞气资格侦测</span>{hasSufficientBalance ? (<span className="flex items-center gap-1.5 text-[8px] font-black text-emerald-500 uppercase italic"><CheckCircle2 size={10}/> 资格已就绪</span>) : (<span className="flex items-center gap-1.5 text-[8px] font-black text-rose-500 uppercase italic"><AlertCircle size={10}/> 余额不足</span>)}</div>
                   <div className="space-y-1"><p className="text-[9px] text-zinc-600 font-black uppercase italic">当前钱包持仓 ({tokenSymbol})</p><div className="flex items-baseline gap-2"><h4 className="text-4xl font-black text-white tabular-nums tracking-tighter">{formatTokens(userInfo?.walletBalance, tokenDecimals)}</h4><span className="text-xs font-black text-zinc-700 uppercase italic">/ {config ? formatTokens(config.minHolding, tokenDecimals) : '--'}</span></div></div>
                </div>
                <div className="space-y-4">
                    <button onClick={() => executeTx('register')} disabled={!hasSufficientBalance || loading} className={`w-full py-5 rounded-2xl text-xs font-black uppercase italic transition-all shadow-lg flex items-center justify-center gap-3 ${hasSufficientBalance && !loading ? 'action-button active:scale-95' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'}`}>{loading ? <Loader2 size={14} className="animate-spin" /> : (<>{hasSufficientBalance ? '立即激活锦鲤身份' : '持仓达标后方可激活'}{hasSufficientBalance && <Sparkles size={14} className="animate-pulse" />}</>)}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in">
                <div className="p-5 bg-zinc-950 rounded-[1.8rem] border border-white/5 space-y-3 shadow-inner relative overflow-hidden">
                   <div className="flex items-center justify-between"><span className="text-[9px] font-black text-zinc-600 uppercase italic">实时探测余额</span><div className={`w-2 h-2 rounded-full ${userInfo.currentlyValid ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} /></div>
                   <div className="flex items-baseline gap-2"><h4 className="text-2xl font-black text-white tabular-nums tracking-tighter">{formatTokens(userInfo.walletBalance, tokenDecimals)}</h4><span className="text-[10px] font-black text-zinc-500 uppercase italic">{tokenSymbol}</span></div>
                </div>
                <div className="p-6 bg-zinc-950 rounded-[2rem] border border-white/5 space-y-5 shadow-inner">
                  <div className="flex justify-between items-end"><div className="space-y-1"><p className="text-zinc-600 text-[9px] font-black uppercase italic">瑞气分红权重</p><h4 className="text-4xl font-black text-white stat-glow tabular-nums pr-8 leading-none">{userInfo.rewardPercentage}%</h4></div><div className={`mb-1 px-3 py-1 rounded-full text-[8px] font-black uppercase italic border ${userInfo.currentlyValid ? 'text-emerald-500 border-emerald-500/20' : 'text-rose-500 border-rose-500/20'}`}>{userInfo.currentlyValid ? '收益激活' : '权重失效'}</div></div>
                  <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden shadow-inner"><div className="bg-gradient-to-r from-rose-500 to-violet-600 h-full transition-all duration-1000" style={{width: `${userInfo.rewardPercentage}%`}}></div></div>
                  {!userInfo.currentlyValid && (<div className="text-[8px] text-rose-500 font-black uppercase italic text-center bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">警告：持仓不足，面临 1 小时宽限期后被移除的风险</div>)}
                </div>
                {parseFloat(userInfo.pending) > 0 ? (
                   <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] space-y-5 shadow-inner">
                      <div className="space-y-1"><p className="text-emerald-500 text-[9px] font-black uppercase italic">福泽降临！待领奖金</p><h4 className="text-3xl font-black text-white tabular-nums pr-8 leading-none">{formatBNBValue(userInfo.pending)} <span className="text-xs opacity-50 italic">BNB</span></h4></div>
                      <button onClick={() => executeTx('claimPendingReward')} disabled={loading} className={`w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600 active:scale-95'}`}>{loading ? <Loader2 size={12} className="animate-spin" /> : '点击领取福泽'}</button>
                   </div>
                ) : (
                  <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[9px] text-zinc-600 font-black uppercase italic">锦鲤跃迁中，请保持持仓...</p></div>
                )}
                {/* User Community Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                   <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[8px] text-zinc-600 font-black uppercase mb-1 italic">锦鲤命中次数</p><p className="text-xs font-black text-white">{userInfo.winCount} 次</p></div>
                   <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[8px] text-zinc-600 font-black uppercase mb-1 italic">累计 Gas 赏金</p><p className="text-xs font-black text-amber-500">{formatBNBValue(userInfo.gasRewardsCollected)}</p></div>
                </div>
                <button onClick={() => executeTx('unregister')} disabled={loading} className={`w-full text-zinc-800 text-[9px] font-black uppercase tracking-[0.3em] transition-all text-center italic mt-2 flex items-center justify-center gap-2 ${loading ? 'cursor-not-allowed opacity-50' : 'hover:text-rose-500 active:scale-95'}`}>{loading && <Loader2 size={10} className="animate-spin" />} 注销锦鲤映射</button>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 flex flex-col md:flex-row gap-6">
        <AddressBox label="锦鲤代币CA" address={config?.tokenAddress || "..."} onCopy={(m) => showNotification('info', '复制成功', m)} explorerLink={`https://testnet.bscscan.com/address/${config?.tokenAddress}`} />
        <AddressBox label="奖池智能合约" address={CONTRACT_ADDRESS} onCopy={(m) => showNotification('info', '复制成功', m)} explorerLink={`https://testnet.bscscan.com/address/${CONTRACT_ADDRESS}`} />
      </div>

      <footer className="mt-20 border-t border-white/5 bg-[#08080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                    <LuckyLogo size={32} />
                    <div>
                        <h4 className="text-sm font-black text-white uppercase italic tracking-wider">Lucky Koi Protocol</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Automated Decentralized Lottery</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <a href="#" className="p-2 text-zinc-600 hover:text-white transition-colors"><Github size={18} /></a>
                    <a href="#" className="p-2 text-zinc-600 hover:text-sky-500 transition-colors"><Globe size={18} /></a>
                    <a href="#" className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"><Heart size={18} /></a>
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                <p>&copy; 2024 Lucky Koi Protocol. All rights reserved.</p>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500"/> Chainlink VRF Secured</span>
                    <span className="flex items-center gap-1.5"><Zap size={12} className="text-amber-500"/> BSC Testnet</span>
                </div>
            </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => !loading && setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-300 shadow-3xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-white uppercase italic pr-4">选择 Web3 钱包</h2><button onClick={() => setIsModalOpen(false)} disabled={loading} className="p-2 text-zinc-600 hover:text-white transition-colors disabled:opacity-30"><X size={20}/></button></div>
            <p className="text-[10px] font-black text-zinc-600 uppercase italic mb-6 leading-relaxed">协议支持多种主流 Web3 钱包安全接入。请确保您已切换至 BSC 测试网络。</p>
            <div className="space-y-3">
              {sortedWallets.map(wallet => (<WalletButton key={wallet.id} name={wallet.name} icon={wallet.icon} installed={detectedWallets.has(wallet.id)} onClick={() => connectSpecificWallet(wallet)} disabled={loading} />))}
            </div>
            <div className="mt-8 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10"><p className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest italic pr-2 text-center">当前网络：BSC TESTNET (CHAIN 97)</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
