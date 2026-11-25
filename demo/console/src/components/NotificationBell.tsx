import { BellOutlined, LoadingOutlined } from "@ant-design/icons";
import { Badge, Button, Drawer, Empty, Popconfirm, Popover, Skeleton, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearNotices,
  fetchNotices,
  fetchUnreadCount,
  markAllNoticesRead,
  markNoticeRead,
  useNoticeVersion,
  type NoticeRecord,
} from "../mock/notifications";

/** 类型键 → 标签。不认识的键不画标签，不报错。 */
const TYPE_TAGS: Record<string, { color: string; label: string }> = {
  "job.succeeded": { color: "green", label: "跑完" },
  "job.failed": { color: "red", label: "失败" },
  "job.expired": { color: "default", label: "过期" },
  "app.owner_in": { color: "blue", label: "归属" },
  "app.owner_out": { color: "blue", label: "归属" },
  "app.member_added": { color: "blue", label: "协作" },
  "runner.published": { color: "purple", label: "运行包" },
};

const POLL_MS = 30_000;

function fmtTime(at: number) {
  const diff = Date.now() - at;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return dayjs(at).format("MM-DD HH:mm");
}

function NoticePanel({ mobile, onClose }: { mobile: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<NoticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  useNoticeVersion();

  // 打开时现拉第一页，不用旧缓存。面板关闭即销毁，下次打开重新拉。
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const page = fetchNotices(0);
      setRows(page.rows);
      setMore(page.hasMore);
      setLoading(false);
    }, 280);
    return () => window.clearTimeout(timer);
  }, []);

  const totalUnread = fetchUnreadCount();
  const empty = !loading && rows.length === 0;

  const loadMore = () => {
    setLoadingMore(true);
    window.setTimeout(() => {
      const page = fetchNotices(rows.length);
      setRows((prev) => [...prev, ...page.rows]);
      setMore(page.hasMore);
      setLoadingMore(false);
    }, 400);
  };

  const open = (row: NoticeRecord) => {
    if (!row.read) {
      markNoticeRead(row.id);
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, read: true } : item)));
    }
    if (row.link) {
      onClose();
      navigate(row.link);
    }
  };

  return (
    <div className={["notice-panel", mobile ? "is-mobile" : ""].filter(Boolean).join(" ")}>
      <div className="notice-panel__head">
        <span className="notice-panel__title">
          消息通知{totalUnread > 0 ? `（${totalUnread} 条未读）` : ""}
        </span>
        <span className="notice-panel__actions">
          <Button
            type="link"
            size="small"
            disabled={totalUnread === 0}
            onClick={() => {
              markAllNoticesRead();
              setRows((prev) => prev.map((item) => ({ ...item, read: true })));
            }}
          >
            全部已读
          </Button>
          <Popconfirm
            title="清空全部消息？"
            okText="清空"
            cancelText="取消"
            placement="bottomRight"
            onConfirm={() => {
              clearNotices();
              setRows([]);
              setMore(false);
            }}
          >
            <Button type="link" size="small" disabled={empty || loading}>
              清空
            </Button>
          </Popconfirm>
        </span>
      </div>
      {loading ? (
        <div className="notice-panel__skeleton">
          <Skeleton title={false} paragraph={{ rows: 3 }} active />
        </div>
      ) : empty ? (
        <div className="notice-panel__empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无消息" />
        </div>
      ) : (
        <div className="notice-panel__list">
          {rows.map((row) => {
            const tag = TYPE_TAGS[row.type];
            return (
              <button key={row.id} type="button" className={["notice-item", row.read ? "" : "is-unread"].filter(Boolean).join(" ")} onClick={() => open(row)}>
                <span className="notice-item__dot" aria-hidden />
                <span className="notice-item__main">
                  <span className="notice-item__title">
                    {tag ? (
                      <Tag variant="filled" color={tag.color} style={{ fontWeight: 400, marginInlineEnd: 6 }}>
                        {tag.label}
                      </Tag>
                    ) : null}
                    {row.title}
                  </span>
                  {row.body ? <span className="notice-item__body">{row.body}</span> : null}
                  <span className="notice-item__time">{fmtTime(row.at)}</span>
                </span>
              </button>
            );
          })}
          {more ? (
            <div className="notice-panel__more">
              <Button type="link" size="small" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <LoadingOutlined /> : null}
                加载更多
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function NotificationBell({ mobile }: { mobile: boolean }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(fetchUnreadCount);
  const version = useNoticeVersion();
  const timer = useRef<number | undefined>(undefined);

  // 本地操作后立刻对账
  useEffect(() => setCount(fetchUnreadCount()), [version]);

  // 每 30 秒拉一次未读计数；窗口重新聚焦时也拉一次；切到别的标签页停止轮询。只拉计数不拉列表。
  useEffect(() => {
    const pull = () => setCount(fetchUnreadCount());
    const start = () => {
      window.clearInterval(timer.current);
      timer.current = window.setInterval(pull, POLL_MS);
    };
    const onVisible = () => {
      if (document.hidden) {
        window.clearInterval(timer.current);
      } else {
        pull();
        start();
      }
    };
    if (!document.hidden) start();
    window.addEventListener("focus", pull);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer.current);
      window.removeEventListener("focus", pull);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((prev) => !prev);
    }
  };

  const trigger = (
    <span
      className={["console-theme-toggle", "console-bell", mobile ? "is-mobile" : ""].filter(Boolean).join(" ")}
      role="button"
      aria-label="消息通知"
      tabIndex={0}
      onKeyDown={onKey}
      onClick={mobile ? () => setOpen(true) : undefined}
    >
      <Badge size="small" count={count} overflowCount={99} offset={[4, -2]}>
        <BellOutlined className="console-bell__icon" />
      </Badge>
    </span>
  );

  if (mobile) {
    return (
      <>
        {trigger}
        <Drawer
          rootClassName="notice-drawer"
          placement="bottom"
          title="消息通知"
          open={open}
          onClose={() => setOpen(false)}
          destroyOnHidden
          size="70vh"
          styles={{ body: { padding: 0 } }}
        >
          <NoticePanel mobile onClose={() => setOpen(false)} />
        </Drawer>
      </>
    );
  }

  return (
    <Tooltip title={open ? null : "消息通知"}>
      <Popover
        trigger="click"
        placement="bottomRight"
        arrow={false}
        open={open}
        onOpenChange={setOpen}
        destroyOnHidden
        styles={{ container: { padding: 0 } }}
        content={<NoticePanel mobile={false} onClose={() => setOpen(false)} />}
      >
        {trigger}
      </Popover>
    </Tooltip>
  );
}
