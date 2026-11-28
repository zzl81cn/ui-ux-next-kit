import { Button, Form, Input, Space, Typography, message, type InputRef } from "antd";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
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
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const glowTarget = useRef({ x: 0, y: 0 });
  const glowShown = useRef({ x: 0, y: 0 });
  const glowArmed = useRef(false);
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

  useEffect(
    () => () => {
      window.cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  /** 指针光晕：目标点跟鼠标，显示点每帧向目标插值（阻尼约 0.16），只写 CSS 变量，不 setState */
  function paintGlow() {
    frame.current = 0;
    const card = cardRef.current;
    if (!card) return;
    const shown = glowShown.current;
    const target = glowTarget.current;
    shown.x += (target.x - shown.x) * 0.16;
    shown.y += (target.y - shown.y) * 0.16;
    card.style.setProperty("--mouse-x", `${shown.x.toFixed(1)}px`);
    card.style.setProperty("--mouse-y", `${shown.y.toFixed(1)}px`);
    const dx = target.x - shown.x;
    const dy = target.y - shown.y;
    if (glowArmed.current && dx * dx + dy * dy > 0.25) {
      frame.current = window.requestAnimationFrame(paintGlow);
    }
  }

  function trackPointer(event: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    glowTarget.current = { x, y };
    if (!glowArmed.current) {
      glowArmed.current = true;
      glowShown.current = { x, y };
      card.style.setProperty("--mouse-x", `${x.toFixed(1)}px`);
      card.style.setProperty("--mouse-y", `${y.toFixed(1)}px`);
      return;
    }
    if (!frame.current) frame.current = window.requestAnimationFrame(paintGlow);
  }

  function leavePointer() {
    glowArmed.current = false;
    window.cancelAnimationFrame(frame.current);
    frame.current = 0;
  }

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
      <div className="console-login__canvas" aria-hidden="true">
        {/* 三团大晕：位置固定，青 / 紫 / 蓝三色在三个位置上轮转互换 */}
        <span className="console-login__wash console-login__wash--bl">
          <i className="console-login__tone console-login__tone--teal" />
          <i className="console-login__tone console-login__tone--violet" />
          <i className="console-login__tone console-login__tone--blue" />
        </span>
        <span className="console-login__wash console-login__wash--right">
          <i className="console-login__tone console-login__tone--teal" />
          <i className="console-login__tone console-login__tone--violet" />
          <i className="console-login__tone console-login__tone--blue" />
        </span>
        <span className="console-login__wash console-login__wash--top">
          <i className="console-login__tone console-login__tone--teal" />
          <i className="console-login__tone console-login__tone--violet" />
          <i className="console-login__tone console-login__tone--blue" />
        </span>
        <span className="console-login__orb console-login__orb--a" />
        <span className="console-login__orb console-login__orb--b" />
      </div>
      <div className="console-login-card" ref={cardRef} onMouseMove={trackPointer} onMouseLeave={leavePointer}>
        {brand.logo_url ? (
          <img src={brand.logo_url} alt="" style={{ height: 40, width: "auto" }} />
        ) : (
          <img src={PRODUCT_LOGO} alt="" style={{ height: 40, width: 40, display: "block" }} />
        )}
        <Typography.Title level={3} className="console-login-title">
          <span className="console-login-title__text">{brand.site_name || PRODUCT_NAME}</span>
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
