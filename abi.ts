
export const LUCKY_LOTTERY_ABI = [
  // 写操作
  "function setToken(address tokenAddr, uint256 minHold, uint256 fullHold) external",
  "function buyLink() external",
  "function topUpSubscription() external",
  "function maintainLink() external",
  "function unwrapAllWBNB() external returns (uint256)",
  "function register() external",
  "function unregister() external",
  "function claimPendingReward() external",
  "function recycleStuckPending(address user) external",
  "function triggerKoi() external returns (uint8 status, bool triggered)",
  "function cleanup(uint256 maxIterations) external returns (uint256 processed, uint256 removed)",
  "function reportInvalid(address holder) external",
  "function cancelStuckKoi() external",

  // 读操作
  "function canTriggerKoi() external view returns (bool)",
  "function checkTriggerStatus() external view returns (uint8 status, bool canTrigger)",
  "function calculateGasReward() external view returns (uint256)",
  "function getKoiPool() external view returns (uint256)",
  "function getActualKoiPool() external view returns (uint256)",
  "function getMinPossibleReward() external view returns (uint256)",
  "function isPoolSufficient() external view returns (bool)",
  "function getContractLinkBalance() external view returns (uint256)",
  "function getSubscriptionBalance() external view returns (uint96)",
  "function getTotalLinkBalance() external view returns (uint256)",
  "function getHolderCount() external view returns (uint256)",
  "function needsLinkPurchase() external view returns (bool)",
  "function hasLinkToTopUp() external view returns (bool)",
  
  // 结构化统计信息
  "function getTriggerStatusDetails() external view returns (uint8 status, bool canTrig, uint256 timeUntilNext, uint256 currentPool, uint256 minReward, uint256 holderCnt, uint256 linkBal)",
  "function getContractStats() external view returns (uint256 holderCnt, uint256 pool, uint256 nextTime, uint256 lotteries, uint256 rewards, uint256 pendingTotal, bool canTrig, bool inProg)",
  "function getPoolStats() external view returns (uint256 pool, uint256 minReward, uint256 maxReward, uint256 minRequired, bool sufficient)",
  "function getGasRewardStats() external view returns (uint256 total, uint256 current, uint256 base, uint256 max)",
  "function getTriggerStats() external view returns (uint256 attempts, uint256 skipped, uint256 rate)",
  "function getLinkStats() external view returns (uint256 contractBal, uint96 subBal, uint256 totalBal, uint256 availEth, bool needsBuy, bool hasTopUp, uint256 purchased, uint256 spent, uint256 received)",
  "function getUserInfo(address user) external view returns (bool registered, uint256 balance, uint256 rewardPct, bool valid, uint256 won, uint256 winCnt, uint256 pendingAmt)",
  "function getUserTriggerInfo(address user) external view returns (uint256 triggers, uint256 gasRewards, uint256 attempts, uint256 donations)",
  "function getConfig() external view returns (address tokenAddr, address linkAddr, address routerAddr, address wbnbAddr, address quoterAddr, uint256 minHold, uint256 fullHold, uint256 koiInterval, uint256 maxH, uint32 gasLimit, bool tokenIsSet)",
  "function previewRewardPercentage(uint256 balance) external view returns (uint256)",
  "function getPendingDetails(address user) external view returns (uint256 amount, uint256 since, bool canRecycle, uint256 recycleTime)",
  "function getCleanupProgress() external view returns (uint256 idx, uint256 total, uint256 remaining, uint256 pct)",
  "function getHolders(uint256 start, uint256 count) external view returns (address[])",

  // 事件
  "event Registered(address indexed holder, uint256 balance)",
  "event Unregistered(address indexed holder)",
  "event InvalidRemoved(address indexed holder)",
  "event InvalidMarked(address indexed holder, uint256 expiry)",
  "event KoiTriggered(uint256 indexed reqId, address indexed triggeredBy)",
  "event KoiTriggerSkipped(address indexed user, uint8 indexed status)",
  "event WinnerSelected(uint256 indexed reqId, address indexed winner, uint256 reward, uint256 pct)",
  "event RewardSent(address indexed winner, uint256 amount)",
  "event RewardPending(address indexed winner, uint256 amount)",
  "event RewardClaimed(address indexed user, uint256 amount)",
  "event KoiFailed(uint256 indexed reqId)",
  "event LinkPurchased(uint256 ethSpent, uint256 linkReceived)",
  "event LinkTopUp(uint256 amount)",
  "event CleanupProgress(uint256 processed, uint256 remaining, uint256 removed)",
  "event PendingRecycled(address indexed user, uint256 amount)",
  "event GasRewardSent(address indexed trigger, uint256 amount)"
];

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];
