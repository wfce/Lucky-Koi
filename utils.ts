
import { ethers } from 'ethers';

/**
 * 根据智能合约自定义错误代码解析为中文提示
 */
export const parseRpcError = (error: any): { title: string, message: string } => {
  console.error("RPC Error Details:", error);
  
  // 1. 基础钱包行为处理
  if (error.code === 4001 || (error.action === "sendTransaction" && error.code === "ACTION_REJECTED")) {
    return { title: "已取消交易", message: "您在钱包中拒绝了本次操作请求。" };
  }

  if (error.code === "INSUFFICIENT_FUNDS") {
    return { title: "BNB 余额不足", message: "您的账户中 BNB 不足以支付当前的 Gas 费用。" };
  }

  // 2. 提取合约自定义错误 (Custom Errors)
  // Ethers v6 错误通常在 error.data 或 error.reason 中
  const errorData = error.data || (error.error && error.error.data);
  const message = error.message || "";
  const reason = error.reason || "";

  // 匹配合约内部定义的错误名
  if (message.includes("LotteryNotReady") || reason.includes("LotteryNotReady")) {
    return { title: "开奖条件未满足", message: "时间间隔未到、奖池为空或 LINK 燃料不足。" };
  }
  if (message.includes("AlreadyRegistered") || reason.includes("AlreadyRegistered")) {
    return { title: "无需重复注册", message: "您已经是该协议的注册持有者了。" };
  }
  if (message.includes("NotRegistered") || reason.includes("NotRegistered")) {
    return { title: "未注册用户", message: "请先点击注册，即可获得分红权益。" };
  }
  if (message.includes("InsufficientBalance") || reason.includes("InsufficientBalance")) {
    return { title: "代币持仓不足", message: "您的代币余额未达到协议规定的最低门槛。" };
  }
  if (message.includes("MaxHoldersReached") || reason.includes("MaxHoldersReached")) {
    return { title: "池子已满", message: "已达到最大持有者限制，请等待他人注销或合约升级。" };
  }
  if (message.includes("NoPendingRewards") || reason.includes("NoPendingRewards")) {
    return { title: "暂无待领奖金", message: "您的待领池中目前没有可提取的 BNB。" };
  }
  if (message.includes("GracePeriodNotExpired") || reason.includes("GracePeriodNotExpired")) {
    return { title: "宽限期未过", message: "该用户处于无效状态但仍在宽限期内，暂不能移除。" };
  }
  if (message.includes("TokenNotSet") || reason.includes("TokenNotSet")) {
    return { title: "配置异常", message: "合约管理员尚未设置参与代币地址。" };
  }
  if (message.includes("NotDeployer") || reason.includes("NotDeployer")) {
    return { title: "无权操作", message: "该功能仅限合约部署者使用。" };
  }
  if (message.includes("PendingTimeoutNotReached") || reason.includes("PendingTimeoutNotReached")) {
    return { title: "未到回收时间", message: "待领奖金需超过 30 天未领方可回收。" };
  }
  if (message.includes("InsufficientLinkBalanceForVRF") || reason.includes("InsufficientLinkBalanceForVRF")) {
    return { title: "VRF 燃料不足", message: "订阅账户中的 LINK 不足，请先执行‘维护 LINK’操作。" };
  }
  if (message.includes("StillValid") || reason.includes("StillValid")) {
    return { title: "用户仍然有效", message: "该用户的持仓仍然满足要求，无法标记为无效。" };
  }

  // 3. 通用网络错误
  if (error.code === "NETWORK_ERROR") {
    return { title: "网络异常", message: "无法连接至区块链节点，请检查网络或切换 RPC。" };
  }

  return { title: "操作失败", message: reason || "智能合约拒绝了请求，请确保满足参与条件。" };
};

/**
 * 格式化代币显示
 */
export const formatTokens = (val: string | bigint | undefined, decimals: number) => {
  if (val === undefined || val === null) return "0.00";
  try {
    const formatted = ethers.formatUnits(val, decimals);
    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch (e) { return "0.00"; }
};
