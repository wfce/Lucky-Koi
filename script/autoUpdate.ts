//npx hardhat run scripts/autoUpdate.ts --network bscMainnet
import { ethers } from "ethers";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config();

// ================= 配置 =================
const TOKEN_ADDRESS    = "0x422dc0df861413dc2660731b0e376691cc0b7777"; // 代币合约地址
const CONTRACT_ADDRESS = "0x76d12acfDdd69979A9f24BDaB07687731Cb78213"; // 奖池合约地址
const BSC_MAINNET_RPC  = process.env.BSC_MAINNET_RPC || "";
const PRIVATE_KEY      = process.env.PRIVATE_KEY || "";

if (!BSC_MAINNET_RPC || !PRIVATE_KEY || !CONTRACT_ADDRESS || !TOKEN_ADDRESS) {
  throw new Error("请在 .env 配置 BSC_RPC, ADMIN_PRIVATE_KEY, CONTRACT_ADDRESS, TOKEN_ADDRESS");
}

// ================= ABI =================
const LuckyKoiABI = [
  "function setHoldingRequirements(uint256 newMinHold, uint256 newFullHold) external",
  "function getOwnershipInfo() view returns (address currentOwner, address admin, bool ownerRenounced, bool adminRenounced, bool tokenIsLocked)",
  "function s_minHolding() view returns (uint256)",
  "function s_fullHolding() view returns (uint256)",
  "function s_token() view returns (address)"
];

// ERC20 ABI 用于获取 decimals
const ERC20ABI = [
  "function decimals() view returns (uint8)"
];

// ================= 阈值 =================
const thresholds = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
const MIN_HOLDINGS = [1_500_000, 750_000, 300_000, 150_000, 75_000, 30_000, 15_000];
const FULL_HOLDINGS = [10_000_000, 10_000_000, 5_000_000, 5_000_000, 5_000_000, 5_000_000, 5_000_000];

function calcHoldingByThresholds(marketcap: number): { minHolding: number; fullHolding: number } {
  for (let i = 0; i < thresholds.length; i++) {
    if (marketcap <= thresholds[i]) {
      return { minHolding: MIN_HOLDINGS[i], fullHolding: FULL_HOLDINGS[i] };
    }
  }
  return { minHolding: MIN_HOLDINGS[MIN_HOLDINGS.length - 1], fullHolding: FULL_HOLDINGS[FULL_HOLDINGS.length - 1] };
}

// ================= 获取代币市值 (USD) =================
async function fetchMarketcapUSD(tokenAddress: string): Promise<number> {
  const query = `
  query Coin($address:String) {
    coin(address: $address) {
      marketcap(round: 18)
      quoteToken
    }
  }`;

  const res = await fetch("https://0pi75kmgw9.execute-api.eu-west-3.amazonaws.com/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { address: tokenAddress } })
  });

  const data = await res.json() as any;
  const coin = data?.data?.coin;
  if (!coin) throw new Error("未获取到代币信息");

  let marketcap = parseFloat(coin.marketcap || "0");
  if (!marketcap) throw new Error("marketcap为空");

  // 如果 quoteToken 不是 USD，需要换算
  const quoteToken = coin.quoteToken?.toLowerCase();
  if (quoteToken !== "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c") { // WBNB
    console.log("⚠️ 代币报价非USD，当前使用原始市值数值");
  }

  return marketcap;
}

// ================= 获取链上当前持仓要求 =================
async function getCurrentHoldingRequirements(
  contract: ethers.Contract,
  provider: ethers.JsonRpcProvider
): Promise<{ currentMinHolding: bigint; currentFullHolding: bigint; decimals: number }> {
  // 获取当前链上的 minHolding 和 fullHolding（带 decimals 的原始值）
  const currentMinHolding = await contract.s_minHolding();
  const currentFullHolding = await contract.s_fullHolding();
  
  // 获取代币地址和 decimals
  const tokenAddress = await contract.s_token();
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const decimals = await tokenContract.decimals();
  
  return {
    currentMinHolding,
    currentFullHolding,
    decimals: Number(decimals)
  };
}

