/* ============================================================================
   意图操作系统 · i18n — the long-scroll surface (site)

   Registers ONLY `site.*`. Every key the page needs is here; nothing is
   borrowed from `s.*` so that this page could be shipped on its own.

   The copy obeys the same rule as the previews: no number appears here that
   the page cannot point at. That is why there is no "10x faster", no user
   count, and no logo strip — we have none of those to show.
   ========================================================================== */
(function (KK) {
  'use strict';

  KK.i18n.register({

    /* ------------------------------------------------------------------ rail */
    'site.docTitle':      { 'en-US': 'Intent OS — an operating system for intent (KKmatch, preview)',
                            'zh-CN': '意图操作系统 —— 一套为「意图」而生的操作系统（KKmatch · 预览）' },
    'site.rail.brand':    { 'en-US': 'KKmatch', 'zh-CN': 'KKmatch' },
    'site.rail.sub':      { 'en-US': '· Intent OS', 'zh-CN': '· 意图操作系统' },
    'site.rail.progress': { 'en-US': 'Reading progress', 'zh-CN': '阅读进度' },
    'site.rail.toTop':    { 'en-US': 'Back to top', 'zh-CN': '回到顶部' },
    'site.skip':          { 'en-US': 'Skip to content', 'zh-CN': '跳到正文' },

    /* ------------------------------------------------------------------ hero */
    'site.hero.h1':       { 'en-US': 'An operating system for intent.',
                            'zh-CN': '一套为「意图」而生的操作系统。' },
    'site.hero.sub':      { 'en-US': 'You do not need another place to type. You need the thing you meant to still be there when you look up.',
                            'zh-CN': '你不需要再一个输入框。你需要的是：等你抬起头时，你本来想说的那件事还在。' },
    'site.hero.lede':     { 'en-US': 'This is the chosen direction. It carries two ideas, and both of them are checkable: a typist that only finishes sentences you actually started, and a board where intents keep their own state until you decide.',
                            'zh-CN': '这是已选定的方向。它承载两个想法，而且两个都可以被检验：一个只补全你确实开了头的句子的输入层，和一块在你做决定之前一直替你保管着状态的意图板。' },

    /* the live demo above the fold */
    'site.demo.label':    { 'en-US': 'Live on this page — the same adapter the product uses, not a video',
                            'zh-CN': '就在这个页面上跑 —— 用的是产品同一个适配器，不是录屏' },
    'site.demo.ph':       { 'en-US': 'Try: "help me prepare…" or "帮我…"', 'zh-CN': '试试：「帮我…」或 "help me prepare…"' },
    'site.demo.hint':     { 'en-US': 'Tab accepts · Esc dismisses', 'zh-CN': 'Tab 采用 · Esc 忽略' },
    'site.demo.idle':     { 'en-US': 'No completion offered. Nothing typed has opened a sentence we can finish.',
                            'zh-CN': '没有给出补全。你输入的内容还没有开启一个我们能接下去的句子。' },
    'site.demo.fired':    { 'en-US': 'Completion offered · confidence {c}% · from {k} disclosed reason(s)',
                            'zh-CN': '已给出补全 · 置信度 {c}% · 来自 {k} 条已披露的依据' },
    'site.demo.notAModel': { 'en-US': 'notAModel = true. This is a local template, and it says so in its own payload.',
                             'zh-CN': 'notAModel = true。这是本地模板，它在自己的载荷里就这么写了。' },

    /* The two tails are the site's own copy of the S package's tails, kept in
       this package on purpose: this page must be shippable without loading
       the concept package. They are the same sentences, and e2e/acceptance.js
       asserts that the two packages agree on them so they cannot drift. */
    'site.tail.action':   { 'en-US': ' — and then bring me the result before tonight, together with the reason behind it.',
                            'zh-CN': ' —— 并在今晚之前把结果带给我，连同背后的判断依据。' },
    'site.tail.explore':  { 'en-US': ' — and just show me what I am actually reacting to, without judging it yet.',
                            'zh-CN': ' —— 先只让我看清自己真正在反应的东西，暂时不评判。' },

    /* ---------------------------------------------------------------- why */
    'site.why.eyebrow':   { 'en-US': 'The problem',                        'zh-CN': '问题' },
    'site.why.h2':        { 'en-US': 'Intent is lost in the gap between thinking and typing.',
                            'zh-CN': '意图是在「想」和「打出来」之间的缝里丢掉的。' },
    'site.why.p1':        { 'en-US': 'Every tool asks you to arrive already knowing what you want and then to type it correctly. Most of the time neither is true: you have a shape, not a sentence.',
                            'zh-CN': '每个工具都假定你进门时已经想清楚了，而且能准确地打出来。多数时候这两件事都不成立：你手里是一个形状，不是一句话。' },
    'site.why.p2':        { 'en-US': 'The usual answer is to make the box bigger, add a model, and hope. That produces a different problem: now the machine finishes your thought for you and you can no longer tell which part was yours.',
                            'zh-CN': '常见的答案是：把输入框做大、接一个模型、然后祈祷。这带来另一个问题：机器替你补完了这句话，而你再也分不清哪部分原本是你的。' },
    'site.why.p3':        { 'en-US': 'So the two things this direction refuses are: a blank box with no memory of you, and a confident answer with no visible reason.',
                            'zh-CN': '所以这个方向拒绝两件事：一个对你毫无记忆的空框，和一个看不见理由的笃定答案。' },

    /* ------------------------------------------------------------ the four */
    'site.how.eyebrow':   { 'en-US': 'The loop',                          'zh-CN': '闭环' },
    'site.how.h2':        { 'en-US': 'Four steps, and every one of them is reversible.',
                            'zh-CN': '四步，而且每一步都可撤回。' },
    'site.how.hint':      { 'en-US': 'Scroll — the highlight follows this section while it is pinned.',
                            'zh-CN': '继续滚动 —— 本节被钉住期间，高亮跟着滚动走。' },
    'site.step1.h':       { 'en-US': 'Say it badly',                      'zh-CN': '先说个大概' },
    'site.step1.p':       { 'en-US': 'Two characters is enough. The field starts measuring from the first keystroke: length, lexicon hits, and whether an opening ever matched. Those are the numbers you will be shown later, so they are the numbers measured now.',
                            'zh-CN': '两个字就够了。从第一个按键起，它就开始测量：长度、词表命中、以及是否匹配到一个开场。这些就是你之后会看到的数字，所以现在测的就是这些。' },
    'site.step2.h':       { 'en-US': 'Get a tail, not a rewrite',         'zh-CN': '拿到一条尾巴，而不是被改写' },
    'site.step2.p':       { 'en-US': 'The ghost text is appended after your caret. It never replaces what you wrote and it never appears unless your sentence actually opened the way it continues. Confidence is printed next to it, with the reasons.',
                            'zh-CN': '幽灵文字追加在光标之后。它不会替换你写的东西，而且只要你这句话没有真的开出它要接的那个头，它就绝不出现。置信度就印在旁边，连理由一起。' },
    'site.step3.h':       { 'en-US': 'Confirm it, and watch what does not happen',
                            'zh-CN': '确认它，然后看什么没有发生' },
    'site.step3.p':       { 'en-US': 'Confirming produces a receipt and a sandbox record. It also writes externalWorldChanged = false, which is the field that stops a preview from quietly becoming a product that says it did things it did not do.',
                            'zh-CN': '确认会产生一张回执和一份沙盒记录。同时会写入 externalWorldChanged = false —— 正是这个字段，挡住了一个预览悄悄变成「声称自己做了没做的事」的产品。' },
    'site.step4.h':       { 'en-US': 'It assembles, and it stays assembled',
                            'zh-CN': '装配成图，而且留在那儿' },
    'site.step4.p':       { 'en-US': 'A confirmed intent becomes a dependency graph, built by the same adapter both surfaces use. The graph belongs to its workspace: switching workspace holds it in a slot rather than deleting it, and returning restores it exactly.',
                            'zh-CN': '被确认的意图会变成一张依赖图，由两个界面共用的同一个适配器生成。这张图属于它所在的工作区：切换工作区时它被放进槽位保存而不是删除，切回来时原样恢复。' },

    /* ---------------------------------------------------------- what is real */
    'site.real.eyebrow':  { 'en-US': 'Boundaries',                        'zh-CN': '边界' },
    'site.real.h2':       { 'en-US': 'What is not real, stated before you ask.',
                            'zh-CN': '不真实的部分，先于你发问说清楚。' },
    'site.real.p':        { 'en-US': 'This page is a static preview. Nothing here is connected to a backend, an account, or a model. The table below is generated from KK.preview.capabilities() — the same single source the product uses, so it cannot drift away from what the code actually does.',
                            'zh-CN': '这个页面是静态预览。这里没有任何东西连着后端、账户或模型。下面这张表由 KK.preview.capabilities() 生成 —— 和产品用的是同一个唯一来源，所以它不可能和代码实际行为脱节。' },
    'site.real.boundary': { 'en-US': 'Capability boundary', 'zh-CN': '能力边界' },

    /* -------------------------------------------------------------- contract */
    'site.contract.eyebrow': { 'en-US': 'The contract', 'zh-CN': '契约' },
    'site.contract.h2':   { 'en-US': 'What a real model would have to return.',
                            'zh-CN': '接一个真模型，它必须返回什么。' },
    'site.contract.p':    { 'en-US': 'The ghost text will eventually come from a model instead of a local template. The decision was to keep the same payload — not a payload like it. Two fields change meaning and everything else is pinned.',
                            'zh-CN': '幽灵补全最终会由模型给出，而不是本地模板。已定的做法是沿用同一份载荷 —— 不是「差不多」的一份。只有两个字段改变含义，其余全部固定。' },
    'site.contract.col.field': { 'en-US': 'Field',   'zh-CN': '字段' },
    'site.contract.col.rule':  { 'en-US': 'Rule',    'zh-CN': '规则' },
    'site.contract.col.state': { 'en-US': 'Today',   'zh-CN': '当前' },
    'site.contract.name': { 'en-US': 'Contract',     'zh-CN': '契约名' },
    'site.contract.ver':  { 'en-US': 'version {n}',  'zh-CN': '版本 {n}' },
    'site.contract.status': { 'en-US': 'Status',     'zh-CN': '状态' },
    'site.contract.endpoint': { 'en-US': 'Endpoint', 'zh-CN': '端点' },
    'site.contract.none': { 'en-US': 'none — there is no endpoint in this build', 'zh-CN': '无 —— 本次构建里没有端点' },
    'site.contract.fields': { 'en-US': 'Pinned fields', 'zh-CN': '固定字段' },
    'site.contract.fields.v': { 'en-US': '{n} fields, checked live on every prediction',
                                'zh-CN': '{n} 个字段，每次预测都实时校验' },
    'site.contract.confRule': { 'en-US': 'confidence rule', 'zh-CN': '置信度规则' },
    'site.contract.confRule.v': { 'en-US': 'confidence === sum of weights over the disclosed basis, capped at {cap}',
                                  'zh-CN': '置信度 === 所披露依据各项权重之和，上限 {cap}' },
    'site.contract.changes': { 'en-US': 'Two fields change', 'zh-CN': '两个字段会变' },
    'site.contract.changes.v': { 'en-US': 'provider becomes the real model id, and notAModel becomes false. Everything else — including the shape of basis — is unchanged.',
                                 'zh-CN': 'provider 变成真实模型 id，notAModel 变成 false。其余全部不变 —— 包括 basis 的形状。' },
    'site.contract.validated': { 'en-US': 'Validated right now: {state} · {n} problem(s) found',
                                 'zh-CN': '此刻的校验结果：{state} · 发现 {n} 个问题' },

    /* ---------------------------------------------------------------- next */
    'site.next.eyebrow':  { 'en-US': 'Where to look', 'zh-CN': '接下来看哪里' },
    'site.next.h2':       { 'en-US': 'Two previews, one of them is the direction.',
                            'zh-CN': '两个预览，其中一个是既定方向。' },
    'site.next.p':        { 'en-US': 'The main line is the anticipate shell. The compile shell is kept as a reference: its dependency graph survives into the main line, and the rest of it is frozen as an archive rather than deleted.',
                            'zh-CN': '主线是 anticipate 这一套外壳。compile 这一套作为参考保留：它的依赖图已经并入主线，其余部分冻结存档，而不是删掉。' },

    /* --------------------------------------------------------------- footer */
    'site.foot.openS':    { 'en-US': 'Open the main line (anticipate)',   'zh-CN': '打开主线（先觉之境）' },
    'site.foot.openN':    { 'en-US': 'Open the archived reference (compile)', 'zh-CN': '打开冻结的参考（编译之境）' },
    'site.foot.back':     { 'en-US': 'Back to the hub',                   'zh-CN': '回到总览' },
    'site.fineprint':     { 'en-US': 'Static preview · no backend · no account · no model. Every value on this page is produced locally and labelled DEMO or NOT_CONNECTED. This page loads ScrollTrigger 3.12.5 from this bundle; it is the only surface in the project that scrolls.',
                            'zh-CN': '静态预览 · 无后端 · 无账户 · 无模型。本页所有数值都在本地产生，并标注为 DEMO 或 NOT_CONNECTED。本页从本地加载 ScrollTrigger 3.12.5；它是本项目里唯一会滚动的界面。' },

    /* ----------------------------------------------------------------- nav */
    'site.view.home':     { 'en-US': 'Overview', 'zh-CN': '总览' },
    'site.navAria':       { 'en-US': 'Site sections', 'zh-CN': '站点章节' }

  }, 'concept-site');
})(window.KK);
