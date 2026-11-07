'use client';

import { useEffect, useState } from 'react';
import { fetchSiteStats, type SiteStats as Stats, umamiConfig } from '@/lib/umami';

const formatNumber = new Intl.NumberFormat('zh-CN');

export default function SiteStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    fetchSiteStats(controller.signal)
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <section aria-labelledby="site-stats-title" className="space-y-3">
      <div className="ef-eyebrow">{'// 05 / SITE VISITS'}</div>
      <h3 id="site-stats-title" className="text-base font-bold">访问统计</h3>
      <div role="status" aria-live="polite">
        {failed ? (
          <p className="text-xs leading-5 text-muted-foreground">统计暂时不可用，请稍后重试。</p>
        ) : stats ? (
          <dl className="grid grid-cols-2 gap-4 border-y border-border py-3">
            <div>
              <dt className="text-xs text-muted-foreground">浏览量</dt>
              <dd className="mt-1 break-all text-2xl font-bold tabular-nums">{formatNumber.format(stats.pageviews)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">访客数</dt>
              <dd className="mt-1 break-all text-2xl font-bold tabular-nums">{formatNumber.format(stats.visitors)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">统计加载中…</p>
        )}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        使用自建 Umami 统计网站访问，不采集封面文字、图片或字体内容。
      </p>
      <a
        href={`${umamiConfig.url}/share/${umamiConfig.shareId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center text-xs underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        查看统计详情
      </a>
    </section>
  );
}
