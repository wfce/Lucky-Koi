
# 幸运锦鲤 (Lucky Koi Protocol) 🎏 - 前端

> 全球首款基于 Chainlink VRF V2.5 驱动的 **无后端、全去中心化** 物理级真随机瑞气平台。
> **代码即法律 (Code is Law)** | **持仓即激活 (Hold to Activate)**

[![Website](https://img.shields.io/badge/Website-jinli.lol-red)](https://jinli.lol/)
[![Twitter](https://img.shields.io/badge/Twitter-jinli__bnb-blue)](https://x.com/jinli_bnb)
[![Telegram](https://img.shields.io/badge/Telegram-Join_Chat-0088cc)](https://t.me/jinli_bnb)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![BSC](https://img.shields.io/badge/Network-BSC_Mainnet-F3BA2F.svg)

## 🔗 官方频道
*   **官方网站:** [https://jinli.lol/](https://jinli.lol/)
*   **推特 (X):** [https://x.com/jinli_bnb](https://x.com/jinli_bnb)
*   **电报社群:** [https://t.me/jinli_bnb](https://t.me/jinli_bnb)

## 📖 项目简介

**Lucky Koi Protocol** 是一个完全运行在 BNB Chain (BSC) 主网上的自动化协议。本项目不仅是一个抽奖应用，更是一个展现 Web3 原生力量的实验：**100% 纯智能合约驱动，完全不依赖中心化后端服务器或数据库。**

通过 **Chainlink VRF** 提供的物理级真随机数，协议确保了每一次“锦鲤”的诞生都是天意所属。任何人持有指定代币并完成链上“激活福泽”操作，即可永久获得参与资格。

## ✨ 核心特性

*   **🚫 0 后端 (Zero Backend):** 所有业务逻辑、历史数据查询（通过 Event Log）、用户状态均在链上实时获取，无服务器宕机风险。
*   **🎲 物理真随机 (True Randomness):** 集成最新版 Chainlink VRF V2.5。随机数不可预测、不可操纵，且在链上公开可验证。
*   **🔓 全开源 & 永续 (OSS & Forever):** 合约与前端代码完全开源。协议不绑定特定域名，任何人都可以部署自己的 UI 界面，甚至直接在 [BscScan](https://bscscan.com) 上与合约交互。
*   **🧧 激活即福泽 (Hold to Win):** 创新性“激活福泽”机制。无需购买彩票，只需持有代币并激活身份，即可永久分享每一轮 BNB 福泽奖池。
*   **🤝 自动化悬赏 (Decentralized Trigger):** 任何人均可手动“唤醒锦鲤”触发开奖，并自动获得 Gas 补偿及 BNB 赏金。
*   **📱 广泛兼容:** 完美支持移动端。建议使用 **Generic Wallet** 模式连接各种 Web3 浏览器插件或网关。

## 🛠 技术实现

*   **前端框架:** React 19 + TypeScript (采用 ESM 模块化架构)
*   **Web3 通信:** Ethers.js v6 (高效低延迟 RPC 调用)
*   **UI/UX:** Tailwind CSS + 毛玻璃 (Glassmorphism) 现代化设计语言
*   **数据查询:** 智能路由策略，优化 7200 区块（约 6 小时）深度历史记录检索。

## 📜 详细规则 (Rules)

### 1. 激活福泽身份
*   钱包需持有最低门槛代币（由合约配置）。
*   点击 **“激活福泽”** 完成一次性链关注册，即可加入锦鲤名册。

### 2. 福泽分配
*   **开奖周期:** 每 30 分钟。
*   **中奖权重:** 最低持仓获得 50% 奖池，满额持仓获得 100%。剩余资金滚入下轮。
*   **自动分发:** 中奖后，BNB 奖金将由合约直接发送至获选者钱包，**无需手动申领**。

### 3. 唤醒机制 (Community Governance)
*   当倒计时结束且奖池充足，前端将进入“可唤醒”状态。
*   首个调用 `triggerKoi` 的用户将获得：`Gas 消耗退回 + 额外 BNB 奖励`。

### 4. 黑暗森林 (Audit)
*   协议开放审计权限。若某用户激活后卖出代币导致持仓不足，任何人可发起“举报”。被举报者有 1 小时宽限期。

## 📂 部署指南

1.  **克隆项目**
2.  **配置 `constants/index.ts` 中的合约地址**
3.  **构建并托管到任何静态托管平台**（如 Vercel, GitHub Pages, IPFS 等）
4.  **无服务器，无忧维护。**

## 📄 开源协议

基于 MIT 协议开源。我们坚信 Web3 的核心在于透明与共享。
