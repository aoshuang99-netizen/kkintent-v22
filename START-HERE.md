# 从这里开始 · KK Intent OS v22（第 8 轮）

> 生成时间：2026-10-17 14:3x　|　轮次：round 8　|　产品：`kkmatch.com/v22/`
> 这个包的目的：把「这几天做了什么、代码在哪、现在卡在哪」一次性交出去，让 Codex / GPT 能直接接手做二次规划与审计，不用重读 12 轮对话。

---

## 0. 三十秒版

| 问题 | 答案 |
|---|---|
| 产品是什么 | 一个纯静态的「意图操作系统」交互预览，三个界面 + 一个营销长页，无后端、无框架、无构建步骤 |
| 线上地址 | `https://kkmatch.com/v22/`（门口 → 先觉之境）、`https://kkmatch.com/v22/hub/`（三方案 hub） |
| 分享链接 | `https://kkmatch-gcai-preview.app.workbuddy.host/`（67 文件全量，与本地逐字节一致） |
| 代码在哪 | 本包 `02-product/`（67 文件）；线上 `/opt/kk-match/frontend/v22`（30 文件，仅被 nginx 服务的部分） |
| **有没有 git 仓库** | **没有。** 本地与生产端都是纯目录，`git rev-parse` 三处全 fatal。版本身份只能靠 sha256 |
| 验收结果 | 生产 **587/587 PASS，0 FAIL，33 INFO**（20 段 / 589 条声明，2 条 `shots` 本机跑不了）；分享链接 **536/536 PASS，33 INFO** |
| 现在最大的卡点 | 产品有 9 条**目前无法诚实声称**的事（`01-handoff/07-BACKLOG.md`），且其中「confidence 未校准」这一条直接动摇产品论点 |

---

## 1. 这几天做了什么（轮次时间线）

断言数逐轮增长，每一条都是**能失败**的检查，不是「看起来对了」：

| 轮次 | 断言数 | 这一轮解决的事 |
|---|---|---|
| 1 | 220 | 读参考清单、抓参考站点、产出两个交互概念；附带的「生产级单文件 HTML」经逐行review **跑不起来**（1 个占位 CDN、1 个错方法名、3 处语法错、2 处静默空操作） |
| 2 | 347 | 裁定 S（先觉之境）为主线 = 意图操作系统；N 保留为**冻结参考**不删；新增第三个界面（长滚动营销页） |
| 3 | 408 | 上手机：真机宽度下不能有遮挡、要像 App |
| 4 | 467 | 进生产：`/v22/` 上线 |
| 5 | 507 | 默认语言改英文，并做三路对照（默认==显式英 且 != 显式中） |
| 6 | 537 | 新增 `seo` 段（必须打真源站才能读响应头）；补 `nav` 段，因为首页入口在 700px 以下**曾经整条隐形** |
| 7 | 573 | 新增 `navclosure`：每个界面都要能「不用浏览器后退键」走出去 |
| **8（本包）** | **589 声明 / 587 执行** | **根路径直达先觉之境**：`/` 变成「门口」，hub 迁到 `/hub/`，sitemap 四条随之移动 |

**第 8 轮是这几天的核心事件，值得单独说。** 需求只有一句「我需要的是先觉之境的版本」，看起来是一行改动（`index.html` 变成跳转页），实际是 **12 个文件必须同一原子集一起动**：

- 本地改 9 个文件 + 新建 1 个（`hub/index.html`）；生产端改 7 个（文档与门禁不进 web root）
- 关键在于：**「回到 hub」被用四种不同写法写在四个地方** —— `anticipate` 里是 `../../../`、`compile` 里是 `../../../`、`site` 里是 3 个 `../../`、hub 自己是 `https://kkmatch.com/`。每一处都是关于「我这份文档有多深」的断言。只把 hub 挪到 `/hub/` 而不动它们，`anticipate` 的「回到 hub」就会**落到它自己身上**，而 diff 里看起来毫无问题。
- 同时暴露 4 个陷阱（已全部在发布前发现，详见 `01-handoff/03-ROUND8-ROUTING.md` 与 `02-product/docs/DELIVERY.md` §11.18）：跳转必须原样转发 `?lang=`（否则中文读者被静默换成英文）；必须用 `location.replace`（否则后退键把人弹回跳转页）；`<noscript>` 里的 meta refresh 是**所有开 JS 的测试都看不见的**状态；`seo` 原本把 `index, follow` 写死成字面量，而门口是它的反面。

