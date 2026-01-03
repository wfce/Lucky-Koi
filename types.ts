
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
  // User Trigger Stats
  triggers: number;
  gasRewardsCollected: string;
}

export interface GasRewardStats {
  totalPaid: string;
  currentBounty: string;
  baseReward: string;
  maxReward: string;
}

export interface ContractConfig {
  tokenAddress: string;
  linkToken: string;
  swapRouter: string;
  weth: string;
  quoter: string;
  minHolding: string;
  fullRewardHolding: string;
  lotteryInterval: number;
  maxHolders: number;
  callbackGasLimit: number;
  tokenSet: boolean;
}

export interface LinkStats {
  contractLinkBalance: string;
  subscriptionBalance: string;
  totalLinkBalance: string;
  availableEthForLink: string;
  needsBuy: boolean;
  needsTopUp: boolean;
  totalLinkPurchased: string;
  totalEthSpent: string;
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
