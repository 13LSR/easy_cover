export const umamiConfig = {
  url: 'https://umami.331106.xyz',
  websiteId: '634bd59c-3aa3-4b9d-8553-94cff6f4cf0e',
  shareId: 'K5HSk1yHLiVYqoAa',
  domains: 'fm.331106.xyz',
} as const;

export interface SiteStats {
  pageviews: number;
  visitors: number;
}

// Share tokens stay in memory and are never stored in the browser or source code.
export async function fetchSiteStats(signal: AbortSignal): Promise<SiteStats> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const shareResponse = await fetch(
      `${umamiConfig.url}/api/share/${encodeURIComponent(umamiConfig.shareId)}`,
      { signal, credentials: 'omit', cache: 'no-store' },
    );
    if (!shareResponse.ok) throw new Error(`Umami share HTTP ${shareResponse.status}`);

    const share = await shareResponse.json();
    if (share.websiteId !== umamiConfig.websiteId || typeof share.token !== 'string' || !share.token) {
      throw new Error('Umami share does not match this website');
    }

    const params = new URLSearchParams({
      startAt: '0',
      endAt: String(Date.now()),
      timezone: 'Asia/Shanghai',
    });
    const statsResponse = await fetch(
      `${umamiConfig.url}/api/websites/${umamiConfig.websiteId}/stats?${params}`,
      {
        signal,
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'x-umami-share-token': share.token },
      },
    );
    // Renew an expired share token once; other failures remain visible to the user.
    if (statsResponse.status === 401 && attempt === 0) continue;
    if (!statsResponse.ok) throw new Error(`Umami stats HTTP ${statsResponse.status}`);

    const stats = await statsResponse.json();
    if (
      !Number.isFinite(stats.pageviews) || stats.pageviews < 0 ||
      !Number.isFinite(stats.visitors) || stats.visitors < 0
    ) {
      throw new Error('Umami stats response has invalid counts');
    }
    return { pageviews: stats.pageviews, visitors: stats.visitors };
  }
  throw new Error('Umami share authorization failed');
}