---

## 2. 产品是什么（一句话 + 三层）

**论点是**：大多数工具等你把话说完；这个界面**在你打第一个字之前**就已经在猜你要什么，并且把「它为什么这么猜」摊开给你看，让你能改、能拒、能追溯。

| 界面 | 角色 | 路径 |
|---|---|---|
| `anticipate`（先觉之境 / 概念 S） | **主线**。输入一句话 → 依赖图逐节点装配 → 终端逐行打印，且**每行都带它打印的那个值的路径**（`data-src="result.counts.nodes"`） | `02-product/preview/intent/anticipate/` |
| `compile`（概念 N） | **冻结参考**，不删不改，用来说明另一条路线 | `02-product/preview/intent/compile/` |
| `site` 长滚动页 | 对外讲述 | `02-product/preview/site/` |
| `hub` | 三方案入口 / 决策记录 | `02-product/hub/` |
| 根路径 `/` | **门口**：不渲染产品，只把人送到 `anticipate` | `02-product/index.html` |

**每个界面只有四个自己的文件**：`index.html` + 一个 CSS + 一个 i18n 词典 + 一个 JS。共享层（`assets/css/base.css`、`assets/js/os.js` 等）不许被某个界面的任务顺手改 —— 这条规矩来自真实事故，写在 `01-handoff/AGENTS.md`。

---

## 3. 代码地图

```
02-product/
├── index.html                    门口（3,270 B，无外链、无样式表：bundel 坏了它也能开门）
├── hub/index.html                hub（16,087 B）
├── preview/intent/anticipate/    主线界面
├── preview/intent/compile/       冻结参考
├── preview/site/                 长滚动页
├── assets/css/                   base + 每界面一个
├── assets/js/                    os.js / store.js / field.js / adapters.js / i18n*.js
├── assets/vendor/                唯一一个第三方库
├── docs/                         6 篇文档 + 25 张截图
└── e2e/acceptance.js             门禁本体（155,595 B / 约 2,800 行 / 20 段 / 589 条）

01-handoff/                       ★ 给 Codex/GPT 的审计材料（先读 README.md）
├── 01-CONTEXT.md                 产品两页纸
├── 02-ARCHITECTURE.md            命名空间、加载顺序、store、预测契约、i18n
├── 03-ROUND8-ROUTING.md          第 8 轮全过程
├── 04-RED-LINES.md               约束，每条附上制造它的事故
├── 05-FAILURE-LIBRARY.md         28 个缺陷：症状 → 根因 → 现在守着它的断言
├── 06-GATE.md                    门禁逐段说明 + 怎么拆分运行而不自欺
├── 07-BACKLOG.md                 ★ 9 条「目前不能诚实声称」的事（＝卡点）
├── 08-LOCATIONS.md               ★ 路径 / URL / 备份 / 基线方法
├── locations.json                上面那份的机读版
├── AGENTS.md                     给动手改代码的 agent 的规则
├── code/acceptance.js            门禁副本（与 02-product/e2e/ 同一份，sha256 相同）
├── scripts/                      verify_release.py 等工具
└── manifests/                    67 文件 sha256 + 双 origin 比对结果

03-evidence/                      发布证据（见该目录 README.md）
├── before-round8/                改动前那 9 个文件的原始字节
├── logs/                         四份真实门禁日志
└── *.tsv / *.json                改动前后从公网抓回来的逐文件哈希

04-devlog/                        这三天的开发日志（10-15 / 10-16 / 10-17 + 铁律）
```

---

## 4. 当前卡点

分四类。前两类是**实质问题**，后两类是**工程与决策**问题。

### 4.1 产品层：9 条目前无法诚实声称的事（最高优先级）

完整版在 `01-handoff/07-BACKLOG.md`，每条都写了「哪句断言能了结它」。按对论点的杀伤力排序，前三条是：

