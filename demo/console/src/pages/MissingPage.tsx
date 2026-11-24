import { Link } from "react-router-dom";

export function MissingPage() {
  return (
    <div className="console-missing">
      <p>这个地址没有对应页面</p>
      <Link to="/stats">回数据统计</Link>
    </div>
  );
}
