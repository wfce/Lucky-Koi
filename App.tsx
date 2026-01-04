
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  History, Settings, LayoutDashboard, FileText, Shield, 
  TrendingUp, Coins, Users, ShieldCheck, Activity, Globe,
  Clock, Target, Zap, Sparkles, Fingerprint, ShieldAlert,
  Power, Wallet, ExternalLink, Info, Gift, Trophy, X,
  CheckCircle2, ArrowRightCircle, AlertCircle, Sparkle,
  Waves, RefreshCw, AlertTriangle, Trash2, Search, RotateCcw,
  Loader2, Flame, Timer, Scroll, Scale, Siren, Gavel, Dna,
  Fuel, MousePointerClick, Heart, Github, Menu, Send, Twitter
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
  MetaMaskIcon, OKXIcon, BinanceIcon, TrustWalletIcon, TokenPocketIcon, GenericWalletIcon
} from './WalletIcons';
import { 
  CONTRACT_ADDRESS, BSC_RPC, CHAIN_ID, 
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
  globalVar?: string;
}

interface HolderData {
  address: string;
  balance: string;
  isValid: boolean;
  graceEnd: number;
}

const SUPPORTED_WALLETS: WalletProvider[] = [
  { id: 'injected', name: '通用浏览器钱包', icon: <GenericWalletIcon />, detectFlag: 'isMetaMask' },
  { id: 'metamask', name: 'MetaMask', icon: <MetaMaskIcon />, detectFlag: 'isMetaMask' },
  { id: 'okx', name: 'OKX Wallet', icon: <OKXIcon />, detectFlag: 'isOKXWallet', globalVar: 'okxwallet' },
  { id: 'binance', name: 'Binance Wallet', icon: <BinanceIcon />, detectFlag: 'isBinance', globalVar: 'BinanceChain' },
  { id: 'trust', name: 'Trust Wallet', icon: <TrustWalletIcon />, detectFlag: 'isTrust', globalVar: 'trustwallet' },
  { id: 'tokenpocket', name: 'TokenPocket', icon: <TokenPocketIcon />, detectFlag: 'isTokenPocket', globalVar: 'tokenpocket' }
];

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [detectedWallets, setDetectedWallets] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'rules' | 'holders' | 'admin'>('stats');
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
  const [notification, setNotification] = useState<{show: boolean, type: 'error' | 'success' | 'info', title: string, message: string}>({ show: false, type: 'info', title: '', message: '' });
  const [resultModal, setResultModal] = useState<{show: boolean, mode: 'winner' | 'loser' | 'guest', isWinner: boolean, amount: string, winnerAddress: string, txHash: string}>({ show: false, mode: 'guest', isWinner: false, amount: '0', winnerAddress: '', txHash: '' });
  const [recycleAddr, setRecycleAddr] = useState("");
  const [cleanupProgress, setCleanupProgress] = useState<{remaining: number, percent: number} | null>(null);
  const [pendingDetails, setPendingDetails] = useState<{amount: string, since: number, canRecycle: boolean, recycleTime: number} | null>(null);

  const lastProcessedRequestId = useRef<string | null>(null);
  const previousInProgress = useRef<boolean>(false);
  const isInitialLoad = useRef<boolean>(true);
  const postLotteryCheckCounter = useRef<number>(0); 
  const currentTimeRef = useRef<number>(Math.floor(Date.now() / 1000));

  const readOnlyProvider = useMemo(() => new ethers.JsonRpcProvider(BSC_RPC, {
      chainId: 56,
      name: 'binance'
  }), []);
  
  const readOnlyContract = useMemo(() => new ethers.Contract(CONTRACT_ADDRESS, LUCKY_LOTTERY_ABI, readOnlyProvider), [readOnlyProvider]);

  const showNotification = useCallback((type: 'error' | 'success' | 'info', title: string, message: string) => { setNotification({ show: true, type, title, message }); }, []);

  useEffect(() => {
    const timer = setInterval(() => { currentTimeRef.current = Math.floor(Date.now() / 1000); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasSufficientBalance = useMemo(() => {
    if (!userInfo || !config) return false;
    try { return BigInt(userInfo.walletBalance) >= BigInt(config.minHolding); } catch (e) { return false; }
  }, [userInfo, config]);

  useEffect(() => {
    const detect = () => {
      const w = window as any;
      const found = new Set<string>();
      const ethereum = w.ethereum;
      const providers = ethereum?.providers || (ethereum ? [ethereum] : []);
      
      if (ethereum) found.add('injected');

      SUPPORTED_WALLETS.forEach(wallet => {
        if (wallet.globalVar && w[wallet.globalVar]) { 
            found.add(wallet.id); 
            return; 
        }
        
        if (wallet.id === 'binance' && (ethereum?.isBinance || w.BinanceChain)) {
            found.add('binance');
            return;
        }

        const isFoundInProviders = providers.some((p: any) => p?.[wallet.detectFlag]);
        if (isFoundInProviders) { found.add(wallet.id); return; }
        
        if (ethereum?.[wallet.detectFlag]) { found.add(wallet.id); }
      });
      setDetectedWallets(found);
    };
    
    detect();
    setTimeout(detect, 1000);
    setTimeout(detect, 3000);

    window.addEventListener('ethereum#initialized', detect);
    window.addEventListener("eip6963:announceProvider", detect as any);
    window.addEventListener('load', detect);
    
    return () => {
        window.removeEventListener('ethereum#initialized', detect);
        window.removeEventListener("eip6963:announceProvider", detect as any);
        window.removeEventListener('load', detect);
    };
  }, []);

  const connectSpecificWallet = async (wallet: WalletProvider) => {
    let targetProvider: any = null;
    const w = window as any;
    const ethereum = w.ethereum;

    if (wallet.globalVar && w[wallet.globalVar]) { 
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
        if (wallet.id === 'injected') { 
            targetProvider = ethereum; 
        } else if (wallet.id === 'binance') {
            if (ethereum.isBinance) targetProvider = ethereum;
        } else if (ethereum[wallet.detectFlag]) { 
            targetProvider = ethereum; 
        }
        
        if (!targetProvider && wallet.id === 'metamask' && ethereum.isMetaMask) { 
            targetProvider = ethereum; 
        }
    }

    if (!targetProvider) {
         if (wallet.id === 'injected') { return showNotification('info', '环境未就绪', '未检测到 Web3 浏览器环境。'); }
         return showNotification('info', '未检测到钱包', `无法调用 ${wallet.name}，请检查是否已解锁或启用。`);
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
                } else throw switchError;
            }
          }
      } catch (netErr) {
          console.warn("Network check skipped or failed, proceeding to account request", netErr);
      }
      
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]); 
      localStorage.setItem(STORAGE_KEY, "true"); 
      setIsModalOpen(false);
      showNotification('success', '连接成功', `已接入 ${wallet.name}`);
    } catch (err: any) { 
        console.error(err);
        showNotification('error', '连接中断', '用户取消了授权或发生错误。'); 
    } finally { 
        setLoading(false); 
    }
  };

  const autoConnect = async () => {
      const storedConnected = localStorage.getItem(STORAGE_KEY);
      const w = window as any;
      
      if (storedConnected === "true") {
        try {
          let providerToUse = w.ethereum;
          if (w.BinanceChain && (!w.ethereum || w.BinanceChain.bnbSign)) {
             providerToUse = w.BinanceChain;
          }

          if (providerToUse) {
              const provider = new ethers.BrowserProvider(providerToUse);
              const accounts = await provider.send("eth_accounts", []);
              if (accounts && accounts.length > 0) {
                setAccount(accounts[0]);
              } else {
                localStorage.removeItem(STORAGE_KEY);
              }
          }
        } catch (error) { console.error("Auto connect failed:", error); }
      }
  };

  useEffect(() => { autoConnect(); }, []);

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          localStorage.setItem(STORAGE_KEY, "true");
          showNotification('info', '账户已更新', `当前: ${accounts[0].slice(0, 6)}...`);
        } else {
          setAccount(null);
          localStorage.removeItem(STORAGE_KEY);
          showNotification('info', '已断开', '钱包连接已断开');
        }
      };
      const handleChainChanged = () => window.location.reload();
      if (ethereum.on) {
          ethereum.on('accountsChanged', handleAccountsChanged);
          ethereum.on('chainChanged', handleChainChanged);
      }
      return () => {
        if (ethereum.removeListener) {
            ethereum.removeListener('accountsChanged', handleAccountsChanged);
            ethereum.removeListener('chainChanged', handleChainChanged);
        }
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
      
      if (isInitialLoad.current) {
        if (records.length > 0) {
           lastProcessedRequestId.current = records[0].requestId; 
        }
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
      // New Config Structure (13 items):
      // tokenAddr, link677Addr, linkBep20Addr, pegSwapAddr, routerAddr, wbnbAddr, minHold, fullHold, koiInterval, maxH, gasLimit, tokenIsSet, configIsLocked
      const currentConfig = {
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
        configLocked: c[12]
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
        readOnlyContract.getContractStats(), 
        readOnlyContract.getLinkStats(),
        readOnlyProvider.getBalance(CONTRACT_ADDRESS),
        readOnlyContract.getCleanupProgress().catch(() => null),
        readOnlyContract.getActualKoiPool().catch(() => BigInt(0)),
        readOnlyContract.getTriggerStatusDetails(),
        readOnlyContract.getGasRewardStats()
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
      
      // New LinkStats (11 items): 
      // erc677Bal, bep20Bal, subBal, totalBal, availEth, needsBuy, needsConvert, hasTopUp, purchased, spent, received
      setLinkStats({
        erc677Balance: ethers.formatEther(l[0]), 
        bep20Balance: ethers.formatEther(l[1]),
        subscriptionBalance: ethers.formatEther(l[2]),
        totalLinkBalance: ethers.formatEther(l[3]), 
        availableEthForLink: ethers.formatEther(l[4]),
        needsBuy: l[5], 
        needsConvert: l[6],
        needsTopUp: l[7], 
        totalLinkPurchased: ethers.formatEther(l[8]),
        totalEthSpent: ethers.formatEther(l[9]), 
        received: ethers.formatEther(l[10])
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
            rewardPercentage: Number(u.rewardPct), currentlyValid: u.valid,
            totalWon: ethers.formatEther(u.won), winCount: Number(u.winCnt),
            pending: ethers.formatEther(u.pendingAmt), triggers: Number(uTrigger.triggers),
            gasRewardsCollected: ethers.formatEther(uTrigger.gasRewards),
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

  useEffect(() => {
      if(activeTab === 'admin' && ethers.isAddress(recycleAddr)) {
          readOnlyContract.getPendingDetails(recycleAddr).then((res: any) => {
              setPendingDetails({ amount: ethers.formatEther(res.amount), since: Number(res.since), canRecycle: res.canRecycle, recycleTime: Number(res.recycleTime) });
          }).catch(() => setPendingDetails(null));
      } else { setPendingDetails(null); }
  }, [activeTab, recycleAddr, readOnlyContract]);

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
        if (a.id === 'injected') return -1;
        if (b.id === 'injected') return 1;
        const aInstalled = detectedWallets.has(a.id);
        const bInstalled = detectedWallets.has(b.id);
        if (aInstalled && !bInstalled) return -1;
        if (!aInstalled && bInstalled) return 1;
        return 0;
    });
  }, [detectedWallets]);

  const renderCardBackContent = () => {
    if (stats?.inProgress) {
      return (
        <>
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
             <Waves size={32} className="text-white animate-spin-slow" />
          </div>
          <div className="space-y-1">
             <h3 className="text-white text-lg font-black uppercase italic">金鳞化龙中</h3>
             <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">VRF 正在指引天选...</p>
          </div>
        </>
      );
    }
    
    let icon = <AlertCircle size={32} className="text-white"/>;
    let title = "瑞气积蓄中";
    let desc = "等待天时地利...";
    let colorClass = "bg-zinc-700 shadow-zinc-500/20";
    let textClass = "text-zinc-400";

    switch (triggerStatus) {
      case TriggerStatus.Success:
         icon = <Zap size={32} className="text-white"/>; title = "鸿运已降临"; desc = "锦鲤即将跃龙门..."; colorClass = "bg-emerald-500 shadow-emerald-500/40"; textClass = "text-emerald-500"; break;
      case TriggerStatus.TokenNotSet:
         icon = <Settings size={32} className="text-white"/>; title = "天机未启"; desc = "静待初始符文..."; colorClass = "bg-amber-500 shadow-amber-500/40"; textClass = "text-amber-500"; break;
      case TriggerStatus.NoHolders:
         icon = <Users size={32} className="text-white"/>; title = "池水暂清"; desc = "等待首条锦鲤入池..."; colorClass = "bg-red-500 shadow-red-500/40"; textClass = "text-red-500"; break;
      case TriggerStatus.PoolTooSmall:
         return (
            <div className="flex flex-col items-center gap-4 relative">
                <div className="absolute -top-4 -right-4 animate-pulse opacity-50"><Sparkles className="text-sky-300" size={16}/></div>
                <div className="absolute -bottom-2 -left-4 animate-bounce opacity-50"><Sparkles className="text-sky-400" size={12}/></div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/40 overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 right-0 bg-white/30 h-1/2 animate-[wave_2s_infinite_ease-in-out]"></div>
                    <Waves size={32} className="text-white animate-bounce relative z-10" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-white text-lg font-black uppercase italic tracking-tight">福泽正在汇聚</h3>
                    <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest animate-pulse">奖池水位蓄力中...</p>
                </div>
            </div>
         );
      case TriggerStatus.InsufficientLink:
         icon = <Fuel size={32} className="text-white"/>; title = "灵力告急"; desc = "需补充预言机燃料"; colorClass = "bg-red-600 shadow-red-600/40"; textClass = "text-red-600"; break;
      case TriggerStatus.IntervalNotReached:
          icon = <Clock size={32} className="text-white"/>; title = "潜龙勿用"; desc = "静候时辰流转..."; colorClass = "bg-zinc-600 shadow-zinc-600/40"; textClass = "text-zinc-400"; break;
    }
    
    return (
        <>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${colorClass}`}>{icon}</div>
          <div className="space-y-1"><h3 className="text-white text-lg font-black uppercase italic">{title}</h3><p className={`${textClass} text-[10px] font-black uppercase tracking-widest`}>{desc}</p></div>
        </>
    );
  };

  const isFlipped = stats?.inProgress || stats?.canTrigger || (countdown.isZero && !stats?.canTrigger && triggerStatus !== TriggerStatus.IntervalNotReached);

  // 个人锦鲤终端组件逻辑提取，以便复用
  const PersonalTerminal = (
    <div className="glass-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 border-t-8 border-red-500 shadow-3xl overflow-hidden group space-y-8">
      <h3 className="text-xl font-black text-white flex items-center justify-between uppercase italic pr-4">个人锦鲤终端 <Activity size={16} className="text-red-500 animate-pulse" /></h3>
      
      {!account ? (
        <div className="space-y-6 py-6 animate-in slide-in-from-bottom-5 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent rounded-[2rem] pointer-events-none" />
          <div className="relative z-10 mx-auto w-max px-4 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full flex items-center gap-2 animate-pulse"><ShieldAlert size={12} className="text-red-500" /><span className="text-[9px] font-black text-red-500 uppercase italic tracking-wider">参与资格未激活</span></div>
          <div className="relative w-24 h-24 mx-auto group cursor-pointer" onClick={() => !loading && setIsModalOpen(true)}>
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
              <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse delay-75" />
              <div className={`relative z-10 w-full h-full bg-[#0c0c0e] rounded-full flex items-center justify-center border-2 border-dashed border-red-500/30 shadow-2xl transition-transform duration-500 group-hover:border-red-500 ${!loading && 'group-hover:scale-110'}`}><Wallet className="text-red-500" size={36} /></div>
              <div className="absolute -bottom-1 -right-1 z-50 bg-red-500 text-white text-[8px] font-black px-3 py-1.5 rounded-xl border-2 border-[#0c0c0e] shadow-xl animate-bounce">必需</div>
          </div>
          <div className="text-center space-y-3 relative z-10 px-2"><h4 className="text-white font-black uppercase italic tracking-widest text-sm">请先连接钱包</h4><p className="text-[10px] text-zinc-400 font-bold leading-relaxed">您当前处于<span className="text-red-500">离线状态</span>。智能合约无法读取您的持仓数据，<br/><span className="text-white underline decoration-red-500/50 underline-offset-4">无法将您列入抽奖名单</span>。</p></div>
          <div className="grid grid-cols-2 gap-3 px-2">
              <div className="bg-zinc-950/80 border border-white/5 p-3 rounded-xl flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500"><Search size={14}/></div><div className="text-left"><div className="text-[9px] text-white font-black uppercase italic">持仓验证</div><div className="text-[8px] text-zinc-600 font-black">自动扫描余额</div></div></div>
              <div className="bg-zinc-950/80 border border-white/5 p-3 rounded-xl flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500"><Sparkles size={14}/></div><div className="text-left"><div className="text-[9px] text-white font-black uppercase italic">资格激活</div><div className="text-[8px] text-zinc-600 font-black">获取入场券</div></div></div>
          </div>
          <button onClick={() => setIsModalOpen(true)} disabled={loading} className={`w-full action-button py-5 rounded-2xl text-[11px] font-black uppercase italic flex items-center justify-center gap-2 shadow-red-500/20 shadow-xl relative overflow-hidden group transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-red-500/40 active:scale-95'}`}><span className="relative z-10 flex items-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <>连接钱包并激活资格 <ArrowRightCircle size={14} /></>}</span></button>
        </div>
      ) : !userInfo?.registered ? (
        <div className="space-y-8 py-4 animate-in fade-in">
          <div className={`p-6 rounded-[2.5rem] border transition-all shadow-inner space-y-5 relative overflow-hidden ${hasSufficientBalance ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/10'}`}>
             <div className="flex items-center justify-between"><span className="text-[9px] font-black text-zinc-600 uppercase italic">瑞气资格侦测</span>{hasSufficientBalance ? (<span className="flex items-center gap-1.5 text-[8px] font-black text-emerald-500 uppercase italic"><CheckCircle2 size={10}/> 资格已就绪</span>) : (<span className="flex items-center gap-1.5 text-[8px] font-black text-red-500 uppercase italic"><AlertCircle size={10}/> 余额不足</span>)}</div>
             <div className="space-y-1"><p className="text-[9px] text-zinc-600 font-black uppercase italic">当前钱包持仓 ({tokenSymbol})</p><div className="flex items-baseline gap-2"><h4 className="text-4xl font-black text-white tabular-nums tracking-tighter">{formatTokens(userInfo?.walletBalance, tokenDecimals)}</h4><span className="text-xs font-black text-zinc-700 uppercase italic">/ {config ? formatTokens(config.minHolding, tokenDecimals) : '--'}</span></div></div>
          </div>
          <div className="space-y-4">
              <button onClick={() => executeTx('register')} disabled={!hasSufficientBalance || loading} className={`w-full py-5 rounded-2xl text-xs font-black uppercase italic transition-all shadow-lg flex items-center justify-center gap-3 ${hasSufficientBalance && !loading ? 'action-button active:scale-95' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'}`}>{loading ? <Loader2 size={14} className="animate-spin" /> : (<>{hasSufficientBalance ? '立即激活锦鲤身份' : '持仓达标后方可激活'}{hasSufficientBalance && <Sparkles size={14} className="animate-pulse" />}</>)}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in">
          <div className="p-5 bg-zinc-950 rounded-[1.8rem] border border-white/5 space-y-3 shadow-inner relative overflow-hidden">
             <div className="flex items-center justify-between"><span className="text-[9px] font-black text-zinc-600 uppercase italic">实时探测余额</span><div className={`w-2 h-2 rounded-full ${userInfo.currentlyValid ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} /></div>
             <div className="flex items-baseline gap-2"><h4 className="text-2xl font-black text-white tabular-nums tracking-tighter">{formatTokens(userInfo.walletBalance, tokenDecimals)}</h4><span className="text-[10px] font-black text-zinc-500 uppercase italic">{tokenSymbol}</span></div>
          </div>
          <div className="p-6 bg-zinc-950 rounded-[2rem] border border-white/5 space-y-5 shadow-inner">
            <div className="flex justify-between items-end"><div className="space-y-1"><p className="text-zinc-600 text-[9px] font-black uppercase italic">瑞气分红权重</p><h4 className="text-4xl font-black text-white stat-glow tabular-nums pr-8 leading-none">{userInfo.rewardPercentage}%</h4></div><div className={`mb-1 px-3 py-1 rounded-full text-[8px] font-black uppercase italic border ${userInfo.currentlyValid ? 'text-emerald-500 border-emerald-500/20' : 'text-red-500 border-red-500/20'}`}>{userInfo.currentlyValid ? '收益激活' : '权重失效'}</div></div>
            <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden shadow-inner"><div className="bg-gradient-to-r from-red-500 to-amber-600 h-full transition-all duration-1000" style={{width: `${userInfo.rewardPercentage}%`}}></div></div>
            {!userInfo.currentlyValid && (<div className="text-[8px] text-red-500 font-black uppercase italic text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">警告：持仓不足，面临 1 小时宽限期后被移除的风险</div>)}
          </div>
          {parseFloat(userInfo.pending) > 0 ? (
             <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] space-y-5 shadow-inner">
                <div className="space-y-1"><p className="text-emerald-500 text-[9px] font-black uppercase italic">福泽降临！待领奖金</p><h4 className="text-3xl font-black text-white tabular-nums pr-8 leading-none">{formatBNBValue(userInfo.pending)} <span className="text-xs opacity-50 italic">BNB</span></h4></div>
                <button onClick={() => executeTx('claimPendingReward')} disabled={loading} className={`w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600 active:scale-95'}`}>{loading ? <Loader2 size={12} className="animate-spin" /> : '点击领取福泽'}</button>
             </div>
          ) : (
            <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[9px] text-zinc-600 font-black uppercase italic">锦鲤跃迁中，请保持持仓...</p></div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
             <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[8px] text-zinc-600 font-black uppercase mb-1 italic">锦鲤命中次数</p><p className="text-xs font-black text-white">{userInfo.winCount} 次</p></div>
             <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center shadow-inner"><p className="text-[8px] text-zinc-600 font-black uppercase mb-1 italic">累计 Gas 赏金</p><p className="text-xs font-black text-amber-500">{formatBNBValue(userInfo.gasRewardsCollected)}</p></div>
             <div className="col-span-2 bg-zinc-950 p-3 rounded-2xl border border-white/5 text-center shadow-inner flex items-center justify-between px-6"><p className="text-[8px] text-zinc-600 font-black uppercase italic">LINK 捐赠贡献</p><p className="text-xs font-black text-blue-400">{formatBNBValue(userInfo.donations)}</p></div>
          </div>
          <button onClick={() => executeTx('unregister')} disabled={loading} className={`w-full text-zinc-800 text-[9px] font-black uppercase tracking-[0.3em] transition-all text-center italic mt-2 flex items-center justify-center gap-2 ${loading ? 'cursor-not-allowed opacity-50' : 'hover:text-red-500 active:scale-95'}`}>{loading && <Loader2 size={10} className="animate-spin" />} 注销锦鲤映射</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <Notification show={notification.show} type={notification.type} title={notification.title} message={notification.message} onClose={() => setNotification(p => ({...p, show: false}))} />
      <ResultModal show={resultModal.show} mode={resultModal.mode} isWinner={resultModal.isWinner} amount={resultModal.amount} winnerAddress={resultModal.winnerAddress} txHash={resultModal.txHash} onClose={() => setResultModal(p => ({...p, show: false}))} />

      {/* Drawer Overlay */}
      {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in" onClick={() => setIsMenuOpen(false)} />
      )}
      
      {/* Side Drawer Navigation */}
      <div className={`fixed top-0 right-0 h-full w-64 bg-[#0a0a0c] border-l border-white/10 z-[60] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col shadow-2xl ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-black text-white uppercase italic">菜单导航</span>
              <button onClick={() => setIsMenuOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <NavTab active={activeTab === 'stats'} onClick={() => { setActiveTab('stats'); setIsMenuOpen(false); }} label="鸿运面板" icon={<LayoutDashboard size={16}/>} isMobile />
              <NavTab active={activeTab === 'history'} onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }} label="瑞气英雄" icon={<History size={16}/>} isMobile />
              <NavTab active={activeTab === 'rules'} onClick={() => { setActiveTab('rules'); setIsMenuOpen(false); }} label="跃迁法则" icon={<FileText size={16}/>} isMobile />
              <NavTab active={activeTab === 'holders'} onClick={() => { setActiveTab('holders'); setIsMenuOpen(false); }} label="锦鲤名册" icon={<Shield size={16}/>} isMobile />
              <NavTab active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); setIsMenuOpen(false); }} label="协议中枢" icon={<Settings size={16}/>} isMobile />
          </div>
          <div className="p-6 border-t border-white/5 text-center">
             <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">幸运锦鲤 v1.0</p>
          </div>
      </div>

      <nav className="sticky top-0 z-40 glass-card border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group select-none" onClick={() => setActiveTab('stats')}>
                <div className="bg-[#0c0c0e] border border-white/5 p-1 rounded-xl sm:rounded-2xl shadow-2xl relative transition-transform group-hover:scale-105 duration-500 shrink-0">
                    <div className="block sm:hidden"><LuckyLogo size={32} /></div>
                    <div className="hidden sm:block"><LuckyLogo size={46} /></div>
                    <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full animate-pulse -z-10" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-2xl font-black text-white tracking-tighter uppercase italic pr-2 leading-none group-hover:text-red-400 transition-colors">幸运锦鲤</span>
                  <span className="text-[7px] sm:text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-0.5 sm:mt-1 pr-2">Lucky Koi Protocol</span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                 {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-2 p-1 bg-zinc-950/50 rounded-xl border border-white/5 shadow-inner mr-4">
                  <NavTab active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="鸿运面板" icon={<LayoutDashboard size={14}/>} />
                  <NavTab active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="瑞气英雄" icon={<History size={14}/>} />
                  <NavTab active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} label="跃迁法则" icon={<FileText size={14}/>} />
                  <NavTab active={activeTab === 'holders'} onClick={() => setActiveTab('holders')} label="锦鲤名册" icon={<Shield size={14}/>} />
                  <NavTab active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} label="协议中枢" icon={<Settings size={14}/>} />
               </div>

                {/* Wallet Connect */}
                {account ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:block px-5 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-[11px] font-black uppercase tracking-wider text-zinc-400">{account.slice(0, 6)}...{account.slice(-4)}</div>
                    <button onClick={handleDisconnect} className="p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-red-500 active:bg-zinc-800 shadow-inner transition-all"><Power size={14}/></button>
                  </div>
                ) : (
                  <button onClick={() => setIsModalOpen(true)} disabled={loading} className={`flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-wider action-button ${loading && 'opacity-75 cursor-not-allowed'}`}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <span className="hidden sm:inline">开启鸿运之旅</span>}
                    {loading ? '' : <span className="sm:hidden">连接</span>}
                  </button>
                )}

                {/* Mobile Menu Toggle */}
                <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white active:scale-95 transition-all">
                    <Menu size={18} />
                </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start mt-6">
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {activeTab === 'stats' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
              <div className="relative rounded-[2rem] sm:rounded-[3rem] glass-card p-5 sm:p-10 border border-white/10 shadow-2xl overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none scale-125"><LuckyLogo size={500} /></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-10 pb-4 sm:pb-6">
                  <div className="space-y-4 sm:space-y-6 text-center md:text-left flex-1 w-full">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest italic pr-2"><Globe size={12}/> 实时瑞气总奖池</div>
                    <div className="space-y-1">
                      <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] italic pr-2">当前可分配福泽 (BNB)</p>
                      <div className="flex items-baseline justify-center md:justify-start gap-2 flex-wrap">
                        <h1 className="text-5xl sm:text-7xl font-black text-white stat-glow tabular-nums tracking-tighter pr-2 sm:pr-6 pb-2 leading-tight accent-gradient">
                            {formatBNBValue(stats?.actualLotteryPool || "0")}
                        </h1>
                        <span className="text-base sm:text-xl font-black text-amber-500 uppercase italic pr-2">BNB</span>
                      </div>
                      {history.length > 0 && (
                        <div className="pt-2 sm:pt-3 flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 animate-in fade-in slide-in-from-bottom-2">
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
                  <div className="flip-container w-full md:w-[320px] h-[180px] sm:h-[200px] mb-4 sm:mb-0">
                    <div className={`flip-card w-full h-full ${isFlipped ? 'flipped' : ''}`}>
                      <div className="flip-card-front bg-zinc-950/80 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col justify-between">
                        <div className="flex items-center justify-between"><p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 italic pr-2"><Clock size={10}/> 下轮甄选倒计时</p><StatusBadge active={stats?.canTrigger || false} inProgress={false} statusId={triggerStatus} /></div>
                        <div className="flex gap-2 sm:gap-3"><DigitBox label="小时" value={countdown.h} /><DigitBox label="分钟" value={countdown.m} /><DigitBox label="秒数" value={countdown.s} /></div>
                      </div>
                      <div className="flip-card-back bg-gradient-to-br from-red-500/10 to-amber-500/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col justify-center items-center gap-4 text-center">
                         {renderCardBackContent()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pt-8 sm:pt-10 mt-8 sm:mt-10 border-t border-white/5 relative z-10">
                  <HeroStat icon={<TrendingUp size={14}/>} label="已跃迁锦鲤" value={stats?.totalLotteries || 0} />
                  <HeroStat icon={<Coins size={14}/>} label="合约账面总额" value={`${formatBNBValue(stats?.contractTotal || 0)}`} />
                  <HeroStat icon={<Users size={14}/>} label="当前瑞气席位" value={stats?.holderCount || 0} />
                  <HeroStat icon={<ShieldCheck size={14}/>} label="物理随机保障" value="VRF V2.5" />
                </div>
              </div>

              {/* Mobile View: Personal Terminal Inserted Here */}
              <div className="lg:hidden mb-6 sm:mb-8">
                  {PersonalTerminal}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardIconBox icon={<Target size={20}/>} title="终身参与资格" desc="一币双吃。持有 10,000 $锦鲤 不仅是资产，更是永续彩票。一次注册，终身自动参与每轮抽奖，资金零损耗，权益全掌控。" color="emerald" />
                <CardIconBox icon={<Zap size={20}/>} title="社区自治驱动" desc="拒绝中心化依赖。通过链上“唤醒悬赏”机制，激励社区成员手动触发开奖。任何人皆可参与维护协议运行并赚取 GAS 奖励，代码即信用。" color="orange" />
                <CardIconBox icon={<ShieldCheck size={20}/>} title="可验证真随机" desc="真随机数引擎。集成 Chainlink VRF V2.5 物理级随机源，提供链上可验证的加密证明，确保每一次锦鲤诞生都绝对公平、不可预测。" color="red" />
              </div>
            </div>
          )}
          
          {activeTab === 'rules' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="glass-card rounded-[2rem] p-8 border border-white/10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-5"><FileText size={200} /></div>
                 <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-3 relative z-10"><Scale className="text-red-500"/> 锦鲤协议·跃迁法则</h2>
                 <p className="mt-4 text-zinc-400 text-xs font-bold leading-relaxed max-w-2xl relative z-10">
                    Lucky Koi Protocol 是一套完全运行在区块链上的自动化代码法则。所有规则均由智能合约强制执行，没有任何中心化机构可以干预。
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Rule 1 */}
                 <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-red-500/30 transition-colors group">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Wallet size={24}/></div>
                    <h3 className="text-lg font-black text-white uppercase italic">一、持仓即入场</h3>
                    <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
                       无需购买彩票。只需钱包持有 <span className="text-white">{config ? formatTokens(config.minHolding, tokenDecimals) : '...'} {tokenSymbol}</span>，并完成一次性链上注册，即可永久获得每轮抽奖资格。代币仍在您钱包中，随时可转出（转出导致余额不足将失去资格）。
                    </p>
                 </div>
                 {/* Rule 2 */}
                 <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-amber-500/30 transition-colors group">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><Dna size={24}/></div>
                    <h3 className="text-lg font-black text-white uppercase italic">二、权重与福泽</h3>
                    <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
                       持仓量决定中奖比例。最低持仓 ({config ? formatTokens(config.minHolding, tokenDecimals) : '...'}) 可获得奖池的 <span className="text-white">50%</span>；持仓达到 <span className="text-white">{config ? formatTokens(config.fullRewardHolding, tokenDecimals) : '...'}</span> 可独吞 <span className="text-white">100%</span> 奖池。中间差额将自动回滚至奖池，累积至下一轮。
                    </p>
                 </div>
                 {/* Rule 3 */}
                 <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-emerald-500/30 transition-colors group">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Zap size={24}/></div>
                    <h3 className="text-lg font-black text-white uppercase italic">三、社区触发机制</h3>
                    <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
                       每 <span className="text-white">{config ? config.lotteryInterval / 60 : '...'} 分钟</span>，只要奖池和 LINK 燃料充足，任何人皆可调用合约触发开奖。触发者将获得 <span className="text-white">Gas 补偿 </span>。这确保了系统在去中心化环境下永续运行。
                    </p>
                 </div>
                 {/* Rule 4 */}
                 <div className="p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4 shadow-inner hover:border-purple-500/30 transition-colors group">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform"><Gavel size={24}/></div>
                    <h3 className="text-lg font-black text-white uppercase italic">四、黑暗森林法则</h3>
                    <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
                       若注册用户的持仓低于最低门槛，任何人均可发起“举报”。被举报者有 <span className="text-white">1 小时</span> 宽限期补足资金。超时未补足，将被移出队列。清理者亦可获得赏金。
                    </p>
                 </div>
              </div>
              
              {/* Maintenance Guide Section */}
              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"><Siren size={24}/></div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase italic">社区自主维护手册</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">去中心化协议的应急与保养指南</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    {/* Item 1 */}
                    <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0"><Clock size={18}/></div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-black text-white uppercase italic">1. 开奖停滞 (Lottery Stalled)</h4>
                                <div className="text-[10px] text-zinc-400 font-bold leading-relaxed space-y-1">
                                    <p><span className="text-zinc-600 uppercase tracking-wider">现象：</span> 超过设定的时间间隔（如 30 分钟）仍未开奖。</p>
                                    <p><span className="text-zinc-600 uppercase tracking-wider">原因：</span> 无人触发，或 Gas 费波动导致自动脚本暂停。</p>
                                    <p><span className="text-emerald-500 uppercase tracking-wider">解决方案：</span> 前往 <span className="text-white border-b border-white/20">协议中枢</span>，查看“触发状态”。若显示“系统就绪”，点击 <strong>“手动触发结算”</strong>。</p>
                                    <p className="text-amber-500/80 italic">★ 触发者将获得 Gas 补偿 。</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item 2 */}
                    <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0"><Fuel size={18}/></div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-black text-white uppercase italic">2. 预言机缺油 (Insufficient LINK)</h4>
                                <div className="text-[10px] text-zinc-400 font-bold leading-relaxed space-y-1">
                                    <p><span className="text-zinc-600 uppercase tracking-wider">现象：</span> 触发状态提示“LINK 燃料不足”或“灵力告急”。</p>
                                    <p><span className="text-zinc-600 uppercase tracking-wider">原因：</span> Chainlink VRF 订阅账户中的 LINK 代币耗尽。</p>
                                    <p><span className="text-emerald-500 uppercase tracking-wider">解决方案：</span> 前往 <span className="text-white border-b border-white/20">协议中枢</span>，点击 <strong>“智能维护 (Maintain LINK)”</strong>。</p>
                                    <p className="text-zinc-500 italic">合约会自动将部分 BNB 兑换为 LINK，并通过 PegSwap 跨链充值到 VRF 订阅账户。</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item 3 */}
                    <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all group">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-red-500/10 rounded-lg text-red-500 shrink-0"><RotateCcw size={18}/></div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-black text-white uppercase italic">3. 抽奖卡死 (Stuck Request)</h4>
                                <div className="text-[10px] text-zinc-400 font-bold leading-relaxed space-y-1">
                                    <p><span className="text-zinc-600 uppercase tracking-wider">现象：</span> 状态一直显示“VRF 运算中”，且持续时间超过 1 小时。</p>
                                    <p><span className="text-zinc-600 uppercase tracking-wider">原因：</span> Chainlink 节点未响应，或回调交易失败。</p>
                                    <p><span className="text-emerald-500 uppercase tracking-wider">解决方案：</span> 前往 <span className="text-white border-b border-white/20">协议中枢</span>，点击 <strong>“强制重置异常请求”</strong>。</p>
                                    <p className="text-zinc-500 italic">需等待请求发出 1 小时后方可执行。重置后可立即发起新一轮抽奖。</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item 4 */}
                    <div className="glass-card p-5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-purple-500/10 rounded-lg text-purple-500 shrink-0"><Trash2 size={18}/></div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-black text-white uppercase italic">4. 僵尸户清理 (Cleanup)</h4>
                                <div className="text-[10px] text-zinc-400 font-bold leading-relaxed space-y-1">
                                    <p><span className="text-zinc-600 uppercase tracking-wider">现象：</span> 持有者列表包含大量无效用户，导致 Gas 费虚高。</p>
                                    <p><span className="text-emerald-500 uppercase tracking-wider">解决方案：</span> 前往 <span className="text-white border-b border-white/20">协议中枢</span> 点击 <strong>“批量清理”</strong>；或在 <span className="text-white border-b border-white/20">锦鲤名册</span> 中对单个用户发起 <strong>“举报”</strong>。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holders' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 ml-2 uppercase italic pr-2"><Shield size={24} className="text-amber-500" /> 锦鲤名册 (共 {stats?.holderCount} 位)</h2>
              <div className="glass-card rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl p-4 sm:p-0">
                <div className="hidden sm:block overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                        <th className="px-6 sm:px-8 py-5 italic">序号</th>
                        <th className="px-6 sm:px-8 py-5 italic">锦鲤钱包</th>
                        <th className="px-6 sm:px-8 py-5 text-right italic">持仓余额 ({tokenSymbol})</th>
                        <th className="px-6 sm:px-8 py-5 text-center italic">状态</th>
                        <th className="px-6 sm:px-8 py-5 text-right italic">操作</th>
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
                              {h.isValid ? <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] border border-emerald-500/20">有效</span> : <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-[9px] border border-red-500/20 flex items-center justify-center gap-1"><AlertTriangle size={8}/> 异常</span>}
                          </td>
                          <td className="px-6 sm:px-8 py-4 text-right">
                             {!h.isValid ? (
                                h.graceEnd > 0 ? 
                                <span className="text-zinc-500 text-[9px] italic">宽限期中</span> :
                                <button onClick={() => executeTx('reportInvalid', [h.address])} className="text-red-500 hover:text-white transition-colors underline decoration-red-500/50 underline-offset-2">举报/清理</button>
                             ) : (
                                BigInt(h.balance) < BigInt(config?.minHolding || '0') && 
                                <button onClick={() => executeTx('reportInvalid', [h.address])} className="text-amber-500 hover:text-white transition-colors underline decoration-amber-500/50 underline-offset-2">发起举报</button>
                             )}
                          </td>
                        </tr>
                      )) : <tr><td colSpan={5} className="text-center py-20 text-zinc-700 italic font-black uppercase">加载持仓数据中...</td></tr>}
                    </tbody>
                  </table>
                </div>

                 {/* Mobile Card View for Holders */}
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
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">持仓</p>
                                <p className={`text-sm font-black ${h.isValid ? 'text-emerald-400' : 'text-red-500'}`}>{formatTokens(h.balance, tokenDecimals)}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">状态</p>
                                {h.isValid ? <span className="text-emerald-500 text-[10px] font-black uppercase">有效</span> : <span className="text-red-500 text-[10px] font-black uppercase">异常</span>}
                             </div>
                        </div>
                        {(!h.isValid || BigInt(h.balance) < BigInt(config?.minHolding || '0')) && (
                             <button onClick={() => executeTx('reportInvalid', [h.address])} className="w-full py-2 mt-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase italic hover:bg-red-500 hover:text-white transition-all">发起链上举报</button>
                        )}
                    </div>
                  )) : (
                    <div className="text-center py-10 text-zinc-700 italic font-black uppercase text-xs">暂无数据...</div>
                  )}
                </div>

                <Pagination current={holdersPage} total={Math.ceil((stats?.holderCount || 0) / PAGE_SIZE)} onChange={setHoldersPage} />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 ml-2 uppercase italic pr-2"><History className="text-red-500" /> 历届锦鲤芳名录 (最近 5000 区块)</h2>
              <div className="glass-card rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl p-4 sm:p-0">
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                        <th className="px-6 sm:px-8 py-5 italic">瑞气锦鲤钱包</th><th className="px-6 sm:px-8 py-5 text-right italic">斩获福泽</th><th className="px-6 sm:px-8 py-5 text-right italic">持仓权重</th><th className="px-6 sm:px-8 py-5 text-right italic">链上凭据</th>
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
                      )) : <tr><td colSpan={4} className="text-center py-20 text-zinc-700 italic font-black uppercase">历史长河加载中...</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-4">
                  {history.length > 0 ? history.slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE).map((rec, i) => (
                    <div key={i} className="bg-zinc-950/50 border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">锦鲤钱包</p>
                                <p className="text-xs text-white font-mono font-bold break-all">{rec.winner}</p>
                            </div>
                            <a href={`https://bscscan.com/tx/${rec.txHash}`} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900 border border-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"><ExternalLink size={14}/></a>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                             <div>
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">斩获福泽</p>
                                <p className="text-sm text-emerald-400 font-black">{formatBNBValue(rec.reward)} <span className="text-[9px]">BNB</span></p>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider italic">持仓权重</p>
                                <p className="text-sm text-red-500 font-black">{rec.percentage}%</p>
                             </div>
                        </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-zinc-700 italic font-black uppercase text-xs">暂无历史数据...</div>
                  )}
                </div>

                <Pagination current={historyPage} total={Math.ceil(history.length / PAGE_SIZE)} onChange={setHistoryPage} />
              </div>
            </div>
          )}
          {activeTab === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 animate-in fade-in pb-16">
               <AdminSection loading={loading} title="Chainlink 预言机维护" 
                  stats={[
                    { label: "ERC-677 LINK (VRF用)", value: `${formatBNBValue(linkStats?.erc677Balance || '0')} LINK` },
                    { label: "BEP-20 LINK (未转换)", value: `${formatBNBValue(linkStats?.bep20Balance || '0')} LINK` },
                    { label: "VRF 订阅池余额", value: `${formatBNBValue(linkStats?.subscriptionBalance || '0')} LINK` }, 
                    { label: "社区捐赠 LINK 总额", value: `${formatBNBValue(linkStats?.received || '0')} LINK` }
                  ]} 
                  onAction={executeTx} 
                  actions={[
                    { label: "智能维护 (Swap/Convert/TopUp)", method: "maintainLink" }, 
                    { label: "奖池原生解包 (Unwrap WBNB)", method: "unwrapAllWBNB" },
                    { label: "转换 LINK (PegSwap: BEP20->677)", method: "convertLink" }
                  ]} 
               />
               <AdminSection loading={loading} title="悬赏猎人公报 (Trigger Stats)" stats={[{ label: "已支付 Gas 赏金", value: `${formatBNBValue(gasRewardStats?.totalPaid || '0')} BNB` }, { label: "当前基础赏金", value: `${formatBNBValue(gasRewardStats?.baseReward || '0')} BNB` }]} actions={[{ label: "手动触发结算 (赚取GAS奖励)", method: "triggerKoiStrict" }, { label: `批量清理无效持仓 ${cleanupProgress && cleanupProgress.percent > 0 && cleanupProgress.percent < 100 ? `(${cleanupProgress.percent}%)` : ''}`, method: "cleanup", args: [50] }, { label: "强制重置异常请求", method: "cancelStuckKoi" }]} onAction={executeTx} />
               
               <div className="md:col-span-2 glass-card rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
                 <h3 className="text-lg font-black text-white uppercase italic pr-4 flex items-center gap-2"><RotateCcw size={18} className="text-red-500"/> 过期奖金安全回收 (社区悬赏)</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-red-500 transition-colors"><Search size={14}/></div>
                            <input type="text" value={recycleAddr} onChange={(e) => setRecycleAddr(e.target.value)} placeholder="输入待查钱包地址..." disabled={loading} className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-mono text-zinc-300 focus:outline-none focus:border-red-500/50 transition-all shadow-inner disabled:opacity-50"/>
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
                         <div className="flex-1 p-4 bg-red-900/10 border border-red-500/10 rounded-2xl">
                             <p className="text-[10px] text-zinc-400 leading-relaxed font-bold"><Flame size={12} className="inline text-red-500 mr-1"/>为了维持奖池活力，任何超过 <span className="text-white">30 天</span> 未领取的奖金，均可被任何人触发回收。回收的 BNB 将直接注入下轮奖池。</p>
                         </div>
                         <button disabled={loading || !pendingDetails?.canRecycle} onClick={() => { if (!ethers.isAddress(recycleAddr)) return showNotification('error', '地址错误', '请输入合法的钱包地址。'); executeTx('recycleStuckPending', [recycleAddr]); }} className={`w-full py-4 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black text-zinc-400 uppercase italic shadow-lg flex items-center justify-center gap-2 ${loading || !pendingDetails?.canRecycle ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:bg-red-500 transition-all active:scale-95'}`}>{loading && <Loader2 size={12} className="animate-spin"/>} 确认执行回收</button>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-4 sticky top-32 hidden lg:block">
          {PersonalTerminal}
        </div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 flex flex-col md:flex-row gap-4 sm:gap-6">
        <AddressBox label="锦鲤代币CA" address={config?.tokenAddress || "..."} onCopy={(m) => showNotification('info', '复制成功', m)} explorerLink={`https://bscscan.com/address/${config?.tokenAddress}`} />
        <AddressBox label="奖池智能合约" address={CONTRACT_ADDRESS} onCopy={(m) => showNotification('info', '复制成功', m)} explorerLink={`https://bscscan.com/address/${CONTRACT_ADDRESS}`} />
      </div>

      <footer className="mt-20 border-t border-white/5 bg-[#08080a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                    <LuckyLogo size={32} />
                    <div>
                        <h4 className="text-sm font-black text-white uppercase italic tracking-wider">幸运锦鲤</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">社区驱动的去中心化瑞气平台</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <a href="https://github.com/wfce/Lucky-Koi" target="_blank" rel="noreferrer" className="p-2 text-zinc-600 hover:text-white transition-colors"><Github size={18} /></a>
                    <a href="https://x.com/jinli_bnb" target="_blank" rel="noreferrer" className="p-2 text-zinc-600 hover:text-sky-500 transition-colors"><Twitter size={18} /></a>
                    <a href="https://t.me/jinli_bnb" target="_blank" rel="noreferrer" className="p-2 text-zinc-600 hover:text-blue-400 transition-colors"><Send size={18} /></a>
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                <p>&copy; 2026 JINLI.LOL</p>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500"/> Chainlink VRF V2.5</span>
                    <span className="flex items-center gap-1.5"><Zap size={12} className="text-amber-500"/> BSC 主网</span>
                </div>
            </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => !loading && setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-300 shadow-3xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-white uppercase italic pr-4">连接您的钱包</h2><button onClick={() => setIsModalOpen(false)} disabled={loading} className="p-2 text-zinc-600 hover:text-white transition-colors disabled:opacity-30"><X size={20}/></button></div>
            <p className="text-[10px] font-black text-zinc-600 uppercase italic mb-6 leading-relaxed">请选择您使用的钱包应用。如果您使用的是移动端或未列出的钱包，请尝试“通用浏览器钱包”。</p>
            <div className="space-y-3">
              {sortedWallets.map(wallet => (<WalletButton key={wallet.id} name={wallet.name} icon={wallet.icon} installed={detectedWallets.has(wallet.id)} onClick={() => connectSpecificWallet(wallet)} disabled={loading} />))}
            </div>
            <div className="mt-8 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10"><p className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest italic pr-2 text-center">当前网络：BSC MAINNET (CHAIN 56)</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
