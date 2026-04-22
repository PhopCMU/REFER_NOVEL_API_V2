export interface RequestInfo {
  ip: string;
  method: string;
  url: string;
  userAgent?: string;
  datetime: string;
}

export function getRequestInfo(request: Request): RequestInfo {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  const datetime = new Date().toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour12: false,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    numberingSystem: "latn",
  });

  return {
    ip,
    method: request.method ?? "N/A",
    url: request.url ?? "N/A",
    userAgent: request.headers.get("user-agent") ?? undefined,
    datetime,
  };
}
