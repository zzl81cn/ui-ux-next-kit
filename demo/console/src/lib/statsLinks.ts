/** 数据统计页各块的去向。演示里只有这几页：工作队列 / 高级任务 / 执行记录是执行记录页的三个页签。 */
export const QUEUE_PATH = "/jobs?record=regular";
export const QUEUE_FAILED_PATH = "/jobs?record=regular&result=failed";
export const RECORDS_PATH = "/jobs?record=api";
export const RECORDS_RUNNING_PATH = "/jobs?record=api&result=running";
export const ADVANCED_PATH = "/jobs?record=advanced";
export const WORKERS_PATH = "/workers";
export const AUDIT_LOG_PATH = "/logs/system";

export function batchPath(id: number) {
  return `/jobs?record=advanced&batch=${id}`;
}

export function queuePath(name: string, failedOnly = false) {
  return `/jobs?record=regular&queue=${encodeURIComponent(name)}${failedOnly ? "&result=failed" : ""}`;
}
