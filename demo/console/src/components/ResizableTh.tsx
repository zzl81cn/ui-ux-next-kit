import type { MouseEvent as ReactMouseEvent, ThHTMLAttributes } from "react";

/** 拖拽时列宽的下限。宽度只留在当次打开里，刷新恢复默认。 */
export const MIN_COL_W = 80;

/** 表头单元格：右缘有一条能拉的手柄。公共表（执行记录、日志…）都用这一个。 */
export function ResizableTh({
  resizeWidth,
  onResizeWidth,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & {
  resizeWidth?: number;
  onResizeWidth?: (width: number) => void;
}) {
  if (!onResizeWidth || resizeWidth == null) return <th {...rest}>{children}</th>;
  const onMouseDown = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startW = resizeWidth;
    const move = (ev: MouseEvent) => onResizeWidth(Math.max(MIN_COL_W, startW + ev.clientX - startX));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  return (
    <th {...rest}>
      {children}
      <span className="console-col-resizer" onMouseDown={onMouseDown} onClick={(event) => event.stopPropagation()} />
    </th>
  );
}
