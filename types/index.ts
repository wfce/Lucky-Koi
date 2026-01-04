
export interface ContractStats {
  holderCount: number;
  lotteryPool: string;
  actualLotteryPool: string;
  nextLotteryTime: number;
  totalLotteries: number;
  totalRewards: string;
  totalPending: string;
  canTrigger: boolean;
  inProgress: boolean;
  contractTotal: string; 
}

export interface UserInfo {
  registered: boolean;
  currentBalance: string;
  walletBalance: string;
  rewardPercentage: number;
  currentlyValid: boolean;
  totalWon: string;
  winCount: number;
  pending: string;
  triggers: number;
  gasRewardsCollected: string;
  donations: string;
}

export interface GasRewardStats {
  totalPaid: string;
  currentBounty: string;
  baseReward: string;
  maxReward: string;
}

export interface ContractConfig {
  tokenAddress: string;
  link677Address: string;
  linkBep20Address: string;
  pegSwapAddress: string;
  swapRouter: string;
  wbnb: string;
  minHolding: string;
  fullRewardHolding: string;
  lotteryInterval: number;
  maxHolders: number;
  callbackGasLimit: number;
  tokenSet: boolean;
  configLocked: boolean;
}

export interface LinkStats {
  erc677Balance: string;
  bep20Balance: string;
  subscriptionBalance: string;
  totalLinkBalance: string;
  availableEthForLink: string;
  needsBuy: boolean;
  needsConvert: boolean;
  needsTopUp: boolean;
  totalLinkPurchased: string;
  totalEthSpent: string;
  received: string;
}

export enum TriggerStatus {
  Success = 0,
  TokenNotSet = 1,
  KoiInProgress = 2,
  IntervalNotReached = 3,
  NoHolders = 4,
  PoolTooSmall = 5,
  InsufficientLink = 6
}

export interface LotteryRecord {
  requestId: string;
  winner: string;
  reward: string;
  percentage: number;
  blockNumber: number;
  txHash: string;
}

export interface WalletProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  detectFlag: string;
  globalVar?: string;
}

export interface HolderData {
  address: string;
  balance: string;
  isValid: boolean;
  graceEnd: number;
}