1. **`confidence 0.62` 是权重和，不是概率。** 这个数字单调，但从未被证明「打 0.62 的预测有 62% 被接受」。门禁只证明单调性和值域。要么改名让它别读成概率，要么真去测量（本地记录 ≥200 次预测的接受率，`|stated − observed| < 0.1`）。**这是唯一一条直接动摇产品论点的问题。**
2. **`notAModel` 会是第一个说谎的字段。** 载荷现在自称「不是模型」，但没有任何机制阻止将来的适配器只翻 `provider` 却忘了翻 `notAModel`。应该把配对做成不变量（`validatePrediction()` 直接拒绝），而不是约定。
3. **同意了「麦克风：拒绝」，但拒绝什么也没阻止。** 代码里根本没有 `getUserMedia` 调用 —— 「已拒绝」与「不可用」行为完全一致。这一行要么删掉，要么真的接上并断言「拒绝 = 零数据流」。

其余 6 条：装配图没有持久化叙事（reload 靠 `sessionStorage`，但「保留」被当成两种机制一个名字）、三个界面共用不了一个 header（读者换界面时目标位置会跳）、纯键盘走不通（卡片/抽屉/rail 全是用真指针测的）、`prefers-contrast` 未处理也未测过对比度（门禁量的是尺寸不是亮度）、**门禁已经比产品大**（2,800 行 vs 4,000 行，且有 3 个缺陷是审门禁时发现的 —— 问题是哪些断言从来没红过？）、两个 origin 不能同样测量（分享链接没有 nginx，`seo` 只能跳过）。

### 4.2 门禁层：三条测不了的断言

- **`shots`（2 条）本机永久跑不了**：沙箱拦截 Playwright 截图写盘（`EPERM`，栈里是 `node-brokered-fs-shim.cjs`），含 `page.screenshot` 的整段跑不完。**没有用假的通过来凑数** —— 而是换成三重替代证据：逐文件 sha256 独立复算（含「无多余文件」）+ 源树↔发布树逐字节比对 + 不带截图的只读探针。见 `01-handoff/05-FAILURE-LIBRARY.md` §5。
- **分享链接缺 `seo`（35 条）与 `nav`（16 条）**：前者要读 nginx 响应头，后者要拿真首页做基准，两者在无 nginx 的 origin 上都不存在。现在的答案是「在那里测 536 条并如实说明」，更好的答案是做成能力探针，自动报告「哪些断言在这个 origin 上不可测、为什么」，而不是手工维护排除清单。
- **从未见过红的断言等于假设**：建议按段做突变测试（一段一次，把产品改成该段声称守护的错误形态，看它是否变红），这是可脚本化、可重复的。

### 4.3 工程层：没有版本控制

- **回滚只能靠目录备份。** 生产端现存三份：`v22.bak_r6_20261016_204204`、`v22.bak_r7_20261017_111643`、`v22.bak_hubroot_20261017_0428`（另有两份 sitemap 备份）。目录备份分不清「我改的」和「路过的」，所以每轮都必须先算哈希集合、再比差异面。
- ⚠️ **不要 `git init` 进 `/opt/kk-match/frontend/v22`**：nginx 直接以它作 `root`，`.git/config` 会在 `https://kkmatch.com/v22/.git/config` 被公网读到。要上 VCS 就把仓放 web root 外面，从仓里部署。
- **还没做过回滚演练**：备份存在但从未实际恢复验证过。建议挑一个非关键产物做一次，否则「有备份」只是信念。

### 4.4 本机环境（会制造假失败，报错前先排除）

- **C 盘曾满到 0 字节**，导致进程以 `STATUS_COMMITMENT_LIMIT (0xC000012D)` / `DLL_INIT_FAILED (0xC0000142)` 崩溃，浏览器报 `THREE.WebGLRenderer: A WebGL context could not be created. VENDOR = 0x10de`，于是 `site,rm,fb` 段假报 2 条 FAIL。**资源恢复后同一段 53/53 PASS。** 判据是「进程退出码 + GPU 报错原文」，不是页面缺陷。
- **`PYTHONPATH` 被污染**，会让解释器启动即失败（`Failed to import encodings module`）→ 一律 `PYTHONPATH= python ...`。
- **Git Bash 的 `/tmp` Windows Python 看不见** → 中间文件放 `%TEMP%`。

