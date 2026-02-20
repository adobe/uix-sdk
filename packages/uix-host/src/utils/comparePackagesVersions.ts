export function compareVersions(v1: string, v2: string): number {
  const versionToArray = (v: string) => v.split(".").map((x) => Number(x) || 0);
  const v1Array = versionToArray(v1);
  const v2Array = versionToArray(v2);
  const len = Math.max(v1Array.length, v2Array.length);

  for (let i = 0; i < len; i++) {
    const n1 = v1Array[i] ?? 0;
    const n2 = v2Array[i] ?? 0;

    if (n1 > n2) {
      return 1;
    }

    if (n1 < n2) {
      return -1;
    }
  }

  return 0;
}
