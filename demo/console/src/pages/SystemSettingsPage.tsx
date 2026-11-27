import { UploadOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Tabs, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState, type DragEvent } from "react";
import { PRODUCT_NAME } from "../brand";
import {
  issuePublishToken,
  loadCaptchaSettings,
  loadMotion,
  loadPublish,
  loadRefresh,
  loadSecurity,
  revokePublish,
  saveCaptchaSettings,
  saveMotion,
  saveRefresh,
  saveSecurity,
  type CaptchaSettings,
  type PublishStatus,
} from "../lib/consolePrefs";
import { saveBrandSlot, saveBrandText, svgForDark, useSiteBrand, type BrandSlot } from "../lib/siteBrand";
import { previewCaptcha } from "../mock/data";

const ACCEPT = ".svg,.png,.jpg,.jpeg,.webp,.gif,.ico";

function readFile(file: File, slot: BrandSlot) {
  const allowed = /\.(svg|png|jpe?g|webp|gif|ico)$/i.test(file.name);
  if (!allowed) {
    message.error("只支持 SVG / PNG / JPG / WEBP / ICO");
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    message.error("图片不超过 1.5MB");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    saveBrandSlot(slot, String(reader.result));
    message.success("已上传");
  };
  reader.onerror = () => message.error("上传失败");
  reader.readAsDataURL(file);
}

function UploadSlot({
  slot,
  label,
  note,
  compact,
  dark,
}: {
  slot: BrandSlot;
  label: string;
  note: string;
  compact?: boolean;
  dark?: boolean;
}) {
  const brand = useSiteBrand();
  const stored =
    slot === "logo" ? brand.logo_url : slot === "logo_dark" ? brand.logo_dark_url : slot === "logo_collapsed" ? brand.logo_collapsed_url : brand.favicon_url;
  const preview = stored || (slot === "logo_dark" ? svgForDark(brand.logo_url) : null);
  const [over, setOver] = useState(false);

  function take(file: File | undefined) {
    if (file) readFile(file, slot);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files[0]);
  }

  return (
    <div className="brand-upload">
      <span className="brand-upload__label">{label}</span>
      <label
        className={["brand-upload__drop", compact ? "is-compact" : "", dark ? "is-dark" : "", over ? "is-over" : ""].filter(Boolean).join(" ")}
        aria-label="点击或拖拽图片上传"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.currentTarget.querySelector("input")?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(event) => {
            take(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {preview ? <img src={preview} alt="" /> : <span>{over ? (compact ? "松开上传" : "松开即上传") : "拖拽图片到这里，或点击选择"}</span>}
      </label>
      <div style={{ marginTop: 8 }}>
        <Button icon={<UploadOutlined />} onClick={(event) => (event.currentTarget.parentElement?.parentElement?.querySelector("input") as HTMLInputElement | null)?.click()}>
          更换
        </Button>
        {stored ? (
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => {
              try {
                saveBrandSlot(slot, null);
              } catch {
                message.error("恢复失败");
              }
            }}
          >
            恢复默认
          </Button>
        ) : null}
      </div>
      <p className="brand-upload__note">{note}</p>
    </div>
  );
}

