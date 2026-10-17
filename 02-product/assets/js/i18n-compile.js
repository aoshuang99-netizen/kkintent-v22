/* ============================================================================
   KK Intent OS · i18n — concept N (compile / 编译之境)
   Only `n.*` keys live here. `b.*`-style borrowing does not happen in this
   round: the two concepts are independent, and the shared package owns the
   shell vocabulary.
   ========================================================================== */
(function (KK) {
  'use strict';

  KK.i18n.register({

    /* ------------------------------------------------------------- chrome */
    'n.docTitle':        { 'en-US': 'Intent Frame — KKmatch Intent OS (preview, concept N)',
                           'zh-CN': '意图框架 —— KKmatch 意图操作系统（预览 · 方案 N）' },
    'n.view.frame':      { 'en-US': 'Intent frame',   'zh-CN': '意图框' },
    'n.view.pipeline':   { 'en-US': 'Pipeline',       'zh-CN': '管线' },
    'n.view.log':        { 'en-US': 'Log & receipts', 'zh-CN': '日志与回执' },
    'n.navAria':         { 'en-US': 'Concept views',  'zh-CN': '方案视图' },
    'n.nav.back':        { 'en-US': 'Back to the hub', 'zh-CN': '返回预览首页' },
    'n.nav.other':       { 'en-US': 'Open the main line', 'zh-CN': '打开主线（方案 S）' },
    'n.skip':            { 'en-US': 'Skip to the intent frame', 'zh-CN': '跳到意图框' },

    /* -------------------------------------------------------------- frame */
    'n.frame.eyebrow':   { 'en-US': 'Generative intent core · preview', 'zh-CN': '生成式意图内核 · 预览' },
    'n.frame.h1':        { 'en-US': 'See the shape of a thought, then build the steps that follow.',
                           'zh-CN': '看见一个想法的形状，然后把它后面的步骤搭出来。' },
    'n.frame.sub':       { 'en-US': 'Write one long instruction. The frame measures it, the field answers, and the pipeline assembles node by node in front of you. Everything you see here is computed in this tab.',
                           'zh-CN': '写一条长指令。意图框会测量它，背景场会回应，管线在你面前逐节点搭起来。你看到的一切都在本标签页内计算得出。' },
    'n.frame.placeholder': { 'en-US': 'Type your full instruction — or pick a starting point below.',
                             'zh-CN': '写下你的完整指令 —— 或从下面选一个起点。' },
    'n.frame.compile':   { 'en-US': 'Compile the pipeline', 'zh-CN': '编译管线' },
    'n.frame.compiling': { 'en-US': 'Compiling…',     'zh-CN': '编译中…' },
    'n.frame.reset':     { 'en-US': 'Clear',          'zh-CN': '清空' },
    'n.frame.tooShort':  { 'en-US': 'Type at least two characters. Nothing is compiled from an empty frame.',
                           'zh-CN': '至少输入两个字符。空意图框不会编译出任何东西。' },
    'n.frame.note':      { 'en-US': 'No model is called. The reading comes from a local lexicon, and the pipeline from a fixed blueprint — both are labelled DEMO.',
                           'zh-CN': '不调用任何模型。解读来自本地词表，管线来自固定蓝图 —— 两者都标注为 DEMO。' },
    'n.frame.seedLabel': { 'en-US': 'Starting points', 'zh-CN': '起点' },
    'n.frame.seed1':     { 'en-US': 'Help me set up a CBT practice that catches the spiral early, and check in with me tonight.',
                           'zh-CN': '帮我搭一套 CBT 练习，能在情绪开始下滑时早点拦住，今晚再回访我一次。' },
    'n.frame.seed2':     { 'en-US': 'Help me prepare the conversation I keep postponing, and send it if I approve.',
                           'zh-CN': '帮我准备那场一直往后拖的对话，如果我批准就发出去。' },
    'n.frame.seed3':     { 'en-US': 'Help me look at the sentence I keep repeating about my work, and pick one small bet for this week.',
                           'zh-CN': '帮我看看那句我一直重复的、关于工作的话，并挑一件本周能下的小注。' },
    'n.frame.kbdHint':   { 'en-US': '⌘/Ctrl + Enter compiles',  'zh-CN': '⌘/Ctrl + Enter 编译' },
    'n.frame.toneNote':  { 'en-US': 'The frame border reflects the tone signal below. The numbers are the real reason.',
                           'zh-CN': '意图框的边框反映下方的语调信号。真正的依据是那些数字。' },
    'n.frame.result':    { 'en-US': 'Compiled result', 'zh-CN': '编译结果' },
    'n.frame.resultMeta':{ 'en-US': '{nodes} nodes · {edges} edges · {ms} ms of local compute · pacing {pacing} (disclosed)',
                           'zh-CN': '{nodes} 个节点 · {edges} 条连线 · 本地计算 {ms} · 呈现节奏 {pacing}（已声明）' },
    'n.frame.artifact':  { 'en-US': 'One artifact was stored in the account log.', 'zh-CN': '已向账户日志存入一条产物。' },

    /* ----------------------------------------------------------- pipeline */
    'n.pipe.title':      { 'en-US': 'Assembled pipeline',  'zh-CN': '已装配的管线' },
    'n.pipe.lead':       { 'en-US': 'Each node unlocks only when every node feeding it is done. Reopening a node blocks its downstream again — the same rule, both directions.',
                           'zh-CN': '只有当所有输入节点都完成后，一个节点才会解锁。重新打开一个节点会让它的下游重新阻塞 —— 同一条规则，双向生效。' },
    'n.pipe.empty':      { 'en-US': 'Nothing assembled yet. Compile an instruction first.',
                           'zh-CN': '尚未装配。请先编译一条指令。' },
    'n.pipe.rail':       { 'en-US': 'Node rail',      'zh-CN': '节点轨道' },
    'n.pipe.lane.sense': { 'en-US': 'sense',          'zh-CN': '感知' },
    'n.pipe.lane.shape': { 'en-US': 'shape',          'zh-CN': '成形' },
    'n.pipe.lane.act':   { 'en-US': 'act',            'zh-CN': '行动' },
    'n.pipe.lane.verify':{ 'en-US': 'verify',         'zh-CN': '验证' },
    'n.pipe.state.todo': { 'en-US': 'ready',          'zh-CN': '就绪' },
    'n.pipe.state.blocked': { 'en-US': 'blocked',     'zh-CN': '阻塞' },
    'n.pipe.state.done': { 'en-US': 'done',           'zh-CN': '完成' },
    'n.pipe.run':        { 'en-US': 'Run',            'zh-CN': '执行' },
    'n.pipe.reopen':     { 'en-US': 'Reopen',         'zh-CN': '重开' },
    'n.pipe.approval':   { 'en-US': 'needs approval', 'zh-CN': '需要审批' },
    'n.pipe.blockedBy':  { 'en-US': 'waiting on {ids}', 'zh-CN': '等待 {ids}' },
    'n.pipe.degraded':   { 'en-US': 'WebGL is not available ({reason}), so the 3D network is off. The pipeline below is the same data in two dimensions — no function is lost.',
                           'zh-CN': 'WebGL 不可用（{reason}），三维网络已关闭。下方管线是同一份数据的二维呈现 —— 功能没有损失。' },
    'n.pipe.pulse':      { 'en-US': 'Pulses travelling the network: {n}.', 'zh-CN': '网络中正在传输的脉冲：{n} 个。' },
    'n.pipe.inspector':  { 'en-US': 'Inspector',      'zh-CN': '检查器' },
    'n.pipe.noSel':      { 'en-US': 'Select a node to inspect it.', 'zh-CN': '选择一个节点以查看详情。' },

    /* ---------------------------------------------------------------- log */
    'n.log.title':       { 'en-US': 'Compile log',    'zh-CN': '编译日志' },
    'n.log.lead':        { 'en-US': 'Every line below is either a measurement taken in this tab or a value labelled DEMO. The marker on the left says which.',
                           'zh-CN': '下面每一行要么是本标签页内的实测值，要么是标注为 DEMO 的值。左侧的标记说明了是哪种。' },
    'n.log.receipts':    { 'en-US': 'Receipts',       'zh-CN': '回执' },
    'n.log.receiptsEmpty': { 'en-US': 'No receipts yet. Approve an approval-gated node to produce one.',
                             'zh-CN': '还没有回执。批准一个带审批门的节点即可产生一张。' },
    'n.log.origin':      { 'en-US': 'from workspace: {name}', 'zh-CN': '来自工作情境：{name}' },
    'n.log.originSame':  { 'en-US': 'current workspace', 'zh-CN': '当前工作情境' },
    'n.log.audit':       { 'en-US': 'Account audit log', 'zh-CN': '账户审计日志' },
    'n.log.auditEmpty':  { 'en-US': 'Empty.',          'zh-CN': '空。' },
    'n.log.auditNote':   { 'en-US': 'This log belongs to the account, not to a workspace. Switching workspace does not erase it — the previous round shipped that bug and it was measured, so here the rule is explicit.',
                           'zh-CN': '这份日志属于账户，不属于某个工作情境。切换情境不会抹掉它 —— 上一轮确实交付过这个缺陷，并且是被实测发现的，所以这里把规则写死。' },
    'n.log.sandboxNote': { 'en-US': 'Sandbox executor · externalWorldChanged is false on every receipt.',
                           'zh-CN': '沙盒执行器 · 每一张回执的 externalWorldChanged 均为 false。' },

    /* --------------------------------------------------------- receipts & toasts */
    'n.verifiable.local': { 'en-US': 'computed in this tab',         'zh-CN': '在本标签页内计算' },
    'n.receipt.localNote': { 'en-US': 'Local computation only. No request left the page.',
                             'zh-CN': '仅本地计算。没有任何请求离开本页。' },
    'n.receipt.mode.preview': { 'en-US': 'PREVIEW_ADAPTER',          'zh-CN': 'PREVIEW_ADAPTER' },
    'n.openPipeline':    { 'en-US': 'Open the pipeline view',        'zh-CN': '打开管线视图' },
    'n.pipe.reopenNote': { 'en-US': '{n} downstream node(s) moved back to blocked.',
                           'zh-CN': '{n} 个下游节点已回到阻塞状态。' },
    'n.toast.compiled':  { 'en-US': 'Pipeline assembled: {nodes} nodes, {edges} edges.',
                           'zh-CN': '管线已装配：{nodes} 个节点，{edges} 条连线。' },
    'n.toast.nodeDone':  { 'en-US': '{node} completed. Receipt recorded.',
                           'zh-CN': '{node} 已完成。已记录回执。' },
    'n.toast.nodeDenied': { 'en-US': 'Denied. The node is still open and nothing ran.',
                            'zh-CN': '已拒绝。该节点仍然开放，没有执行任何东西。' },
    'n.toast.reopened':  { 'en-US': '{node} reopened.',              'zh-CN': '{node} 已重开。' },
    'n.toast.clearFirst': { 'en-US': 'Run the upstream nodes first — this one is blocked.',
                            'zh-CN': '请先执行上游节点 —— 这个节点处于阻塞状态。' }

  }, 'concept-compile');
})(window.KK);
