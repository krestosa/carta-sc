const DEFAULT_MODULE_VERSION = 'unversioned';

export function moduleAssetVersion(metaUrl: string): string {
  try {
    return new URL(metaUrl).searchParams.get('v') || DEFAULT_MODULE_VERSION;
  } catch {
    return DEFAULT_MODULE_VERSION;
  }
}