function BrandTab() {
  const brand = useSiteBrand();
  const [saving, setSaving] = useState(false);
  return (
    <Form
      className="console-settings-form"
      layout="vertical"
      initialValues={{ site_name: brand.site_name, site_tag: brand.site_tag, logo_alt: brand.logo_alt || PRODUCT_NAME }}
      onFinish={async (values: { site_name: string; site_tag: string; logo_alt: string }) => {
        if (!values.logo_alt?.trim()) {
          message.error("请填写 Logo 替代文字");
          return;
        }
        setSaving(true);
        try {
          await Promise.resolve();
          saveBrandText({
            site_name: values.site_name.trim(),
            site_tag: values.site_tag.trim(),
            logo_alt: values.logo_alt.trim(),
          });
          message.success("已保存");
        } catch {
          message.error("保存失败");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="console-settings-form-body">
        <div className="brand-uploads">
          <UploadSlot slot="logo" label="导航 Logo" note="登录页和侧栏展开时显示，按高度 32px 显示。建议 SVG；用 PNG 请传 2～3 倍图，否则高清屏会发虚。" />
          <UploadSlot slot="logo_dark" label="深色模式 Logo" dark note="深色主题下替换导航 Logo。不传时自动用导航 Logo：SVG 里的深色字会转成浅色；PNG 等位图转不了，需单独上传浅色字版本。" />
          <UploadSlot slot="logo_collapsed" label="收缩菜单 Logo" compact note="侧栏收起时显示，建议窄图或图标，约 64×76。" />
          <UploadSlot slot="favicon" label="Favicon" compact note="浏览器标签页图标，支持 ICO / PNG / SVG。" />
        </div>
        <Form.Item name="site_name" label="站点名称" extra="顶栏标题。留空时用「管理控制台」。">
          <Input maxLength={40} />
        </Form.Item>
        <Form.Item name="site_tag" label="站点角标" extra="短标签，显示在顶栏站点名称后面，底色在红橙黄绿青蓝紫之间循环。可留空。">
          <Input maxLength={16} />
        </Form.Item>
        <Form.Item name="logo_alt" label="Logo 替代文字" rules={[{ required: true, message: "请填写 Logo 替代文字" }]} extra="图片加载失败时的说明，同时用作浏览器标签标题。">
          <Input maxLength={40} />
        </Form.Item>
      </div>
      <div className="console-settings-action-bar">
        <Button type="primary" htmlType="submit" loading={saving}>
          保存
        </Button>
      </div>
    </Form>
  );
}

function SecurityTab() {
  const [saving, setSaving] = useState(false);
  return (
    <Form
      className="console-settings-form"
      layout="vertical"
      initialValues={loadSecurity()}
      onFinish={async (values) => {
        setSaving(true);
        try {
          await Promise.resolve();
          saveSecurity(values);
          message.success("已保存");
        } catch {
          message.error("保存失败");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="console-settings-form-body">
        <Form.Item name="max_failures" label="失败锁定次数" extra="连续密码错误达到该次数后锁定。范围 3–20，默认 5。">
          <InputNumber min={3} max={20} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="lock_minutes" label="锁定分钟" extra="范围 5–1440，默认 60。">
          <InputNumber min={5} max={1440} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item
          name="session_minutes"
          label="会话时效（分钟）"
          extra="控制刷新令牌有效期。默认 20160（14 天），与现有会话一致。0 表示不过期。访问令牌仍最长 2 小时，短于会话时按会话截断。"
        >
          <InputNumber min={0} max={525600} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item
          name="min_length"
          label="密码最短长度"
          extra="范围 6–64，默认 8。用户首登强制改密、定期改密和自己改密时生效；管理员新建 / 重置给的临时密码不受限。"
        >
          <InputNumber min={6} max={64} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="require_upper" label="必须含大写" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="require_lower" label="必须含小写" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="require_digit" label="必须含数字" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="require_special" label="必须含特殊字符" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="rotation_enabled" label="定期更换密码" valuePropName="checked" extra="到期后仍可登录，会引导到个人设置修改。">
          <Switch />
        </Form.Item>
        <Form.Item name="rotation_days" label="更换周期（天）" extra="范围 30–365，默认 90。">
          <InputNumber min={30} max={365} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item
          name="temp_password_hours"
          label="临时密码有效期（小时）"
          extra="管理员新建用户或重置密码后，用户须在此时间内登录并改密，超时账号锁定，需管理员再次重置。范围 1–168，默认 8。"
        >
          <InputNumber min={1} max={168} style={{ width: 200 }} />
        </Form.Item>
      </div>
      <div className="console-settings-action-bar">
        <Button type="primary" htmlType="submit" loading={saving}>
          保存
        </Button>
      </div>
    </Form>
  );
}

function CaptchaTab() {
  const [form] = Form.useForm<CaptchaSettings>();
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function refreshPreview() {
    try {
      const current = form.getFieldsValue();
      setImage(previewCaptcha({ ...loadCaptchaSettings(), ...current }));
    } catch {
      message.error("预览失败");
    }
  }

  useEffect(() => {
    setImage(previewCaptcha(loadCaptchaSettings()));
  }, []);

  return (
    <Form
      form={form}
      className="console-settings-form"
      layout="vertical"
      initialValues={loadCaptchaSettings()}
      onFinish={async (values) => {
        setSaving(true);
        try {
          await Promise.resolve();
          saveCaptchaSettings(values);
          message.success("已保存");
        } catch {
          message.error("保存失败");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="console-settings-form-body">
        <Form.Item name="enabled" label="启用登录验证码" valuePropName="checked" extra="关闭后登录不再校验图形码。默认开启，与当前登录页一致。">
          <Switch />
        </Form.Item>
        <Form.Item name="length" label="位数" extra="4–6。">
          <InputNumber min={4} max={6} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="noise" label="噪点">
          <Select
            style={{ width: 200 }}
            options={[
              { value: "low", label: "低" },
              { value: "medium", label: "中" },
              { value: "high", label: "高" },
            ]}
          />
        </Form.Item>
        <Form.Item name="lines" label="干扰线" extra="0–8。">
          <InputNumber min={0} max={8} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item label="预览" extra="点图片按当前表单刷新，不必先保存。">
          <button type="button" className="console-captcha-preview" onClick={refreshPreview}>
            {image ? <img src={image} alt="验证码预览，点击刷新" /> : <span>刷新预览</span>}
          </button>
        </Form.Item>
      </div>
      <div className="console-settings-action-bar">
        <Button type="primary" htmlType="submit" loading={saving}>
          保存
        </Button>
        <Button onClick={refreshPreview}>刷新预览</Button>
      </div>
    </Form>
  );
}

function RefreshTab() {
  const [saving, setSaving] = useState(false);
  return (
    <Form
      className="console-settings-form"
      layout="vertical"
      initialValues={loadRefresh()}
      onFinish={async (values: { enabled: boolean; intervalSec: number }) => {
        setSaving(true);
        try {
          await Promise.resolve();
          saveRefresh(values);
          message.success("已保存，重新进入页面后生效");
        } catch {
          message.error("保存失败");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="console-settings-form-body">
        <Form.Item
          name="enabled"
          label="列表定时刷新"
          valuePropName="checked"
          extra="默认开启；关闭后靠表格右上角刷新（手机下拉）手动更新。目前作用于「高级任务计划」。只对当前浏览器生效。"
        >
          <Switch />
        </Form.Item>
        <Form.Item name="intervalSec" label="刷新间隔（秒）" extra="3–300，默认 60。仅在开启定时刷新时使用。">
          <InputNumber min={3} max={300} style={{ width: 200 }} />
        </Form.Item>
      </div>
      <div className="console-settings-action-bar">
        <Button type="primary" htmlType="submit" loading={saving}>
          保存
        </Button>
      </div>
    </Form>
  );
}

function MotionTab() {
  const [saving, setSaving] = useState(false);
  return (
    <Form
      className="console-settings-form"
      layout="vertical"
      initialValues={loadMotion()}
      onFinish={async (values: { chartDelayMs: number; cardGapMs: number }) => {
        setSaving(true);
        try {
          await Promise.resolve();
          saveMotion(values);
          message.success("已保存，重新进入「数据统计」后生效");
        } catch {
          message.error("保存失败");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="console-settings-form-body">
        <Form.Item
          name="chartDelayMs"
          label="图表进场延迟（毫秒）"
          extra="「数据统计」数据到达后等多久，运行趋势、用时占比环图、数字跳动和条形生长一起开始。0–2000，默认 100。系统开启「减少动态效果」时不等待。只对当前浏览器生效。"
        >
          <InputNumber min={0} max={2000} step={50} style={{ width: 200 }} />
        </Form.Item>
        <Form.Item
          name="cardGapMs"
          label="卡片依次进场间隔（毫秒）"
          extra="「数据统计」打开时，卡片按版面顺序一张接一张上浮出现，相邻两张隔多久。0–200，默认 70；0 表示不排队，整页一起出现。卡片多时整条队列最长约 0.9 秒，间隔会自动压小。系统开启「减少动态效果」时不排队。只对当前浏览器生效。"
        >
          <InputNumber min={0} max={200} step={10} style={{ width: 200 }} />
        </Form.Item>
      </div>
      <div className="console-settings-action-bar">
        <Button type="primary" htmlType="submit" loading={saving}>
          保存
        </Button>
      </div>
    </Form>
  );
}

function PublishTab() {
  const [status, setStatus] = useState<PublishStatus>(() => loadPublish());
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const envLines = fresh ? `RUNNER_PUBLISH_TOKEN=${fresh}\nAPI_BASE_URL=${window.location.origin}` : "";

  function issue() {
    setBusy(true);
    try {
      const next = issuePublishToken();
      setStatus(next.status);
      setFresh(next.token);
    } catch {
      message.error("生成失败");
    } finally {
      setBusy(false);
    }
  }

  function revoke() {
    setBusy(true);
    try {
      setStatus(revokePublish());
      setFresh(null);
      message.success("已吊销，旧口令立即失效");
    } catch {
      message.error("吊销失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="console-settings-form">
      <div className="console-settings-form-body">
        <Typography.Paragraph type="secondary">
          在本机仓库 <Typography.Text code>.env.local</Typography.Text> 写入口令后，
          <Typography.Text code>pnpm agent:publish</Typography.Text> 直接打包、上传、发布执行端，不用再从控制台复制登录令牌。
          口令只能上传 / 发布执行端包和运行包，审计记为 ci；库里只存哈希。
        </Typography.Paragraph>
        <Descriptions
          column={1}
          size="small"
          bordered
          items={[
            {
              key: "state",
              label: "当前口令",
              children: status.hint ? `已生成（末 4 位 ${status.hint}）` : "未生成",
            },
            {
              key: "at",
              label: "生成时间",
              children: status.updatedAt ? dayjs(status.updatedAt).format("YYYY-MM-DD HH:mm") : "—",
            },
            {
              key: "env",
              label: "服务器环境变量",
              children: status.envConfigured ? "也配了 RUNNER_PUBLISH_TOKEN（两把都认）" : "未配置（不影响）",
            },
          ]}
        />
      </div>
      <div className="console-settings-action-bar">
        {status.hint ? (
          <>
            <Popconfirm
              title="重新生成发布口令？"
              description="旧口令立即失效，用旧口令的本机要改 .env.local。"
              okText="重新生成"
              onConfirm={issue}
            >
              <Button type="primary" loading={busy}>
                重新生成
              </Button>
            </Popconfirm>
            <Popconfirm title="吊销发布口令？" okText="吊销" okButtonProps={{ danger: true }} onConfirm={revoke}>
              <Button danger disabled={busy}>
                吊销
              </Button>
            </Popconfirm>
          </>
        ) : (
          <Button type="primary" loading={busy} onClick={issue}>
            生成口令
          </Button>
        )}
      </div>
      <Modal
        title="新的执行端发布口令"
        open={fresh !== null}
        onCancel={() => setFresh(null)}
        footer={
          <Button type="primary" onClick={() => setFresh(null)}>
            我已保存
          </Button>
        }
      >
        <Alert type="warning" showIcon title="口令只显示这一次，关掉后无法再查看，忘了只能重新生成。" style={{ marginBottom: 12 }} />
        <Typography.Paragraph>把下面两行加进本机仓库的 .env.local：</Typography.Paragraph>
        <Typography.Paragraph copyable={{ text: envLines }}>
          <pre className="console-publish-token">{envLines}</pre>
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}

export function SystemSettingsPage() {
  return (
    <div className="console-settings-page">
      <Tabs
        className="console-settings-tabs console-page-tabs"
        destroyOnHidden
        items={[
          { key: "brand", label: "品牌标识", children: <BrandTab /> },
          { key: "security", label: "登录安全", children: <SecurityTab /> },
          { key: "captcha", label: "登录验证码", children: <CaptchaTab /> },
          { key: "refresh", label: "列表刷新", children: <RefreshTab /> },
          { key: "motion", label: "界面动效", children: <MotionTab /> },
          { key: "publish", label: "执行端发布", children: <PublishTab /> },
        ]}
      />
    </div>
  );
}
