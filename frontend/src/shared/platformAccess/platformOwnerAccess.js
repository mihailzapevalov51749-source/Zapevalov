export function isPlatformOwner(user) {
  return Boolean(user?.is_platform_owner ?? user?.isPlatformOwner);
}
