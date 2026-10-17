# KK Match — 操作铁律（新会话先读）

> 只放「做错会出事」的规则。全量详解/案例见 `TOPICS.md`（附录 A＝旧归档，附录 B＝2026-09-25 压缩前全量），实录读 `YYYY-MM-DD.md`。

## 🔒 红线
- 不动 KKOS 模块与 `index.html` 首页背景/UI。
- 绝不伪造 URL/标题/数据/进度/成功；缺失值留空或显式报错；`mock` 不说成 `real`。
- `ADMIN_API_KEY` 不进前端、不进 0644 nginx.conf；本地脚本不落密钥。
- 生成器产物（`voices.html`、`research/*`）**只改生成器**，改线上＝次日被覆盖。

## 环境
- 服务器 `<SERVER_IP>` root/`<REDACTED>`。前端源 `/opt/kk-match/frontend`；后端 `/opt/kk-match/relationship-match-ai/api/`（uvicorn :8001）。
- 远端一律 Bash 调 `python+paramiko`（HOME=临时目录、`look_for_keys=False`、`load_host_keys(<空文件>)`）。Git Bash `/tmp` 与 Windows Python 不互通 → 用 `C:/Users/AS/AppData/Local/Temp/`。
- 🔴 systemd drop-in 必须 `[Service]`+`Environment=K=V`；写完用 `/proc/<MainPID>/environ` 验证真注入。
- 🔴 同一 SSH 连接第二条 exec_command 常 EOFError → 合并单条或独立重连；**高频重连会被限流**（实测 direct-tcpip 通道被掐、隧道失效）。
- 🔴 `%` 转义陷阱：`%{http_code}`/`%Y` 落进 Python `%` 格式串被吃 → 纯拼接。
- 🔴 **本机 Python 3.14 被 `PYTHONPATH` 污染**（指向 WorkBuddy `cli/vendor/shim`）→ `Failed to import encodings module` 直接起不来。跑脚本用 **3.13.12 + 前置 `PYTHONPATH=`**。（3.13.12 实测正常。）

## 部署门禁（顺序不可乱）
1. **拉线上现版为新基线**（不是上轮本地副本！）→ diff → 改 → 部署 → 线上验收。误用旧基线曾抹掉他人 Fortune Report 路由（2026-09-23）。
2. 🔴 **删除行审计＝精确集合比对**（`set(删除行) ⊆ 预期块`），子串白名单会漏。差异面多余即停手。远端先 `cp -a .bak_<tag>_<ts>`。
3. 🔴 **patch 前 EOL 归一化**，写回原风格（pricing/fastapi/subscription 曾 CRLF；dodo 批次实为纯 LF——**以实测为准别信记忆**）。
4. 🔴 **受控 Python 补丁脚本**：锚点 `count()==1` 断言、整段替换、串行执行。🔴 **对同一字符串先 replace 再用旧索引切片＝索引漂移 bug**（2026-09-25 实测切丢 35 行 JS）——**切片索引必须在 replace 后的字符串上重算**。
5. 上传 → `py_compile` 门禁（HTML 用 node `new Function` 验 script 块）→ 备份 → 入位 → `systemctl daemon-reload && restart kkmatch-backend` + 新鲜度断言（PSTART≥mtime）。
6. 🔴 **前端由宿主目录供给，不是容器**（2026-10-15 实测：`nginx -T` 里 `root /opt/kk-match/frontend`；全文 `grep -c 8080` = **0**；`kkmatch-frontend` 只绑 `127.0.0.1:8080`，无人代理）。静态页改宿主文件即生效；**`docker cp` 入容器对公网无效**——旧规则有误，已更正。`/api/` → `127.0.0.1:8001`（uvicorn）。
7. 🔴 同文件多编辑禁止并行 Edit（工具每条都报「成功」但互相覆盖）。

