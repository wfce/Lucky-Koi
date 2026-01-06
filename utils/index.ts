
import { ethers } from 'ethers';

/**
 * 根据智能合约自定义错误代码解析为精准的中文提示
 */
export const parseRpcError = (error: any, t: (key: string) => string): { title: string, message: string } => {
  if (error.code === 4001 || (error.action === "sendTransaction" && error.code === "ACTION_REJECTED")) {
    return { title: t('errors.cancelled'), message: t('errors.cancelledDesc') };
  }

  if (error.code === "INSUFFICIENT_FUNDS") {
    return { title: t('errors.insufficientFunds'), message: t('errors.insufficientFundsDesc') };
  }

  let errorString = "";
  if (typeof error === 'string') errorString = error;
  else {
      const data = error.data || (error.error && error.error.data) || (error.payload && error.payload.error && error.payload.error.data) || "";
      const message = error.message || "";
      const reason = error.reason || "";
      errorString = `${message} ${data} ${reason}`;
  }

  if (errorString.includes("LotteryNotReady")) {
    return { title: t('errors.lotteryNotReady'), message: t('errors.lotteryNotReadyDesc') };
  }
  if (errorString.includes("AlreadyRegistered")) {
    return { title: t('errors.alreadyRegistered'), message: t('errors.alreadyRegisteredDesc') };
  }
  if (errorString.includes("NotRegistered")) {
    return { title: t('errors.notRegistered'), message: t('errors.notRegisteredDesc') };
  }
  if (errorString.includes("InsufficientBalance")) {
    return { title: t('errors.insufficientBalance'), message: t('errors.insufficientBalanceDesc') };
  }
  if (errorString.includes("MaxHoldersReached")) {
    return { title: t('errors.maxHolders'), message: t('errors.maxHoldersDesc') };
  }
  if (errorString.includes("NoPendingRewards")) {
    return { title: t('errors.noPending'), message: t('errors.noPendingDesc') };
  }
  if (errorString.includes("InsufficientLink")) {
    return { title: t('errors.insufficientLink'), message: t('errors.insufficientLinkDesc') };
  }
  if (errorString.includes("StillValid")) {
    return { title: t('errors.stillValid'), message: t('errors.stillValidDesc') };
  }
  if (errorString.includes("NoKoiInProgress")) {
    return { title: t('errors.noStuck'), message: t('errors.noStuckDesc') };
  }
  if (errorString.includes("TimeoutNotReached")) {
    return { title: t('errors.timeoutNotReached'), message: t('errors.timeoutNotReachedDesc') };
  }
  if (errorString.includes("PendingTimeoutNotReached")) {
    return { title: t('errors.recycleNotUnlocked'), message: t('errors.recycleNotUnlockedDesc') };
  }
  if (errorString.includes("TokenNotSet")) {
    return { title: t('errors.tokenNotSet'), message: t('errors.tokenNotSetDesc') };
  }
  if (errorString.includes("TokenLocked")) {
    return { title: "代币已锁定", message: "代币配置已被永久锁定，无法修改。" };
  }
  if (errorString.includes("TransferFailed")) {
    return { title: "转账失败", message: "BNB 转账执行失败，请检查合约余额。" };
  }
  if (errorString.includes("KoiInProgress")) {
    return { title: "锦鲤甄选中", message: "甄选流程正在运行，合约此时已锁定，禁止修改名册。" };
  }
  if (errorString.includes("MaxHoldersTooLow")) {
    return { title: "上限过低", message: "设置的持有者上限不能低于当前人数。" };
  }
  if (errorString.includes("InvalidParam")) {
    return { title: "无效参数", message: "输入的参数不符合合约要求。" };
  }
  if (errorString.includes("NotLinkToken")) {
    return { title: "非 LINK 代币", message: "仅支持 LINK 代币转账。" };
  }

  if (error.code === "NETWORK_ERROR") {
    return { title: t('errors.network'), message: t('errors.networkDesc') };
  }
  
  if (errorString.includes("user rejected")) {
      return { title: t('errors.userRejected'), message: t('errors.userRejectedDesc') };
  }

  return { title: t('errors.unknown'), message: t('errors.unknownDesc') };
};

export const formatTokens = (val: string | bigint | undefined, decimals: number) => {
  if (val === undefined || val === null) return "0.00";
  try {
    const formatted = ethers.formatUnits(val, decimals);
    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch (e) { return "0.00"; }
}
