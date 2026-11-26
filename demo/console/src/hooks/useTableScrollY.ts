import { useLayoutEffect, useRef, useState } from "react";

const BOTTOM = 24;
const PAGINATION = 42;

export function useTableScrollY() {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(320);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const top = root.getBoundingClientRect().top;
      const filter = root.querySelector(".dash-filter")?.getBoundingClientRect().height ?? 0;
      // 下钻提示条在筛选卡上面，同样占一截高度，加上它和下面一张卡的 16px 间距
      const drill = root.querySelector(".console-drill")?.getBoundingClientRect().height;
      const next = Math.max(230, window.innerHeight - top - filter - (drill ? drill + 16 : 0) - PAGINATION - BOTTOM - 16);
      setScrollY(next);
      const body = root.querySelector<HTMLElement>(".ant-table-body");
      const gutter = body ? Math.max(0, body.offsetWidth - body.clientWidth) : 0;
      root.style.setProperty("--console-table-gutter", `${gutter}px`);
      if (body) observer.observe(body);
    };
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return { ref, scrollY };
}
