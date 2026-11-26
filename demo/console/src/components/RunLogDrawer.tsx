import { ColumnHeightOutlined, ExpandOutlined } from "@ant-design/icons";
import { Button, Drawer, Modal, Select, Switch, Tag, message } from "antd";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DashFilterField, DashFilterPanel, FilterInput } from "./DashFilterPanel";

type Level = "INFO" | "WARN" | "ERROR";
type Line = { at: string; level: Level; text: string };

const RUNS = [
  { value: "2041", label: "派单 #2041（运行中）", live: true },
  { value: "2040", label: "派单 #2040（已结束 · 完成）", live: false },
  { value: "2039", label: "派单 #2039（已结束 · 失败）", live: false },
];

const STEPS = ["登录税局", "拉取白名单", "进入申报页", "核对税费种", "落字回写", "上传结果"];

/** 示例日志：固定序列，不随机，重开抽屉内容不变 */
function makeLines(run: string): Line[] {
  const total = run === "2041" ? 236 : 188;
  const seed = Number(run) % 7;
  return Array.from({ length: total }, (_, index) => {
    const n = index + 1;
    const company = `示例企业 ${String(1000 + ((index * 7 + seed) % 180)).padStart(4, "0")}`;
    const taxNo = `9131${String(1000 + ((index * 13) % 9000)).padStart(4, "0")}MA${String(10 + (index % 80)).padStart(2, "0")}`;
    const step = STEPS[index % STEPS.length];
    const level: Level = n % 29 === 0 ? "ERROR" : n % 11 === 0 ? "WARN" : "INFO";
    const sec = (index * 7) % 60;
    const min = (10 + Math.floor((index * 7) / 60)) % 60;
    const at = `10:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    const tail = level === "ERROR" ? "页面元素未出现，已截图并重试" : level === "WARN" ? "响应偏慢，等待 3 秒后继续" : "完成";
    return { at, level, text: `[${step}] ${company}（${taxNo}）${tail}` };
  });
}

const SHOWN = 200;

function RunLogView({ inModal = false, tools = false, onMaximize }: { inModal?: boolean; tools?: boolean; onMaximize?: () => void }) {
  const [run, setRun] = useState("2041");
  const [keyword, setKeyword] = useState("");
  const [onlyProblem, setOnlyProblem] = useState(false);
  const [fill, setFill] = useState(false);
  const [animating, setAnimating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const live = RUNS.find((item) => item.value === run)?.live ?? false;
  const lines = useMemo(() => makeLines(run), [run]);
  const shown = useMemo(() => {
    const word = keyword.trim().toLowerCase();
    return lines.filter((line) => (!onlyProblem || line.level !== "INFO") && (!word || line.text.toLowerCase().includes(word)));
  }, [lines, keyword, onlyProblem]);
  const latest = shown.slice(-SHOWN);
  const raw = lines[lines.length - 1]?.text ?? "";
  const lastStatus = run === "2039" ? "失败" : "完成";

  // 撑满剩余高度：日志框底边 = 抽屉正文底部 - 24px。展开 / 收起筛选面板、改窗口大小时跟着重算
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || inModal) return;
    const body = box.closest(".ant-drawer-body");
    const apply = () => {
      if (!fill || !body) {
        box.style.height = "";
        return;
      }
      const top = box.getBoundingClientRect().top;
      box.style.height = `${Math.max(160, Math.round(body.getBoundingClientRect().bottom - 24 - top))}px`;
    };
    apply();
    if (!fill || !body) return;
    const observer = new ResizeObserver(apply);
    observer.observe(body);
    if (panelRef.current) observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [fill, inModal, shown.length, run]);

  useEffect(() => {
    if (!animating) return;
    const timer = window.setTimeout(() => setAnimating(false), 280);
    return () => window.clearTimeout(timer);
  }, [animating]);

  const text = (rows: Line[]) => rows.map((line) => `${line.at} ${line.level} ${line.text}`).join("\n");

  return (
    <div className={inModal ? "run-log is-modal" : "run-log"}>
      <div className="run-log__now">
        <Tag color="blue">正在</Tag>
        <span>正在核对税费种，已处理 {Math.min(lines.length, 112)} 户</span>
      </div>
      <p className="run-log__raw" title={raw}>
        {lines[lines.length - 1]?.at} {raw}
      </p>
      <div ref={panelRef}>
        <DashFilterPanel
          columns={inModal ? 2 : undefined}
          actions={
            <>
              <Button
                onClick={() => {
                  void navigator.clipboard?.writeText(text(shown));
                  message.success("已复制");
                }}
              >
                复制
              </Button>
              <Button onClick={() => message.success("已下载全文")}>下载全文</Button>
            </>
          }
        >
          {inModal ? null : (
            <DashFilterField label="运行日志">
              <Select className="dash-filter-select" value={run} onChange={setRun} options={RUNS.map(({ value, label }) => ({ value, label }))} />
            </DashFilterField>
          )}
          <DashFilterField label="筛选">
            <FilterInput placeholder="关键字（公司名 / 税号 / 步骤）" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </DashFilterField>
          <DashFilterField label="只看告警 / 失败">
            <span className="run-log__switch">
              <Switch checked={onlyProblem} onChange={setOnlyProblem} />
            </span>
          </DashFilterField>
        </DashFilterPanel>
      </div>
      <div className="run-log__status">
        <span className="run-log__state">
          {live ? <Tag color="blue">实时</Tag> : <Tag>已结束 · {lastStatus}</Tag>}
          <span>
            共 {shown.length} 行，这里显示最近 {latest.length} 行
          </span>
        </span>
        {tools ? (
          <span className="run-log__tools">
            <Button size="small" type="text" icon={<ExpandOutlined />} onClick={onMaximize}>
              弹窗最大化
            </Button>
            <Button
              size="small"
              type="text"
              className={fill ? "is-on" : undefined}
              icon={<ColumnHeightOutlined />}
              aria-pressed={fill}
              onClick={() => {
                setAnimating(true);
                setFill((value) => !value);
              }}
            >
              撑满剩余高度
            </Button>
          </span>
        ) : null}
      </div>
      <div ref={boxRef} className={animating ? "run-log__box is-animating" : "run-log__box"} role="log">
        {latest.length === 0 ? (
          <div className="run-log__empty">没有符合条件的日志行</div>
        ) : (
          latest.map((line, index) => (
            <div key={index} className={`run-log__line is-${line.level.toLowerCase()}`}>
              <span>{line.at}</span>
              <b>{line.level}</b>
              <span>{line.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** 当前任务的运行日志抽屉：宽 960，状态行右端带「弹窗最大化」「撑满剩余高度」两颗图标钮。 */
export function RunLogDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [wide, setWide] = useState(false);
  return (
    <>
      <Drawer title="运行日志" open={open} onClose={onClose} size={960} destroyOnHidden rootClassName="run-log-drawer">
        <RunLogView tools onMaximize={() => setWide(true)} />
      </Drawer>
      <Modal
        title="运行日志"
        open={wide}
        onCancel={() => setWide(false)}
        footer={null}
        destroyOnHidden
        width="min(1200px, calc(100vw - 48px))"
        wrapClassName="run-log-modal"
      >
        <RunLogView inModal />
      </Modal>
    </>
  );
}
