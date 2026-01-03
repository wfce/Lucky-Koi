
# 幸运锦鲤 (Lucky Koi Protocol) 🎏 - 前端

> 全球首款基于 Chainlink VRF V2.5 驱动的去中心化物理级真随机瑞气平台。
> **代码即法律 (Code is Law)** | **持仓即入池 (Hold to Win)**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)
![BSC](https://img.shields.io/badge/Network-BSC_Testnet-F3BA2F.svg)

## 📖 项目简介

**Lucky Koi Protocol** 是一个运行在 BNB Chain (BSC) 测试网上的去中心化应用 (DApp)。它打破了传统彩票“买票候奖”的模式，创新性地采用了“持仓即挖矿/中奖”的机制。

只要用户的钱包持有指定数量的代币（目前配置为 BUSD）并完成链上注册，即可永久获得每轮抽奖资格。整个过程由 **Chainlink Automation** 自动触发，并由 **Chainlink VRF** 提供不可篡改的链上随机数，确保绝对公平。

## ✨ 核心特性

*   **🚫 无需购票 (No Tickets):** 告别重复消费。一次注册，终身参与（只要持仓达标）。
*   **🎲 物理真随机 (True Randomness):** 集成 Chainlink VRF V2.5，随机数生成过程链上可验证，杜绝黑箱操作。
*   **🤖 全自动运行 (Fully Automated):** 基于 Chainlink Automation，从开奖、选人到派发奖金，全流程无需人工干预。
*   **⚖️ 动态奖金 (Dynamic Rewards):** 奖金权重与持仓量挂钩。持仓越多，获得奖池的比例越高（50% - 100%）。
*   **🛡️ 社区治理 (Governance):** 引入“黑暗森林”机制。任何人可审计持仓不足的用户，触发熔断与清理机制。
*   **♻️ 资产回收 (Recycle):** 30天无人认领的奖金（死账户/黑名单）将被社区回收至总奖池，防止资金沉淀。

## 🛠 技术栈

本项目为纯前端工程，通过 RPC 与智能合约交互。

*   **核心框架:** React 18, TypeScript, Vite
*   **UI 库:** Tailwind CSS, Lucide React (图标)
*   **Web3 交互:** Ethers.js v6
*   **合约网络:** BSC Testnet (Chain ID: 97)

## 🚀 快速开始

### 前置要求

*   Node.js (v16+)
*   npm 或 yarn
*   MetaMask 等 Web3 钱包插件

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/wfce/Lucky-Koi.git
    cd Lucky-Koi
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **启动开发服务器**
    ```bash
    npm run dev
    ```

4.  **构建生产版本**
    ```bash
    npm run build
    ```

## 📜 详细规则 (Game Rules)

### 1. 参与门槛
*   用户需持有目标代币（如 BUSD）。
*   **最低持仓:** 10,000 Token (由合约配置决定)。
*   **注册:** 连接钱包并点击“立即激活锦鲤身份” (Register) 上链。

### 2. 开奖机制
*   **触发条件:** 时间间隔满足（如每 1 小时） + 奖池资金充足 + LINK 燃料充足。
*   **执行:** Chainlink Automation 会自动检测并调用 `performUpkeep`，或由用户手动点击“唤醒锦鲤”触发。
*   **随机数:** 合约请求 VRF 随机数，Chainlink 节点返回随机值，计算出中奖索引。

### 3. 奖金分配算法
中奖者获得的奖金比例由其持仓量决定：
*   **持仓 = 最低门槛 (10k):** 获得当前奖池的 **50%**。
*   **持仓 >= 满额门槛 (20k):** 获得当前奖池的 **100%**。
*   **中间值:** 线性插值计算。
*   *剩余未分配的资金将保留在奖池中滚入下一轮。*

### 4. 社区治理与审计
为了防止投机者注册后卖出代币占用名额，协议开放了审计功能：
1.  **探测:** 任何人可在“锦鲤名册”中查看所有持有人状态。
2.  **举报:** 若发现某地址余额低于门槛，可发起 `reportInvalid`。
3.  **宽限期:** 被举报者有 **1 小时** 宽限期补足资金。
4.  **清理:** 宽限期过后仍未达标，任何人可将其从队列中移除 (`cleanup`)。

### 5. 悬赏机制 (Gas Reward)
为了激励社区参与维护：
*   **唤醒悬赏:** 手动触发开奖的用户，合约会返还 Gas 费并额外给予 BNB 奖励。
*   **清理悬赏:** 批量清理无效用户可帮助协议瘦身，维持随机数计算的 Gas 效率。

## 📂 目录结构

```
.
├── index.html          # 入口 HTML
├── index.tsx           # React 入口
├── App.tsx             # 主应用逻辑与视图
├── UIComponents.tsx    # 可复用的 UI 组件 (卡片、模态框等)
├── Logo.tsx            # SVG Logo 组件
├── WalletIcons.tsx     # 钱包图标组件
├── abi.ts              # 智能合约 ABI 定义
├── types.ts            # TypeScript 类型定义
├── constants.ts        # 常量配置 (合约地址、RPC)
└── utils.ts            # 工具函数 (错误解析、格式化)
```

## ⚠️ 免责声明

本项目仅供学习与技术交流使用。智能合约部署在 BSC 测试网。涉及真实资产交互时，请务必自行审查代码风险。作者不对任何因合约漏洞或操作失误导致的资产损失负责。

## 📄 开源协议

MIT License.