## Codex 同步面（2026-10-15 实测）
- `C:\Users\AS\.codex` 是 Codex 桌面版，**从未跑过对话**（`state_5.threads=0`、`projects=0`、`memories_1.stage1_outputs=0`）。`logs_2.sqlite` 1000 行**全是应用遥测**（login/auth 664、websocket 332、message_processor 4，覆盖 335 秒窗口），无本项目字样 → **没有可追加的工作日志流，也没有摄取 API**。直接写它的 sqlite ＝ 伪造应用日志且下次写入会被覆盖，**不做**。
- 受支持的落点只有两个：用户级技能 `~/.codex/skills/<name>/SKILL.md`（按 name+description 发现，不污染无关会话）与项目指令 `AGENTS.md`。
- 已建 `~/.codex/skills/kkmatch-live-ops/`（`SKILL.md` + `agents/openai.yaml` + `references/release-log.md`），用 Codex 自带 `skills/.system/skill-creator/scripts/quick_validate.py` 校验 → `Skill is valid!`；工作区根 `AGENTS.md` 放硬约束+布局指针。四份产物已镜像到线上 `/opt/kk-match/docs/capability-runtime/codex/`。

## 验收
- 判据能证伪；枚举所有调用点+总数兜底（抽样会漏）；否定式判据先加前置闸门；探针串逐字取自源码；编辑报成功≠落地（写完立刻 grep/py_compile）。
- 🔴 **`systemctl reload nginx` 返回 0 ≠ 配置已生效**（2026-10-16 实测）：reload 只把 SIGHUP 递给 master，**worker 替换是异步的**——若紧接着在同一条 exec 里验收，curl 会打在**尚未退场的旧 worker** 上读到旧响应头，于是**误报"改动没生效"**（我本轮就这样误判了一次；error.log 的 `start worker → gracefully shutting down` 时间线是解药）。**reload 后验收必须重试/有界等待**。同类：命令返回成功 ≠ 状态已改变。
- 🔴 **Service Worker 脚本绝不能长缓存**：站点根 `sw.js` 会被通用 `\.(js)$` 的 30 天 immutable 规则接管，与「SW 必须随时可更新」直接冲突 → 必须给 `location = /sw.js` 发 `no-cache`，否则修好的 SW 根本送不出去。**站点 SW 也不得预缓存首页 `/`**：首页是随发布变化的内容，被快照后会在网络失败时**伪装成正常页面**，让一次已上线的改动看起来"从来没发布过"；且 `sw.js` 字节不变时 cache 名永不轮换，旧快照永久滞留。
- 🔴 **「服务器已更新」≠「用户看到了新内容」**：报障先做**四层分离测量**（服务器磁盘 → 源站响应 → 无缓存浏览器 → 客户端），别在服务端反复重传。症状"只差一条 nav"→ 缓存里是**部署前那版**（HTTP 缓存）；"整页是另一种设计"→ 才是 **SW 旧首页快照**。`stale-while-revalidate` 加在 HTML 上等于允许 1h 内送陈旧副本，无 CDN 时是纯负债。
- 🔴 本机到 kkmatch.com:443 **可能直连超时**（ICMP/SSH 却通）→ 可视化验收走 **SSH 隧道**（本地 443→远端 443 + chromium `ignoreHTTPSErrors` + 访问 `https://127.0.0.1/`；`--host-resolver-rules` 不可靠）。本机无常驻代理（7890/10808/10809 均空）。
- playwright-cli 会话跨 bash 调用不保活、locator.screenshot 常超时 → 直接用 playwright-core 脚本（ms-playwright 里 chromium-1228 可执行）。
- 🔴 **沙箱会拦 Playwright 截图写盘**（`EPERM` on `open`，栈里是 `cli\vendor\shim\node-brokered-fs-shim.cjs`）→ 含 `page.screenshot` 的门禁**整段跑不完**，且中断前已覆写若干截图（须从发布包/备份恢复）。**替代证据链：① 逐文件 sha256 与 manifest 独立复算比对（含"无多余文件"）② 源树 ↔ 发布树逐字节比对 ③ 只读探针（不带 screenshot）打发布包自身 origin**。三者叠加比二跑浏览器更强，且不依赖浏览器。
- ⚠️ 批量 playwright 跑完可能遗留 headless chromium 进程；**`Get-Process chrome | Where {$_.Path -like '*ms-playwright*'}` 会被沙箱拒**（`decisionRecord missing actual resource subject`），`wmic` 在黑名单 → **无法可靠区分用户自己的浏览器 → 不擅自 kill，交用户决定**。

