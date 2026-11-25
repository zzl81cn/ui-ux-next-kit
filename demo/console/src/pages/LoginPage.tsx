import { Button, Form, Input, Space, Typography, message, type InputRef } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import feishuMark from "../assets/feishu-logo.png";
import { PRODUCT_LOGO, PRODUCT_NAME } from "../brand";
import { loadCaptchaSettings } from "../lib/consolePrefs";
import { useSiteBrand } from "../lib/siteBrand";
import { issueCaptcha, login } from "../mock/data";
import { hasSession, saveSession } from "../lib/session";

/** 演示里不发明公钥。提交体只放密文，内存校验不读明文密码。 */
function seal(value: string) {
  return btoa(unescape(encodeURIComponent(value)));
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm<{ username: string; password: string; captcha_code: string }>();
  const [captcha, setCaptcha] = useState<{ captcha_id: string; image: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const captchaInputRef = useRef<InputRef>(null);
  const brand = useSiteBrand();
  const captchaOn = loadCaptchaSettings().enabled;
  const redirect = params.get("redirect") || "/stats";

  const reloadCaptcha = useCallback(() => {
    if (!loadCaptchaSettings().enabled) {
      setCaptcha(null);
      return null;
    }
    const next = issueCaptcha();
    setCaptcha(next);
    form.setFieldValue("captcha_code", "");
    return next;
  }, [form]);

  useEffect(() => {
    reloadCaptcha();
    if (loadCaptchaSettings().enabled) captchaInputRef.current?.focus();
  }, [reloadCaptcha]);

  if (hasSession()) {
    return <Navigate to={redirect.startsWith("/") ? redirect : "/stats"} replace />;
  }

  async function onFinish(values: { username: string; password: string; captcha_code?: string }) {
    if (loadCaptchaSettings().enabled && !captcha?.captcha_id) {
      message.error("请刷新验证码");
      reloadCaptcha();
      captchaInputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const result = login({
        username: seal(values.username),
        password: seal(values.password),
        captchaId: captcha?.captcha_id ?? "",
        captchaCode: values.captcha_code ?? "",
      });
      if (!result.ok) {
        message.error(result.message || "登录失败");
        reloadCaptcha();
        captchaInputRef.current?.focus();
        return;
      }
      saveSession();
      navigate(redirect.startsWith("/") ? redirect : "/stats", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="console-login">
      <div className="console-login-card">
        {brand.logo_url ? (
          <img src={brand.logo_url} alt="" style={{ height: 40, width: "auto" }} />
        ) : (
          <img src={PRODUCT_LOGO} alt="" style={{ height: 40, width: 40, display: "block" }} />
        )}
        <Typography.Title level={3} className="console-login-title">
          {brand.site_name || PRODUCT_NAME}
          {brand.site_tag ? <span className="console-brand-tag">{brand.site_tag}</span> : null}
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="console-login-sub">
          使用账号密码登录
        </Typography.Paragraph>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ username: "demo", password: "demo" }}
          onFinish={onFinish}
        >
          <Form.Item name="username" label="账号" rules={[{ required: true, message: "请输入账号" }]}>
            <Input size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          {captchaOn ? (
            <Form.Item label="验证码" required>
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="captcha_code" noStyle rules={[{ required: true, message: "请输入验证码" }]}>
                  <Input ref={captchaInputRef} size="large" autoComplete="off" maxLength={6} />
                </Form.Item>
                <button
                  type="button"
                  className="console-login-captcha"
                  onClick={() => {
                    reloadCaptcha();
                    captchaInputRef.current?.focus();
                  }}
                >
                  {captcha?.image ? <img src={captcha.image} alt="验证码，点击刷新" /> : <span>刷新</span>}
                </button>
              </Space.Compact>
            </Form.Item>
          ) : null}
          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            登录
          </Button>
          <button type="button" className="console-login-feishu" onClick={() => message.info("飞书登录暂未开通")}>
            <img src={feishuMark} alt="" width={18} height={18} />
            飞书登录
          </button>
        </Form>
      </div>
    </div>
  );
}
