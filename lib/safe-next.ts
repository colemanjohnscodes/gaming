const SAFE_NEXT = /^\/(?!\/)[A-Za-z0-9/_-]*$/;

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !SAFE_NEXT.test(value)) {
    return "/";
  }
  return value;
}