## 支付（现状速查）
- 分发 `subscription.py::create_checkout(gateway=)`，默认 PayPal。定价：plus 24.75 / pro 49.75 / team 122.5 / business 497.5 USD（年付=月×10）。
- 🔴 类目红线：风水/算命/情感咨询=国内通道禁入，kkmatch 双料命中 → 国内第四方基本全拒（虎皮椒实测）。过审需叙事收敛为「AI 关系智能分析工具」。
- **PayPal Advanced**（ready:true）：金额只服务端算+capture 复核；网络超时≠未开通（传输失败绝不写负缓存）；ACDC 一次性订单，钱包按钮走 createSubscription。SDK v5/v6 别混（详见 TOPICS）。
- **Dodo Payments**（MoR，2026-09-24 全链路上线）：产品 4 个价格已对齐 PLANS；`dodo.py` 建单/验签/激活；前端 `js/dodo-checkout.js` 自托管 overlay。🔴 Dodo API 按 UA 拦机房 IP：**必须浏览器 UA**。Webhook 端点 `/api/v1/dodo/webhook`，**无 secret 时 503 安全默认**。
- 支付宝/虎皮椒：代码就绪，卡签约（类目）。
- 定价页按钮（2026-09-25 改版）：美式双钮＝PayPal Express（黄→被 contrast-floor.css 归一为站点 accent 色）+ Debit or Credit Card（dodoEnabled 则走 Dodo，否则开 ppModal）；国内通道为 pay-chip 小按钮（闸门关时整行隐藏）。**`contrast-floor.css` 会强制覆盖按钮配色**——并行设计系统，别硬刚。

## 待办
- 🔴 **Dodo Webhook**：后台已建，**待用户发 `whsec_`** → 写 dodo.conf → restart → 端到端复验 + 后台 Send test event。未配前真实付款无法自动激活。
- 🟠 爱发电：凭据已验（ping 通），**待 `AFDIAN_PLAN_ID`**（后台建「自选金额」方案后手工提供）。
- ✅ PayPal Advanced：待真实小额付款跑全链路（用户决定沙箱/真实卡）。
- 🔴 **移动端触摸目标**：Phase 4 实测 **46 个元素 <44px**（26 个在共享 nav 内，主导是 20–28px 高的文字链接如 `Pricing 42×20`），三引擎计数完全一致 → 真布局属性非引擎假象。修它要动共享 header，受「不动 `index.html` 首页 UI」约束 → **待用户 go/no-go**（a 仅受影响页加载附加样式 / b 全站 / c 接受为已知缺口）。
- 🟠 回滚演练未对生产执行（`/opt/kk-match` 非 git 仓，只能靠 `.bak_*`）→ 待批准在非关键产物上做一次。
- ⚠️ Fortune Report（他人代码）曾被误覆盖已复位；对方可能有未同步改动。
- ⏳ 支付宝/虎皮椒签约；Creem 为 MoR 兜底；Pinterest/Twitter 社媒；voices.html 320px 溢出等小项。