---

## 5. 怎么跑起来

```bash
# 1) 本地预览（注意：这不是生产，头/状态码/404 行为都不同，别拿它做验收）
cd 02-product && python -m http.server 18091 --bind 127.0.0.1

# 2) 门禁 —— 必须按生产分组跑，单跑某段会因缺输入而假失败
export NODE_PATH=<node_modules>
N=node
for G in "hub,lang" "n,s,cross" "sound,contract,retain" "site,rm,fb" \
         "widths" "appbar" "mob,zoom" "touch" "seo" "nav" "navclosure"; do
  $N e2e/acceptance.js https://kkmatch.com/v22 $G
done

# 3) 部署是否等于本地 —— 两个方向都要看
python 01-handoff/scripts/verify_release.py --local 02-product \
    --base https://kkmatch-gcai-preview.app.workbuddy.host \
    --list 01-handoff/manifests/files67.txt
# 期望：files fetched 67 / byte-identical 67 / not identical 0 / exit 0
```

⚠️ **门禁会把产物写在自己上级目录的 `_audit/`**（`acceptance.js:2769` 写死）。在发布包里跑门禁会把 67 文件撑成 68/69 —— **先把 `e2e/acceptance.js` 复制到隔离目录再跑**。

---

## 6. 交给 Codex / GPT 怎么用

三段式，**不要合并**（合并的失败模式是：审计被跳过，而计划继承了审计的盲区）：

1. **审计（只读）**：读 `01-handoff/01` → `02` → `03` → `code/acceptance.js`，回答三问：哪里同一个事实有多个写者？哪条断言可能在它描述的东西坏掉时仍然通过？哪些用户可见的话没有对应断言？**这一轮的产出是清单，不是改动。**
2. **规划（仍只读）**：最多 5 条，每条必须带「主张 / 会失败的断言 / 动哪些文件 / 会把什么弄得更糟」。没有可证伪断言的条目不是计划项，是愿望。
3. **实施**：照 `01-handoff/AGENTS.md`。硬要求：锚点补丁带 `count()==1` 断言、只写 LF、不做依赖时钟的断言、**永远不要凭工具回话说「改好了」**。

---

## 7. 这个包里我没有做的事（诚实清单）

- 没有伪造任何 URL、哈希、截图或进度。所有数字都能在 `03-evidence/` 或 `02-product/docs/DELIVERY.md` 里追到出处。
- **不含服务器密码**：`04-devlog/MEMORY-redacted.md` 是从原始记忆文件复制后**对密码做了替换**的版本（构建脚本对成品树做了全树扫描并断言 0 命中）。原始文件在开发机上，需凭据请走带外渠道。
- 截图是**上一轮状态**的影像证据，不含本轮门口改动；所有断言都不依赖截图。
- `01-handoff/code/acceptance.js` 与 `02-product/e2e/acceptance.js` 是同一份文件（sha256 相同），重复放置是为了让审计材料自带门禁、可独立阅读。

---

## English abstract (for the reviewing agent)

Static, framework-free interaction preview for an "intent OS": a sentence enters,
a dependency graph assembles, a terminal prints every step **with the path of the
value it prints**. Three surfaces plus a door; 67 files; ~4,000 lines of product
against ~2,800 lines of acceptance gate; no build step, no backend, no git.

Round 8 made the root path a **door** to concept S and moved the hub to `/hub/`,
which turned out to require twelve files moving as one set — the phrase "back to
the hub" was written four different ways in four places, each a claim about how
deep that document sits.

Verified state: **587/587 assertions pass on production** (589 declared; the two
`shots` assertions cannot run on this machine and are reported as unrun, not as
passes), **536/536 on the share link** with the same 33 INFO records. Both
origins serve bytes identical to `02-product/`: 30/30 on production (only the
runtime subset is published) and 67/67 on the share link.

Start at `01-handoff/README.md`, then `07-BACKLOG.md` — nine claims the product
cannot currently make honestly, each paired with the assertion that would settle
it. The most consequential: `confidence 0.62` is a hand-weighted sum, not a
calibrated probability.