// ================= 判断当前市值所属区间 =================
function getThresholdRange(marketcap: number): { lowerBound: number; upperBound: number; rangeIndex: number } {
  for (let i = 0; i < thresholds.length; i++) {
    if (marketcap <= thresholds[i]) {
      return {
        lowerBound: i === 0 ? 0 : thresholds[i - 1],
        upperBound: thresholds[i],
        rangeIndex: i
      };
    }
  }
  // 超过所有阈值
  return {
    lowerBound: thresholds[thresholds.length - 1],
    upperBound: Infinity,
    rangeIndex: thresholds.length
  };
}

// ================= 主程序 =================
async function main() {
  const provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
  const adminWallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const contract = new ethers.Contract(CONTRACT_ADDRESS, LuckyKoiABI, adminWallet);

  console.log("🚀 自动持仓更新启动，每5分钟检查市值(USD)...");
  console.log(`📝 合约地址: ${CONTRACT_ADDRESS}`);
  console.log(`📝 代币地址: ${TOKEN_ADDRESS}`);
  console.log(`📝 Admin地址: ${adminWallet.address}\n`);

  while (true) {
    try {
      // 1. 获取当前市值
      const marketcap = await fetchMarketcapUSD(TOKEN_ADDRESS);
      
      // 2. 根据市值计算应该设置的持仓值（不带 decimals）
      const { minHolding: targetMinHolding, fullHolding: targetFullHolding } = calcHoldingByThresholds(marketcap);
      
      // 3. 获取链上当前值
      const { currentMinHolding, currentFullHolding, decimals } = await getCurrentHoldingRequirements(contract, provider);
      
      // 4. 计算带 decimals 的目标值用于比较
      const unit = BigInt(10 ** decimals);
      const targetMinHoldingWithDecimals = BigInt(targetMinHolding) * unit;
      const targetFullHoldingWithDecimals = BigInt(targetFullHolding) * unit;
      
      // 5. 获取当前区间信息
      const rangeInfo = getThresholdRange(marketcap);
      
      console.log(`[${new Date().toISOString()}]`);
      console.log(`  📊 当前市值(USD): $${marketcap.toLocaleString()}`);
      console.log(`  📊 市值区间: $${rangeInfo.lowerBound.toLocaleString()} - $${rangeInfo.upperBound === Infinity ? '∞' : rangeInfo.upperBound.toLocaleString()}`);
      console.log(`  📌 链上当前值: minHolding=${ethers.formatUnits(currentMinHolding, decimals)}, fullHolding=${ethers.formatUnits(currentFullHolding, decimals)}`);
      console.log(`  📌 目标值: minHolding=${targetMinHolding.toLocaleString()}, fullHolding=${targetFullHolding.toLocaleString()}`);

      // 6. 比较是否需要更新
      const needsUpdate = currentMinHolding !== targetMinHoldingWithDecimals || 
                         currentFullHolding !== targetFullHoldingWithDecimals;

      if (needsUpdate) {
        console.log(`  ⚠️ 检测到持仓要求不一致，需要更新`);
        
        // 验证是否为 Admin
        const ownershipInfo = await contract.getOwnershipInfo();
        
        if (adminWallet.address.toLowerCase() !== ownershipInfo.admin.toLowerCase()) {
          console.log(`  ❌ 当前账户不是 Admin，跳过更新`);
          console.log(`     当前账户: ${adminWallet.address}`);
          console.log(`     合约Admin: ${ownershipInfo.admin}`);
        } else {
          console.log(`  🔄 调用 setHoldingRequirements 链上更新...`);
          console.log(`     新值: minHolding=${targetMinHolding}, fullHolding=${targetFullHolding}`);
          
          const tx = await contract.setHoldingRequirements(targetMinHolding, targetFullHolding);
          console.log(`  📤 交易已提交, hash: ${tx.hash}`);
          
          const receipt = await tx.wait(2);
          console.log(`  ✅ 更新完成! 区块: ${receipt?.blockNumber}`);
        }
      } else {
        console.log(`  ✅ 链上值与目标值一致，无需更新`);
      }

    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] ❌ 执行失败:`, e.message);
    }

    console.log(`\n⏳ 等待5分钟后再次检查...\n${'='.repeat(60)}\n`);
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
  }
}

main().catch(console.error);