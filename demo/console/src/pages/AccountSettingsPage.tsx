import { Alert, Button, Form, Input, message } from "antd";
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
  const due = sessionStorage.getItem("demo-password-due");
  const forced = due === "expired" || due === "reset";
  const openPassword = params.get("open") === "password";
  const [tab, setTab] = useState<TabKey>(forced || openPassword ? "security" : "base");

  useEffect(() => {
    if (forced || openPassword) setTab("security");
  }, [forced, openPassword]);

  useEffect(() => {
    if (!openPassword) return;
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
  }, [openPassword, params, setParams]);

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
          {tab === "security" ? <SecurityForm forced={forced} /> : null}
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

function SecurityForm({ forced }: { forced: boolean }) {
  return (
    <>
      <h2>安全设置</h2>
      <Form
        className="account-settings__password"
        layout="vertical"
        requiredMark={false}
        onFinish={() => {
          message.success("密码已更新");
          if (forced) sessionStorage.removeItem("demo-password-due");
        }}
      >
        <Form.Item name="current" label="当前密码" rules={[{ required: true, message: "请输入当前密码" }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="next"
          label="新密码"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 8, message: "新密码至少 8 位" },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="确认新密码"
          dependencies={["next"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("next") === value) return Promise.resolve();
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          保存
        </Button>
      </Form>
    </>
  );
}
