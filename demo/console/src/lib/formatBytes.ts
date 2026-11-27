/** 字节数怎么写：1024 进制，满 1024 升一档，B / KB / MB / GB / TB，最高 TB。B 取整，KB 和 MB 留 1 位，GB 和 TB 留 2 位。进位边界要处理（1048575 B 写「1.0 MB」）。不是有限数写「-」。 */
const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const DIGITS = [0, 1, 1, 2, 2];

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "-";
  let index = 0;
  let size = value;
  while (index < UNITS.length - 1 && size >= 1024) {
    size /= 1024;
    index += 1;
  }
  // 舍入后碰到 1024（如 1023.96 KB → 1024.0）要进位
  while (index < UNITS.length - 1 && Number(size.toFixed(DIGITS[index])) >= 1024) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(DIGITS[index])} ${UNITS[index]}`;
}
