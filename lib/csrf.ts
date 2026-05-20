// M-5 fix: Origin 헤더 기반 CSRF 방어 — 상태 변경 POST 엔드포인트에서 사용
// same-origin 요청이 아니면 false 반환 → 호출자에서 403 응답 처리
export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host   = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
