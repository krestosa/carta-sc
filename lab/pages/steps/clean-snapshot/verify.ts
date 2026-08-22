import { assert } from '../../lib/core.js';

export function verifySnapshotDimensions(html: string): void {
  const normalized = /<div\b(?=[^>]*\bclass=["'][^"']*\bnormCols\b[^"']*["'])[^>]*>/i.exec(html)?.[0];
  assert(normalized && !/\b(?:height|min-height)\s*:/i.test(normalized), 'Captured normCols height remains after snapshot cleanup');
  const banner = /<img\b(?=[^>]*\bclass=["'][^"']*\bimgBannerShop\b)[^>]*>/i.exec(html)?.[0];
  assert(
    banner && /\bwidth=["']1500["']/i.test(banner) && /\bheight=["']157["']/i.test(banner),
    'Banner intrinsic dimensions are missing after snapshot cleanup',
  );
  const tiktokImages = html.match(/<img\b(?=[^>]*icons8-tiktok-32\.png)[^>]*>/gi) ?? [];
  assert(
    tiktokImages.length > 0
      && tiktokImages.every((tag) => /\bwidth=["']22["']/i.test(tag) && /\bheight=["']22["']/i.test(tag)),
    'TikTok 22x22 intrinsic dimensions are missing after snapshot cleanup',
  );
}

export function verifySnapshotRuntime(html: string): void {
  assert(
    (html.match(/<script\b[^>]*\bsrc=["']js\/jquery-2\.1\.0\.min\.js["'][^>]*>\s*<\/script>/gi) ?? []).length === 1,
    'Pages artifact must retain exactly one explicit jQuery 2.1.0 script tag',
  );
  assert(!/https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=GTM-WQPLGX9/i.test(html), 'Captured GTM runtime tag remains after cleanup');
  assert(html.includes('GTM-WQPLGX9') && html.includes('googletagmanager.com/gtm.js?id='), 'Canonical GTM bootstrap snippet is missing after cleanup');
  assert(
    (html.match(/<script\b[^>]*\bsrc=["']https:\/\/www\.google\.com\/recaptcha\/api\.js["'][^>]*>\s*<\/script>/gi) ?? []).length === 1,
    'Official remote reCAPTCHA api.js script must remain exactly once',
  );
  assert(!html.includes('_external/www.google.com/recaptcha/api.js'), 'Broken local reCAPTCHA api.js reference remains after cleanup');
  assert(
    (html.match(/<div class="g-recaptcha"\s+data-sitekey="[^"]+">\s*<\/div>/gi) ?? []).length === 1,
    'Clean reCAPTCHA host with sitekey must remain exactly once',
  );
  for (const stale of ['recaptcha__en.js', '/recaptcha/api2/anchor?', '/recaptcha/api2/bframe?', 'g-recaptcha-bubble-arrow']) {
    assert(!html.includes(stale), `Captured reCAPTCHA runtime markup remains after cleanup: ${stale}`);
  }
}
