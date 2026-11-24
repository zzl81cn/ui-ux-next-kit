import { Alert, Button, Form, Input, Modal, message } from "antd";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { openLayoutSettings } from "../layouts/layoutSettingsEvent";

const TABS = [
  { key: "base", label: "基本设置" },
  { key: "security", label: "安全设置" },
  { key: "binding", label: "账号绑定" },
  { key: "notification", label: "新消息通知" },
  { key: "layout", label: "主题与布局设置" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function AccountSettingsPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>("base");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const due = sessionStorage.getItem("demo-password-due");

  useEffect(() => {
    if (params.get("open") === "password") {
      setTab("security");
      setPasswordOpen(true);
    }
  }, [params]);

  return (
    <>
      {due === "expired" ? <Alert type="warning" showIcon title="密码已到期，请先修改密码" style={{ marginBottom: 16 }} /> : null}
      {due === "reset" ? <Alert type="warning" showIcon title="首次登录或管理员重置后，请先修改密码" style={{ marginBottom: 16 }} /> : null}
      <div className="account-settings">
        <nav className="account-settings__nav">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "is-on" : ""}
              onClick={() => {
                setTab(item.key);
                if (item.key === "layout") openLayoutSettings();
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="account-settings__main">
          {tab === "base" ? <BaseForm /> : null}
          {tab === "security" ? (
            <>
              <h2>安全设置</h2>
              <Button type="primary" onClick={() => setPasswordOpen(true)}>
                修改密码
              </Button>
            </>
          ) : null}
          {tab === "binding" ? (
            <>
              <h2>账号绑定</h2>
              <p>还没有绑定第三方账号。</p>
            </>
          ) : null}
          {tab === "notification" ? (
            <>
              <h2>新消息通知</h2>
              <p>系统消息和待办以站内信通知。</p>
            </>
          ) : null}
          {tab === "layout" ? (
            <>
              <h2>主题与布局设置</h2>
              <p>布局在右侧抽屉里调整，不在这一页再做一套主题表单。</p>
              <Button type="primary" onClick={openLayoutSettings}>
                打开布局
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <Modal
        title="修改密码"
        open={passwordOpen}
        okText="保存"
        onCancel={() => {
          setPasswordOpen(false);
          if (params.get("open")) {
            const next = new URLSearchParams(params);
            next.delete("open");
            setParams(next, { replace: true });
          }
        }}
        onOk={() => {
          message.success("已保存");
          setPasswordOpen(false);
        }}
      >
        <Form layout="vertical">
          <Form.Item label="当前密码">
            <Input.Password />
          </Form.Item>
          <Form.Item label="新密码">
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function BaseForm() {
  return (
    <>
      <h2>基本设置</h2>
      <div className="account-settings__base">
        <Form
          layout="vertical"
          initialValues={{ nickname: "demo", email: "demo@example.com" }}
          onFinish={() => message.success("已保存")}
        >
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="nickname" label="昵称">
            <Input maxLength={32} />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
        </Form>
        <div className="account-settings__avatar">头像</div>
      </div>
    </>
  );
}
