# KK Intent OS · v22 预览站

`kkmatch.com/v22` 的三方案预览（先觉之境 `anticipate` / 归档参考 `compile` / 概念站 `site`），
含全量验收门禁、发布证据与这三天的开发日志。

> **这是这个项目的第一个 git 仓库。** 在此之前，本地目录 `/opt/kk-match/frontend/v22`
> 和产出它的工作副本都不是 git 仓库，版本身份靠 sha256、回滚靠 `cp -a` 目录备份。
> 本仓的第一次提交就是当前线上状态，**没有可继承的历史**，不要去找更早的 commit。

## 另一台电脑上从这里开始

```bash
git clone https://github.com/aoshuang99-netizen/kkintent-v22.git
cd kkintent-v22
```

然后**先读 [`START-HERE.md`](START-HERE.md)** —— 三十秒结论、轮次时间线、代码地图、
四类卡点、以及怎么跑。它是这个包的入口，`README.md`（本文件）只是仓库门牌。

## 目录

| 路径 | 内容 |
|---|---|
| `START-HERE.md` | 入口：结论、时间线、代码地图、卡点、怎么跑 |
| `02-product/` | **67 个文件**，产品本体（HTML / CSS / JS / i18n / 门禁 / 6 篇文档 / 25 张截图），与线上逐字节一致 |
| `01-handoff/` | 给审计者的材料：架构、红线、28 个缺陷案例库、门禁逐段说明、卡点清单、**位置与 URL**、工具脚本 |
| `03-evidence/` | 发布证据：改动前 9 个文件的原始字节、4 份真实门禁日志、两处 origin 的逐文件哈希 |
| `04-devlog/` | 2026-10-15 / 16 / 17 开发日志（密码已替换）+ 操作铁律 |
| `MANIFEST.sha256.txt` | 归档内 **117 个文件**的 `sha256`、字节数、路径（tab 分隔）。`README.md` 与 `.gitattributes` 是本仓新增的门面文件，**不在清单内**，其余一一对应 |

## 三个一上手就会踩的点

1. **线上目录不是仓库、也没有构建**。`/opt/kk-match/frontend/v22` 是 nginx 的 `static root`，
   把文件拷进去即生效，**不需要 restart / reload / `docker cp`**。详见
   `01-handoff/08-LOCATIONS.md`。
2. **`/v22/` 不是 3xx 跳转**。它返回 `200` + 一个 HTML 门口页，靠 JS 跳转（保 `?lang=`），
   无 JS 时靠 `<noscript>` 的 meta refresh。`curl -I` 看到 200 是正确的。
3. **门禁会把输出写在自己的上级目录**（`e2e/acceptance.js` 里 `path.join(__dirname,'..','_audit')`）。
   在 `02-product/` 里直接跑会往里长出 `_audit/*.json`，把 67 撑成 69。**复制到隔离目录再跑**。

## 跑门禁

```bash
# 单段
node 02-product/e2e/acceptance.js https://kkmatch.com/v22 hub

# 全量（必须按这个分组跑；cross 段依赖 n / s 段填的 collected，单跑会假失败）
for G in "hub,lang" "n,s,cross" "sound,contract,retain" "site,rm,fb" \
         "widths" "appbar" "mob,zoom" "touch" "seo" "nav" "navclosure"; do
  node 02-product/e2e/acceptance.js https://kkmatch.com/v22 $G
done
```

当前基线：**生产 587/587 PASS + 33 INFO**；分享链接去掉 `seo` / `nav`（需要 nginx 响应头
与真实首页）= **536/536 PASS + 33 INFO**。`shots` 段 2 条因沙箱拦截截图写盘永久跳过，
所以声明总数 589 = 执行 587 + 跳过 2。

依赖：`playwright-core` + 本机 Chromium。没有 `node_modules`，装到仓库外即可。

## clone 之后先做这一件事

```bash
python - <<'PY'
import hashlib, os, sys
bad = missing = 0
for line in open("MANIFEST.sha256.txt", encoding="utf-8"):
    line = line.rstrip("\n")
    if not line or line.startswith("#"):
        continue
    h, size, rel = line.split("\t")
    if not os.path.exists(rel):
        print("MISSING", rel); missing += 1; continue
    b = open(rel, "rb").read()
    if hashlib.sha256(b).hexdigest() != h or len(b) != int(size):
        print("DIFF   ", rel); bad += 1
print("rows ok:", 117 - bad - missing, "| diff:", bad, "| missing:", missing)
sys.exit(1 if (bad or missing) else 0)
PY
```

必须打印 `rows ok: 117 | diff: 0 | missing: 0`。**不一致说明传输把字节改了**（EOL 转换、编码、
截断），别在这个状态上继续改代码——先查清楚是哪一层动的。`.gitattributes` 用 `* -text`
就是为了让这 117 行在任何机器、任何 `core.autocrlf` 下都成立。

## 红线

- 不伪造：没有的 URL、哈希、标题、进度就留空或报错，本地模拟不当作真实结果。
- 改动前先拉线上现版作为基线，改动后比对 **差异集合必须等于预期集合**（不是"看起来差不多"）。
- 生成的产物（`voices.html`、`research/*`）只改生成器。
- `SEPARATE`：`01-handoff/08-LOCATIONS.md` 与 `locations.json` 是唯一允许写生产主机地址的文件，
  且其中不含密码；其余文件里出现主机地址即视为缺陷。

## 状态

2026-10-17 · 第 8 轮完成：根路径直达先觉之境，三方案 hub 迁到 `/hub/`。
生产与分享链接均逐字节复核通过。未完成项见 `START-HERE.md` 的「卡点」与
`01-handoff/07-BACKLOG.md`。