## 通用工程铁律（2026-10-16 · kkintent 预览第三轮实测，跨项目适用）
- 🔴 **「假设的偏移一定是错的」**：固定栏在窄屏/200% 缩放/长文案下会**换行**，真实高度就不再等于 `--hud-h` 令牌。430px 实测：栏真实底边 122px，而 shell 只预留 92px、吸顶导航被放在 92px → 导航 30px 压在玻璃栏下、按钮不可点。**凡是要贴边的偏移都从 live box 实测后发布**（`ResizeObserver` 正好是换行会触发的事件），别用令牌算。同理：吸顶导航也有高度，`scroll-margin-top` 只算 HUD 不够（跳转落点仍在导航下 40px）。
- 🔴 **判据采样窗口＝测机器；判据读状态＝测代码**。本轮三次踩坑同源：`collapse > 0.25` 在 450ms 后采样（缓动是**每帧** 0.085，机器卡一下就只有一步）、权限同意睡 1200ms、帧时序 `page.evaluate(fn,[10,1400])` 传成**两个参数**导致 `ms===undefined` → `frames:1`、中位数恒为 null（**这个测量从来没测到过东西**）。修法统一为：能同步读的就同步读（同一次 evaluate 里触发+读状态），必须等的就**有界等条件**，绝不用固定 sleep。
- 🔴 **`touch-action` 不是继承属性**：逐元素读会得到 `auto`，有效值是**与整条祖先链的交集**。根上写 `manipulation` 即全站生效；判据要读 root 或算交集，别读子元素。
- 🔴 **`pointer-events` 是继承属性**：overlay 写 `pointer-events:none` 后，只给子元素补 `z-index` 等于按钮全是死的——**必须显式 `pointer-events:auto`**。`.click()` 能点中一个没人能碰到的元素，所以**点击类判据要用真指针 `locator.tap()`**。
- 🔴 **`overflow-x: hidden/clip` 会让 `scrollWidth - innerWidth` 恒为 0** → 用这个数判溢出等于没判（hub 就是这样漏了 98px，并让 Chrome 把布局视口撑到 489px 整页缩放）。**判溢出要逐元素 rect + 命中测试**。
- ⚠️ **本机内存被用户自己的程序占满**（16GB 只剩 1.6GB：36 个用户 Chrome + 15 个 ShardX，CPU 78%）。已核实**Playwright 零泄漏进程** → 不得 kill 任何 chrome。后果：任何时间/吞吐敏感判据都会假失败，**帧预算是机器指标不是产品指标**，只断言「不出现硬停顿」并记录分布。
- ⚠️ **单文件注入定时器要收口**：`field.pulse()` 原用裸 `setTimeout` 到期把 target 拖回 0.22 → 两个 pulse 并发时**旧定时器压过新意图**。改成单一 timer handle，`pulse` 与 `settle` 都取消它。
- 🔴 **钉死输入的检查观察不到默认值**（2026-10-16 第五轮实测）：「默认英文」在门禁里活了四轮，因为每条 boot 都钉死 `?lang=en-US`，无参路径从来没被走过 → 中文浏览器一直在被喂中文。**测默认行为必须留一条不带参数的路径，并与显式分支做三路相对比较**（默认==显式A 且 !=显式B），硬编码期望串既怕改文案又怕环境。
- 🔴 **一个事实只允许一个写者**：语言声明曾有 3 个写者（`<html>` 写 `en`/`zh`，`<body>` 写 `en-US`/null）、两套取值空间、**零读者**（无 CSS、门禁只采不断言）→ 漂移温床。「采集了却从不断言」的字段要么升级成断言，要么删掉。
- 🔴 **`stats().missing` 只能证明「渲染到的」键完整**：要断言整本词典双语俱全，必须遍历词典本身（新增 `gaps()` 逐键查每种支持语言是否有值）——没被渲染到的键可以是纯英文而永远不报。
- 🔴 **文档/截图进归档包后必须重新发布**，否则「线上==本地逐字节」只在产品面成立；docs/shots 是可浏览的公开路径，陈旧文档就是公开的谎言。
- 🔴 **位置选择器不抗插入**（2026-10-16 r8 实测）：首页用 `.navlinks a:nth-child(4){display:none}` 在 ≤700px 隐藏第 4 个链接。把新入口插到它**前面** → 新入口成了第 4 个 → **新功能在手机上整条不可见**，而服务端一直是对的，用户连报两轮"没有任何变化"。同类还会出现在 `:first-child`/`:last-child`/`nth-of-type`/`:nth-child(2n)`。**按语义选（`a[href="/privacy"]`），不要按位置选**，只要它前面可能被插入东西。
- 🔴 **「在 DOM 里」≠「看得见」**（2026-10-16 r8 实测）：证伪时 `present=true` 而 `visible=false` —— `<a>` 一直在 DOM 里，`getComputedStyle` 说 `display:none`。**存在性断言会全绿，bug 照常上线**。可见性必须问渲染器：非空 `getBoundingClientRect` + 文本出现在 `innerText`（`innerText` 天然排除 `display:none` 节点）。
- 🔴 **非指纹命名的 CSS/JS 不能长缓存**：`gc-ai.css` 被通用 `\.(css|js|…)$` 的 30 天 immutable 接管 → 任何改动一个月送不出去，**连修复本身都送不出去**。修一处要两件事：① 引用处加 `?v=rN`（已缓存 immutable 的浏览器只有换 URL 才重取）② nginx 精确/正则块发 `must-revalidate`，**且该块必须排在通用块之前**（nginx 正则按定义顺序取首个命中，不是最长匹配）。
- 🔴 **本地静态服务器不是"弱化版生产"，是另一台机器**（2026-10-17 实测）：`python -m http.server` 不发 `X-Robots-Tag`（"响应头无 noindex"恒真）、对目录请求返 **200 目录列表**（nginx 是 `try_files … =404`，坏链接在本地看起来是好的）。**逐字节一致只证明内容到了，头/状态码/404 行为只能在真 origin 判**。上一轮 553 PASS 全部跑在 `127.0.0.1:18091`，是一处真实的验收缺口。
- 🔴 **"链接可解析" ≠ "走得出去"**：`anticipate`/`compile` 各只有一个 `<a>`（页内 skip link），从首页进去只能靠浏览器后退，而门禁 553 条全绿 —— 因为只断言了**去程**（"every preview link resolves 200"）。要断言**回程属性**而非链接数量：至少 1 条**渲染出来的**非 `#` 链接 + ≥44px + 解析成功 + 目标等于 hub（hub 则等于主站）。
- 🔴 **`href` 的层数是对深度的断言**：`../../` 从 `preview/site/` 到 hub，从 `preview/intent/anticipate/` 到的是 `preview/` —— 照抄上一个页面的相对路径必然错层。判据要**解析成绝对 URL 再比对**，别肉眼看标记。
- 🔴 **`new URL('./', 'https://host/v22')` = `https://host/`**（末段被当文件名）→ 会把"hub"指到首页，冒出与本节完全无关的失败（如首页 25px nav 不满足 44px）。要 `BASE + '/'` 显式拼。
- ⚠️ **`clear(container)` 型容器里的静态标签是死代码**：`os.js:boot()` 对 `view-nav` 先 `clear()` 再只 append 自己的 button → 写进该 `<nav>` 的 `<a>` 开机即被抹掉。改这类页前先读构建函数，别先改 HTML。
- 🔴 **上传这个动作本身会让文档里的自述变成假话**（2026-10-17 实测）：README 写着「分享链接的 `docs/` 落后一轮」，**上传后就不成立了**。发布前必须把"关于本次发布状态的描述"当作待改字段一起审——`grep -i "behind\|one round\|to be synced"` 过一遍，否则线上多的是刚被自己推翻的句子。交付后要**在线上 grep 旧口径 == 0**，而不是只看本地文件改没改。
- 🔴 **差异面必须等于预期集合，不是"看起来差不多"**：上传前拉线上现版逐文件 sha256，`set(线上≠本地)` 用 `diff` 精确比对预期块（本轮 10/10）。56 个 SAME 是"没碰别人东西"的证据，10 个 DIFF 是"改了该改的"的证据，两个数缺一不可；只看 DIFF 会漏掉"顺手带了第三个文件"。
- 🔴 **分段跑门禁必须沿用生产的分组**：`cross` 段读的是 `n`/`s` 段填进 `collected` 的 `n_desktop`，单独跑 → 3 条 FAIL（`bothSurfacesPassEveryGenericGate` 等），组合跑 → 150/150。**这类失败的属性是跑法，不是产品**；报 FAIL 前先确认该段的输入是否由别的段提供。

