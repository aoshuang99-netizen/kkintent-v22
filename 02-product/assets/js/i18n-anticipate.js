/* ============================================================================
   KK Intent OS · i18n — concept S (anticipate / 先觉之境)
   Only `s.*` keys live here.
   ========================================================================== */
(function (KK) {
  'use strict';

  KK.i18n.register({

    /* ------------------------------------------------------------- chrome */
    /* The document title is translated like any other string. It is written
       into the <title> element by the same in-place pass that rewrites the
       body (i18n.js queries document-wide), so a reader who switches to
       Chinese does not keep an English tab label. */
    's.docTitle':        { 'en-US': 'Intent Field — KKmatch Intent OS (preview, concept S)',
                           'zh-CN': '意图场 —— KKmatch 意图操作系统（预览 · 方案 S）' },
    's.view.field':      { 'en-US': 'Intent field',  'zh-CN': '意图场' },
    's.view.orbits':     { 'en-US': 'Orbit board',   'zh-CN': '轨道板' },
    's.view.ledger':     { 'en-US': 'Ledger',        'zh-CN': '账本' },
    's.navAria':         { 'en-US': 'Concept views', 'zh-CN': '方案视图' },
    's.nav.back':        { 'en-US': 'Back to the hub', 'zh-CN': '返回预览首页' },
    's.nav.other':       { 'en-US': 'Open the archived reference', 'zh-CN': '打开存档参考（方案 N）' },
    's.skip':            { 'en-US': 'Skip to the intent field', 'zh-CN': '跳到意图场' },

    /* -------------------------------------------------------------- field */
    's.field.eyebrow':   { 'en-US': 'Anticipatory field · preview', 'zh-CN': '先觉场 · 预览' },
    's.field.h1':        { 'en-US': 'The field answers before you finish the sentence.',
                           'zh-CN': '在你把这句话写完之前，场就已经回应了。' },
    's.field.sub':       { 'en-US': 'Start typing and a local template completes the rest. It says how sure it is, and it shows you which parts of your sentence made it say that. Accept it, edit it, or ignore it — the field never types for you.',
                           'zh-CN': '开始打字，本地模板会补完剩下的部分。它会说出自己有多确定，并告诉你句子里的哪些部分让它这么判断。你可以采用、改写，或者直接忽略 —— 场永远不会替你打字。' },
    's.field.placeholder': { 'en-US': 'Start typing. Two characters are enough to see a prediction.',
                             'zh-CN': '开始输入。两个字就够看到一条预测。' },
    's.field.ghostLabel': { 'en-US': 'Local template completion · not a model output',
                            'zh-CN': '本地模板补全 · 非模型输出' },
    's.field.confidence': { 'en-US': 'confidence {n}', 'zh-CN': '置信度 {n}' },
    's.field.band.high':   { 'en-US': 'high',   'zh-CN': '高' },
    's.field.band.medium': { 'en-US': 'medium', 'zh-CN': '中' },
    's.field.band.low':    { 'en-US': 'low',    'zh-CN': '低' },
    's.field.basisTitle': { 'en-US': 'Why it said that', 'zh-CN': '它为什么这么判断' },
    's.field.basis.verb': { 'en-US': 'an instruction verb was found', 'zh-CN': '找到了指令动词' },
    's.field.basis.length': { 'en-US': '{value} word(s) so far — inside the useful range',
                              'zh-CN': '目前 {value} 个词 —— 在有效区间内' },
    's.field.basis.lexicon': { 'en-US': '{value} word(s) matched this workspace lexicon',
                               'zh-CN': '有 {value} 个词命中了当前情境词表' },
    's.field.basis.template': { 'en-US': 'a template exists for this workspace',
                                'zh-CN': '当前情境有可用模板' },
    's.field.accept':     { 'en-US': 'Use the prediction', 'zh-CN': '采用这条预测' },
    's.field.toCard':     { 'en-US': 'Send to the orbit board', 'zh-CN': '送入轨道板' },
    's.field.clear':      { 'en-US': 'Clear',        'zh-CN': '清空' },
    's.field.idle':       { 'en-US': 'No prediction yet — keep typing.',
                            'zh-CN': '还没有预测 —— 继续输入。' },
    's.field.kbdHint':    { 'en-US': 'Tab accepts the prediction · Esc dismisses it',
                            'zh-CN': 'Tab 采用预测 · Esc 忽略' },
    's.field.tooShort':   { 'en-US': 'Two characters minimum.', 'zh-CN': '至少两个字符。' },
    's.field.note':       { 'en-US': 'Predictions come from a fixed template per workspace, scored by features measured in this tab. Nothing is sent anywhere, and no model is called.',
                            'zh-CN': '预测来自每个情境的固定模板，由本标签页实测的特征打分。不发送到任何地方，也不调用模型。' },
    's.field.measured':   { 'en-US': 'Measured', 'zh-CN': '实测' },

    /* ---- the tail the ghost layer appends, per matched opening ---- */
    's.tail.action':      { 'en-US': ' — and then bring me the result before tonight, together with the reason behind it.',
                            'zh-CN': ' —— 并在今晚之前把结果带给我，连同背后的判断依据。' },
    's.tail.explore':     { 'en-US': ' — and just show me what I am actually reacting to, without judging it yet.',
                            'zh-CN': ' —— 先只让我看清自己真正在反应的东西，暂时不评判。' },

    /* ---- the workspace's suggested instruction (shown as a suggestion,
            never drawn as a completion) ---- */
    's.suggest.mind':     { 'en-US': 'Set up a CBT practice that catches the spiral early, then check in with me tonight.',
                            'zh-CN': '搭一套 CBT 练习，在情绪开始下滑时早点拦住，今晚再回访我一次。' },
    's.suggest.bond':     { 'en-US': 'Prepare the conversation I keep postponing, and say it in three sentences or fewer.',
                            'zh-CN': '准备那场我一直往后拖的对话，用三句话或更少说清楚。' },
    's.suggest.life':     { 'en-US': 'Look at the sentence I keep repeating about my work, then pick one small bet for this week.',
                            'zh-CN': '看看那句我一直重复的、关于工作的话，再挑一件本周能下的小注。' },
    's.suggestLabel':     { 'en-US': 'Suggested for this workspace (not a completion)',
                            'zh-CN': '为当前情境推荐（不是补全）' },
    's.suggestUse':       { 'en-US': 'Use this',    'zh-CN': '用它' },

    /* ------------------------------------------------------------- orbits */
    's.orbits.title':     { 'en-US': 'Orbit board',  'zh-CN': '轨道板' },
    's.orbits.lead':      { 'en-US': 'Cards float on a spring. Drag one, throw it, and it comes back to its own slot. Two cards never overlap — the integrator resolves that, not a z-index.',
                           'zh-CN': '卡片浮在弹簧上。拖动它、甩出去，它会回到自己的位置。两张卡片永远不会重叠 —— 这是积分器处理的，不是靠 z-index 盖住的。' },
    's.orbits.empty':     { 'en-US': 'The board is empty. Send an intent from the field.',
                           'zh-CN': '轨道板是空的。从意图场送一条意图过来。' },
    's.orbits.modeLabel': { 'en-US': 'Layout',       'zh-CN': '布局' },
    's.orbits.modeFree':  { 'en-US': 'Free (physics)', 'zh-CN': '自由（物理）' },
    's.orbits.modeList':  { 'en-US': 'List (still)',  'zh-CN': '列表（静止）' },
    's.orbits.settle':    { 'en-US': 'Settle all',    'zh-CN': '全部归位' },
    's.orbits.confirm':   { 'en-US': 'Confirm',       'zh-CN': '确认' },
    's.orbits.park':      { 'en-US': 'Park',          'zh-CN': '搁置' },
    's.orbits.cardTone':  { 'en-US': 'tone {n}',      'zh-CN': '语调 {n}' },
    's.orbits.cardFrom':  { 'en-US': 'template {n}',  'zh-CN': '模板 {n}' },
    's.orbits.dragHint':  { 'en-US': 'Drag, or use the buttons. Arrow keys move a focused card.',
                            'zh-CN': '拖动，或用按钮。方向键可以移动获得焦点的卡片。' },
    's.orbits.kbdHint':   { 'en-US': 'Arrow keys nudge · Shift + arrow is a bigger step',
                            'zh-CN': '方向键微调 · Shift + 方向键移动更远' },
    's.orbits.listNote':  { 'en-US': 'List mode: motion off, same actions.',
                            'zh-CN': '列表模式：关闭动效，操作不变。' },
    's.orbits.autoList':  { 'en-US': 'Your system asks for reduced motion, so the board opened in list mode. Free mode is still available.',
                            'zh-CN': '你的系统偏好减少动态效果，因此轨道板以列表模式打开。自由模式仍然可用。' },
    's.orbits.overlap':   { 'en-US': 'Overlapping pairs right now: {n}.', 'zh-CN': '当前重叠的卡片对：{n}。' },

    /* ------------------------------------------------------------- ledger */
    's.ledger.title':     { 'en-US': 'Ledger',       'zh-CN': '账本' },
    's.ledger.lead':      { 'en-US': 'Everything this session recorded, in one place: the signals the field measured, the artifacts it produced, the receipts for approved steps, and the permission outcomes.',
                           'zh-CN': '本次会话记录的一切，都在这里：场实测到的信号、产出的产物、批准步骤的回执，以及权限结果。' },
    's.ledger.signals':   { 'en-US': 'Signal samples', 'zh-CN': '信号采样' },
    's.ledger.signalsEmpty': { 'en-US': 'No samples yet. Type in the intent field.',
                               'zh-CN': '还没有采样。去意图场输入点什么。' },
    's.ledger.artifacts': { 'en-US': 'Artifacts',     'zh-CN': '产物' },
    's.ledger.artifactsEmpty': { 'en-US': 'None yet.', 'zh-CN': '还没有。' },
    's.ledger.receipts':  { 'en-US': 'Receipts',      'zh-CN': '回执' },
    's.ledger.receiptsEmpty': { 'en-US': 'None yet. Confirming a card produces one.',
                                'zh-CN': '还没有。确认一张卡片即可产生一张。' },
    's.ledger.consents':  { 'en-US': 'Permission outcomes', 'zh-CN': '权限结果' },
    's.ledger.consentsEmpty': { 'en-US': 'Nothing asked for yet. This preview never asks on its own.',
                                'zh-CN': '还没有请求过任何权限。本预览从不自作主张地请求。' },
    's.ledger.micTest':   { 'en-US': 'Test microphone permission', 'zh-CN': '测试麦克风权限' },
    's.ledger.micNote':   { 'en-US': 'This asks the browser for real. Whatever it answers is what gets recorded — including a refusal, and including "this browser cannot".',
                            'zh-CN': '这会真实地向浏览器发起请求。它回答什么，就记录什么 —— 包括拒绝，也包括「这个浏览器做不到」。' },
    's.ledger.sameLocation': { 'en-US': 'current workspace', 'zh-CN': '当前工作情境' },
    's.ledger.fromLocation': { 'en-US': 'from workspace: {name}', 'zh-CN': '来自工作情境：{name}' },

    /* ---- assembled pipeline (kept per workspace) ---- */
    's.ledger.pipeline':  { 'en-US': 'Assembled pipeline', 'zh-CN': '已装配的管线' },
    's.ledger.pipelineEmpty': { 'en-US': 'Nothing assembled in this workspace yet. Confirm a card on the board and its intent becomes a dependency graph here.',
                                'zh-CN': '这个工作区还没有装配任何东西。在轨道板上确认一张卡片，它的意图就会在这里变成一张依赖图。' },
    's.ledger.pipelineAssembled': { 'en-US': 'assembled', 'zh-CN': '已装配' },
    's.ledger.pipelineDraft': { 'en-US': 'not assembled', 'zh-CN': '未装配' },
    's.ledger.pipelineShape': { 'en-US': '{n} node(s) · {e} edge(s). A node starts blocked until every edge feeding it has a done source.', 'zh-CN': '{n} 个节点 · {e} 条边。节点的上游未完成时，它一开始就是阻塞状态。' },
    's.ledger.pipelineContrib': { 'en-US': 'Assembled from {n} confirmed card(s) in this workspace.', 'zh-CN': '由本工作区 {n} 张已确认卡片装配而成。' },
    's.ledger.lane':      { 'en-US': '{lane} · {n}', 'zh-CN': '{lane} · {n}' },
    's.ledger.pipelineNote': { 'en-US': 'This graph belongs to its workspace. Switching workspace does not delete it — it is held in the slot of that workspace and comes back when you return. Both surfaces build from the same adapter, so the shape is identical here and on the compile preview.',
                              'zh-CN': '这张图属于它所在的工作区。切换工作区不会删掉它 —— 它保存在该工作区的槽位里，切回来就还在。两个界面用的是同一个适配器，所以形状完全一致。' },

    /* ---- model adapter contract ---- */
    's.ledger.contract':  { 'en-US': 'Model adapter contract', 'zh-CN': '模型适配器契约' },
    's.ledger.contractNote': { 'en-US': 'This is the hole, described rather than filled. There is no endpoint in this build and no key in this bundle.',
                               'zh-CN': '这里描述的是那个洞，而不是把它填上。本次构建里没有端点，这个包里也没有密钥。' },
    's.contract.endpoint': { 'en-US': 'endpoint: {v}', 'zh-CN': '端点：{v}' },
    's.contract.change':  { 'en-US': 'must change — {field} → {to}', 'zh-CN': '必须改变 —— {field} → {to}' },
    's.contract.valid':   { 'en-US': 'payload validates', 'zh-CN': '载荷校验通过' },
    's.contract.invalid': { 'en-US': 'payload does not validate', 'zh-CN': '载荷校验未通过' },
    's.contract.validated': { 'en-US': 'Checked live against the current draft in this workspace: every one of the {n} contract fields is present with the right type, and confidence equals the sum of the disclosed basis.', 'zh-CN': '正在用本工作区当前草稿实时校验：契约里 {n} 个字段全部存在且类型正确，且置信度等于所披露依据之和。' },
    's.contract.confidenceRule': { 'en-US': 'confidence = sum of weights over basis, capped. weights = {w}', 'zh-CN': '置信度 = 依据各项权重之和，有上限。权重 = {w}' },
    's.contract.to.provider': { 'en-US': 'the real model id', 'zh-CN': '真实模型 id' },

    's.consent.microphone': { 'en-US': 'microphone',   'zh-CN': '麦克风' },
    's.consent.granted':    { 'en-US': 'granted',      'zh-CN': '已授权' },
    's.consent.denied':     { 'en-US': 'denied',       'zh-CN': '已拒绝' },
    's.consent.unavailable':{ 'en-US': 'unavailable',  'zh-CN': '不可用' },

    /* ---------------------------------------------------------- receipts */
    's.receipt.cardTitle': { 'en-US': 'Intent card, confirmed', 'zh-CN': '意图卡片（已确认）' },
    's.receipt.note':      { 'en-US': 'Recorded by the sandbox executor. No request left the page and nothing outside changed.',
                             'zh-CN': '由沙盒执行器记录。没有请求离开本页，外部也没有任何改变。' },
    's.verifiable.local':  { 'en-US': 'externalWorldChanged stayed false', 'zh-CN': 'externalWorldChanged 保持 false' },

    /* ------------------------------------------------------------- toasts */
    's.toast.predicted':  { 'en-US': 'Prediction ready at {n} confidence.',
                            'zh-CN': '预测已生成，置信度 {n}。' },
    's.toast.accepted':   { 'en-US': 'Prediction accepted into the field. It is yours to edit now.',
                            'zh-CN': '预测已采用到意图场。现在它由你修改。' },
    's.toast.tooShort':   { 'en-US': 'Two characters minimum before anything is predicted.',
                            'zh-CN': '至少两个字才会给出预测。' },
    's.toast.cardAdded':  { 'en-US': 'Intent sent to the orbit board.',
                            'zh-CN': '意图已送入轨道板。' },
    's.toast.cardConfirmed': { 'en-US': 'Confirmed. A receipt was recorded, externalWorldChanged stayed false, and the intent was assembled into the pipeline for this workspace ({nodes} node(s)).',
                               'zh-CN': '已确认。记录了回执，externalWorldChanged 仍为 false，并把该意图装配进了本工作区的管线（{nodes} 个节点）。' },
    's.toast.cardParked': { 'en-US': 'Card parked. It stays on the board, dimmed.',
                            'zh-CN': '卡片已搁置。它留在轨道板上，以暗色显示。' },
    's.toast.settled':    { 'en-US': 'All cards returned to their slots.', 'zh-CN': '所有卡片已回到原位。' },
    's.toast.modeList':   { 'en-US': 'List mode. Physics off, same actions.', 'zh-CN': '列表模式。物理关闭，操作不变。' },
    's.toast.modeFree':   { 'en-US': 'Free mode. Physics on.', 'zh-CN': '自由模式。物理开启。' },
    's.toast.micGranted': { 'en-US': 'The browser granted microphone access. No audio was recorded — the preview has no recorder.',
                            'zh-CN': '浏览器已授予麦克风权限。没有录制任何音频 —— 本预览没有录音器。' },
    's.toast.micDenied':  { 'en-US': 'The browser refused. That refusal is what got recorded.',
                            'zh-CN': '浏览器拒绝了。被记录下来的就是这个拒绝。' },
    's.toast.micUnavailable': { 'en-US': 'No microphone path is available in this browser. Recorded as unavailable, not as a refusal.',
                                'zh-CN': '此浏览器没有可用的麦克风路径。记为「不可用」，而不是「拒绝」。' }

  }, 'concept-anticipate');
})(window.KK);
