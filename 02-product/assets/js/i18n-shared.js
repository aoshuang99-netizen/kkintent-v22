/* ============================================================================
   KK Intent OS · i18n — shared package
   Owned by the shell. Concept packages must not redeclare anything here:
   i18n.js warns on a duplicate key, and e2e/acceptance.js fails on it.
   Values are plain text. `{n}` is the only interpolation supported.
   ========================================================================== */
(function (KK) {
  'use strict';

  KK.i18n.register({

    /* ------------------------------------------------------------ chrome */
    'hud.brandSub':        { 'en-US': '· Intent OS (preview)',        'zh-CN': '· 意图操作系统（预览）' },
    'hud.scnLabel':        { 'en-US': 'Workspace',                    'zh-CN': '工作情境' },
    'hud.scnAria':         { 'en-US': 'Switch workspace scenario',    'zh-CN': '切换工作情境' },
    'hud.account':         { 'en-US': 'Not signed in · demo',         'zh-CN': '未登录 · 演示' },
    'hud.accountAria':     { 'en-US': 'Account status',               'zh-CN': '账户状态' },
    'hud.accountNote':     { 'en-US': 'Account state: NOT_CONNECTED. This preview creates and reads no accounts.',
                             'zh-CN': '账户状态：NOT_CONNECTED。本预览不创建也不读取任何账户。' },
    'hud.lang':            { 'en-US': '中文',                          'zh-CN': 'English' },
    'hud.langAria':        { 'en-US': 'Switch language',              'zh-CN': '切换语言' },
    /* The compact app-bar label. `hud.lang` above names the language you would
       switch TO, which is the right semantic but 7 glyphs wide in English; the
       short form keeps the target state visible inside a 44px icon button
       instead of dropping to a bare globe that shows no state at all. */
    'hud.langShort':       { 'en-US': '中',                            'zh-CN': 'EN' },
    'hud.console':         { 'en-US': 'Console',                      'zh-CN': '控制台' },
    'hud.consoleAria':     { 'en-US': 'Open console sheet',           'zh-CN': '打开控制台面板' },
    'hud.sheetTitle':      { 'en-US': 'Console',                      'zh-CN': '控制台' },
    'hud.soundLabel':      { 'en-US': 'Sound',                        'zh-CN': '音效' },

    'sound.aria':          { 'en-US': 'Toggle sound feedback',        'zh-CN': '切换音效反馈' },
    'sound.off':           { 'en-US': 'Sound: off',                   'zh-CN': '音效：关' },
    'sound.on':            { 'en-US': 'Sound: on',                    'zh-CN': '音效：开' },
    'sound.unsupported':   { 'en-US': 'Sound: unsupported',           'zh-CN': '音效：不支持' },

    'common.cancel':       { 'en-US': 'Cancel',                       'zh-CN': '取消' },
    'common.close':        { 'en-US': 'Close',                        'zh-CN': '关闭' },
    'common.dismiss':      { 'en-US': 'Dismiss',                      'zh-CN': '忽略' },
    'common.previewTag':   { 'en-US': 'PREVIEW · DEMO DATA',          'zh-CN': '预览 · 演示数据' },
    /* The one route back to the product. Registered here, in the package
       every surface loads, rather than once per concept: four copies of
       one label are four places to be wrong. */
    'common.home':         { 'en-US': 'Back to kkmatch.com',          'zh-CN': '返回 kkmatch.com 首页' },

    /* ---------------------------------------------------------- scenarios */
    'scn.mind.label':      { 'en-US': 'Emotion & stress (CBT)',       'zh-CN': '情绪与压力（CBT）' },
    'scn.mind.note':       { 'en-US': 'Five nodes · approval gate on rehearsal',
                             'zh-CN': '五个节点 · 演练环节有审批门' },
    'scn.bond.label':      { 'en-US': 'Closeness & boundaries',       'zh-CN': '亲密与边界' },
    'scn.bond.note':       { 'en-US': 'Six nodes · approval gate on repair',
                             'zh-CN': '六个节点 · 修复环节有审批门' },
    'scn.life.label':      { 'en-US': 'Direction & self-narrative',   'zh-CN': '方向与自我叙事' },
    'scn.life.note':       { 'en-US': 'Five nodes · approval gate on the first bet',
                             'zh-CN': '五个节点 · 第一次下注有审批门' },

    /* ------------------------------------------------------------ nodes */
    'nd.intake':           { 'en-US': 'Capture',            'zh-CN': '采集' },
    'nd.intake.detail':    { 'en-US': 'Read what you wrote; no recording.',
                             'zh-CN': '读取你写下的内容；不录音。' },
    'nd.pattern':          { 'en-US': 'Pattern match',      'zh-CN': '模式匹配' },
    'nd.pattern.detail':   { 'en-US': 'Local lexicon only. No model is called.',
                             'zh-CN': '仅本地词表。不调用模型。' },
    'nd.reframe':          { 'en-US': 'Reframe',            'zh-CN': '重构' },
    'nd.reframe.detail':   { 'en-US': 'Produce one alternative reading, as a template.',
                             'zh-CN': '给出一版替代解读，以模板形式。' },
    'nd.rehearse':         { 'en-US': 'Rehearse',           'zh-CN': '演练' },
    'nd.rehearse.detail':  { 'en-US': 'Needs your approval. Sandbox only.',
                             'zh-CN': '需要你批准。仅沙盒。' },
    'nd.check':            { 'en-US': 'Check-in',           'zh-CN': '回访' },
    'nd.check.detail':     { 'en-US': 'Schedule a follow-up. Notifications are NOT_CONNECTED.',
                             'zh-CN': '安排一次回访。通知能力为 NOT_CONNECTED。' },

    'nd.signal':           { 'en-US': 'Signal read',        'zh-CN': '信号读取' },
    'nd.signal.detail':    { 'en-US': 'Tone, punctuation and lexicon hits.',
                             'zh-CN': '语调、标点与词表命中。' },
    'nd.bound':            { 'en-US': 'Boundary map',       'zh-CN': '边界地图' },
    'nd.bound.detail':     { 'en-US': 'Which line was crossed, in your words.',
                             'zh-CN': '用你的话标出被越过的线。' },
    'nd.need':             { 'en-US': 'Name the need',      'zh-CN': '说出需求' },
    'nd.need.detail':      { 'en-US': 'Turn the complaint into a request.',
                             'zh-CN': '把抱怨翻译成一个请求。' },
    'nd.script':           { 'en-US': 'Opening lines',      'zh-CN': '开场句' },
    'nd.script.detail':    { 'en-US': 'Three ways to start, shortest first.',
                             'zh-CN': '三种开场方式，最短的排在前面。' },
    'nd.repair':           { 'en-US': 'Send / say it',      'zh-CN': '发送 / 说出口' },
    'nd.repair.detail':    { 'en-US': 'Needs your approval. Sandbox only.',
                             'zh-CN': '需要你批准。仅沙盒。' },
    'nd.hold':             { 'en-US': 'Hold the line',      'zh-CN': '守住这条线' },
    'nd.hold.detail':      { 'en-US': 'What to do if the answer is silence.',
                             'zh-CN': '如果对方不回应，你怎么办。' },

    'nd.story':            { 'en-US': 'Your story',         'zh-CN': '你的叙事' },
    'nd.story.detail':     { 'en-US': 'The sentence you keep repeating.',
                             'zh-CN': '你反复说的那句话。' },
    'nd.value':            { 'en-US': 'Underlying value',   'zh-CN': '底层价值' },
    'nd.value.detail':     { 'en-US': 'What the sentence is protecting.',
                             'zh-CN': '那句话在保护什么。' },
    'nd.option':           { 'en-US': 'Options',            'zh-CN': '选项' },
    'nd.option.detail':    { 'en-US': 'Two live options, one to let go.',
                             'zh-CN': '两个可行选项，一个放掉。' },
    'nd.bet':              { 'en-US': 'First small bet',    'zh-CN': '第一次小注' },
    'nd.bet.detail':       { 'en-US': 'Needs your approval. Sandbox only.',
                             'zh-CN': '需要你批准。仅沙盒。' },
    'nd.review':           { 'en-US': 'Review',             'zh-CN': '复盘' },
    'nd.review.detail':    { 'en-US': 'One question, one week later.',
                             'zh-CN': '一周之后，一个问题。' },

    /* -------------------------------------------------------------- logs */
    'log.capture':         { 'en-US': 'Captured {n} characters from the intent frame.',
                             'zh-CN': '从意图框采集到 {n} 个字符。' },
    'log.parse':           { 'en-US': 'Tokenised into {n} words. No model was called.',
                             'zh-CN': '切分为 {n} 个词。未调用任何模型。' },
    'log.tone':            { 'en-US': 'Tone signal → {n} (local lexicon).',
                             'zh-CN': '语调信号 → {n}（本地词表）。' },
    'log.nodes':           { 'en-US': 'Pipeline blueprint: {n} nodes.',
                             'zh-CN': '管线蓝图：{n} 个节点。' },
    'log.edges':           { 'en-US': 'Dependency edges wired: {n}.',
                             'zh-CN': '依赖连线：{n} 条。' },
    'log.graphMs':         { 'en-US': 'Graph build measured at {n}.',
                             'zh-CN': '图构建实测耗时 {n}。' },
    'log.totalMs':         { 'en-US': 'Total local compute: {n}.',
                             'zh-CN': '本地计算总耗时 {n}。' },
    'log.pacing':          { 'en-US': 'Presentation pacing {n} — disclosed, not work.',
                             'zh-CN': '呈现节奏 {n} —— 已声明，不计入计算。' },
    'log.approval':        { 'en-US': 'Approval gate attached to {n}.',
                             'zh-CN': '审批门挂在 {n} 上。' },
    'log.model':           { 'en-US': 'Provider: {n} · template, not a model.',
                             'zh-CN': '提供方：{n} · 模板，非模型。' },
    'term.idle':           { 'en-US': 'Nothing compiled yet. The terminal only prints measured values.',
                             'zh-CN': '尚未编译。终端只打印实测值。' },
    'term.legend':         { 'en-US': 'OK = measured · DEMO = fixed sample · -- = not connected',
                             'zh-CN': 'OK = 实测 · DEMO = 固定样例 · -- = 未连接' },
    'term.title':          { 'en-US': 'Compile log',      'zh-CN': '编译日志' },

    /* ------------------------------------------------------------- signal */
    'sig.tone':            { 'en-US': 'tone',              'zh-CN': '语调' },
    'sig.tone.alert':      { 'en-US': 'alert',             'zh-CN': '警戒' },
    'sig.tone.calm':       { 'en-US': 'calm',              'zh-CN': '平稳' },
    'sig.tone.neutral':    { 'en-US': 'neutral',           'zh-CN': '中性' },
    'sig.chars':           { 'en-US': 'chars',             'zh-CN': '字符' },
    'sig.words':           { 'en-US': 'words',             'zh-CN': '词' },
    'sig.hits':            { 'en-US': 'lexicon hits',      'zh-CN': '词表命中' },
    'sig.punct':           { 'en-US': 'punctuation',       'zh-CN': '标点' },
    'sig.measuredNote':    { 'en-US': 'Measured locally in this tab. Drives the canvas colour; shown as text so colour is never the only signal.',
                             'zh-CN': '在本标签页本地测得。它驱动画布配色；同时以文字显示，因此颜色从来不是唯一信号。' },

    /* ----------------------------------------------------------- boundary */
    'boundary.title':      { 'en-US': 'What is real here', 'zh-CN': '这里什么是真的' },
    'boundary.col.cap':    { 'en-US': 'Capability',        'zh-CN': '能力' },
    'boundary.col.mode':   { 'en-US': 'Mode',              'zh-CN': '模式' },
    'boundary.col.what':   { 'en-US': 'What actually happens', 'zh-CN': '实际发生什么' },

    /* ------------------------------------------------------------ confirm */
    'confirm.title':       { 'en-US': 'Approve this step?', 'zh-CN': '批准这一步？' },
    'confirm.body':        { 'en-US': 'The node you selected would act outside this page. The sandbox executor will record a receipt and change nothing in the outside world.',
                             'zh-CN': '你选中的节点会尝试在页面之外行动。沙盒执行器会记录一张回执，并且不改变外部世界的任何东西。' },
    'confirm.sandboxTag':  { 'en-US': 'SANDBOX',            'zh-CN': '沙盒' },
    'confirm.noSideEffect':{ 'en-US': 'externalWorldChanged will stay false',
                             'zh-CN': 'externalWorldChanged 恒为 false' },
    'confirm.deny':        { 'en-US': 'Deny',               'zh-CN': '拒绝' },
    'confirm.approve':     { 'en-US': 'Approve',            'zh-CN': '批准' },

    /* -------------------------------------------------------------- toasts */
    'toast.label':         { 'en-US': 'NOTICE',             'zh-CN': '提示' },
    'toast.scenarioSwitched': { 'en-US': 'Workspace switched: {from} → {to}. {receipts} receipt(s) were kept — receipts belong to the account, not to the workspace. Your draft was kept. Assembled work was kept as well: {held} workspace(s) are holding a pipeline, and this one has {nodes} node(s).',
                                'zh-CN': '工作情境已切换：{from} → {to}。保留 {receipts} 张回执 —— 回执属于账户，不属于工作区。你输入的草稿也保留了。已装配的工作同样保留：共 {held} 个工作区持有管线，当前工作区 {nodes} 个节点。' },
    'toast.soundOn':       { 'en-US': 'Sound on. It is synthesised in this tab and never sent anywhere.',
                             'zh-CN': '音效已开启。声音在本标签页合成，不发送到任何地方。' },
    'toast.soundOff':      { 'en-US': 'Sound off.',          'zh-CN': '音效已关闭。' },
    'toast.soundUnsupported': { 'en-US': 'This browser has no Web Audio support. The button will stay off.',
                                'zh-CN': '此浏览器不支持 Web Audio。按钮将保持关闭。' },
    'toast.authNotConnected': { 'en-US': 'Authentication is NOT_CONNECTED in this preview. There is no account to open.',
                                'zh-CN': '本预览的认证能力为 NOT_CONNECTED。没有可打开的账户。' },
    'toast.fieldLost':     { 'en-US': 'The WebGL context was lost. Falling back to a static background — the interface keeps working.',
                             'zh-CN': 'WebGL 上下文丢失。已退回静态背景 —— 界面继续可用。' },

    /* ------------------------------------------------------------ receipts */
    'approval.denied':     { 'en-US': 'Not approved. Nothing ran, nothing was recorded.',
                             'zh-CN': '未获批准。没有执行，也没有记录。' },
    'receipt.note.1':      { 'en-US': 'Executed by the sandbox executor. No network call was made.',
                             'zh-CN': '由沙盒执行器执行。未发起任何网络请求。' },
    'receipt.note.2':      { 'en-US': 'externalWorldChanged = false',
                             'zh-CN': 'externalWorldChanged = false' },
    'verifiable.sandbox.run_id':      { 'en-US': 'run id recorded',    'zh-CN': '已记录运行 id' },
    'verifiable.sandbox.no_side_effect': { 'en-US': 'no side effect outside the page', 'zh-CN': '页面外无副作用' }

  }, 'shared');
})(window.KK);