## 无 VCS 的 web root（2026-10-17 · kkintent v22 交接实测）
- 🔴 **「仓库」可能根本不存在**：`/opt/kk-match/frontend/v22` 与本地 `kkintent_public` 都不是 git 仓（`rev-parse` 三处全 fatal）。版本身份只能靠 sha256，回滚只能靠 `cp -a` 目录备份。**给第三方交接前必须先跑 `git rev-parse --is-inside-work-tree` 确认，别按"仓库"写文档。**
- 🔴 **绝不在 nginx `root` 目录里 `git init`**：`.git/config` 会直接被公网取到（`https://host/v22/.git/config`）。要 VCS 就把仓放 web root 外、从仓里部署。
- 🔴 **门禁/测试框架的输出路径常写死在自身相对位置**（`path.join(__dirname,'..','_audit')`）→ 在发布包里跑门禁必然长出产物文件、破坏"N 文件"清单。**把门禁脚本复制到隔离目录再跑**，别在发布包里跑。
- 🔴 **报 FAIL 前先看进程退出码与报错原文**：`0xC000012D`(COMMITMENT_LIMIT)/`0xC0000142`(DLL_INIT_FAILED)/`THREE.WebGLRenderer: A WebGL context could not be created` 都是**机器侧资源枯竭**，不是产品缺陷。同一段资源恢复后 53/53 通过。`noConsoleErrors` 这类判据对机器状态最敏感。
- ⚠️ **"没有密码"的主机地址不一定是秘密**，但要有**具名例外**：允许唯一一个定位文件写地址，其余文件 `grep` 必须 0 命中，并把例外写进该包的 AGENTS.md，否则规则与交付物自相矛盾。
