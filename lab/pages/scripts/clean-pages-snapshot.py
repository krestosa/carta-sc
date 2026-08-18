#!/usr/bin/env python3
import os
import re
from pathlib import Path

SITE = Path('.pages-site')
SHA = os.environ.get('GITHUB_SHA', '')

if not re.fullmatch(r'[0-9a-f]{40}', SHA):
    raise SystemExit('GITHUB_SHA is missing or invalid')
if not SITE.is_dir():
    raise SystemExit('.pages-site does not exist')


def find_matching_div_close(html, open_start):
    tag_re = re.compile(r'<div\b[^>]*>|</div\s*>', re.IGNORECASE)
    depth = 0
    for match in tag_re.finditer(html, open_start):
        tag = match.group(0)
        if tag.lower().startswith('<div'):
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return match.start(), match.end()
    raise SystemExit('Could not find matching </div> in captured snapshot markup')


def empty_div_contents(html, opening_marker):
    start = html.find(opening_marker)
    if start < 0:
        raise SystemExit(f'Could not find snapshot div marker: {opening_marker}')
    open_end = html.find('>', start)
    if open_end < 0:
        raise SystemExit(f'Could not find end of opening div: {opening_marker}')
    close_start, _ = find_matching_div_close(html, start)
    return html[:open_end + 1] + html[close_start:]


def remove_div_block(html, opening_marker):
    start = html.find(opening_marker)
    if start < 0:
        raise SystemExit(f'Could not find snapshot div block marker: {opening_marker}')
    _, close_end = find_matching_div_close(html, start)
    return html[:start] + html[close_end:]


def add_aria_label(text, tag_name, lookahead, label):
    pattern = re.compile(
        rf'<{tag_name}\b(?=[^>]*{lookahead})[^>]*>',
        re.IGNORECASE,
    )
    changed = 0

    def replace(match):
        nonlocal changed
        tag = match.group(0)
        if re.search(r'\baria-label\s*=', tag, re.IGNORECASE):
            return tag
        changed += 1
        closing = '/>' if tag.endswith('/>') else '>'
        body = tag[:-len(closing)].rstrip()
        return f'{body} aria-label="{label}"{closing}'

    return pattern.sub(replace, text), changed


def strip_inline_properties_from_class(text, class_name, properties):
    tag_re = re.compile(
        rf'<div\b(?=[^>]*\bclass=["\'][^"\']*\b{re.escape(class_name)}\b[^"\']*["\'])[^>]*>',
        re.IGNORECASE,
    )
    changed = 0
    props = {name.lower() for name in properties}

    def replace(match):
        nonlocal changed
        tag = match.group(0)
        style = re.search(r'\s+style=["\'](?P<value>[^"\']*)["\']', tag, re.IGNORECASE)
        if not style:
            return tag
        kept = []
        removed = False
        for declaration in style.group('value').split(';'):
            declaration = declaration.strip()
            if not declaration:
                continue
            name = declaration.split(':', 1)[0].strip().lower() if ':' in declaration else ''
            if name in props:
                removed = True
                continue
            kept.append(declaration)
        if not removed:
            return tag
        changed += 1
        replacement = (' style="' + '; '.join(kept) + '"') if kept else ''
        return tag[:style.start()] + replacement + tag[style.end():]

    return tag_re.sub(replace, text), changed


def ensure_image_dimensions(text, lookahead, width, height):
    pattern = re.compile(rf'<img\b(?=[^>]*{lookahead})[^>]*>', re.IGNORECASE)
    changed = 0

    def replace(match):
        nonlocal changed
        tag = match.group(0)
        out = tag
        if not re.search(r'\bwidth\s*=', out, re.IGNORECASE):
            out = out[:-1].rstrip() + f' width="{width}">'
        if not re.search(r'\bheight\s*=', out, re.IGNORECASE):
            out = out[:-1].rstrip() + f' height="{height}">'
        if out != tag:
            changed += 1
        return out

    return pattern.sub(replace, text), changed


def force_image_dimensions(text, lookahead, width, height):
    pattern = re.compile(rf'<img\b(?=[^>]*{lookahead})[^>]*>', re.IGNORECASE)
    changed = 0

    def replace(match):
        nonlocal changed
        tag = match.group(0)
        out = re.sub(r'\s+width\s*=\s*["\'][^"\']*["\']', '', tag, flags=re.IGNORECASE)
        out = re.sub(r'\s+height\s*=\s*["\'][^"\']*["\']', '', out, flags=re.IGNORECASE)
        closing = '/>' if out.endswith('/>') else '>'
        body = out[:-len(closing)].rstrip()
        out = f'{body} width="{width}" height="{height}"{closing}'
        if out != tag:
            changed += 1
        return out

    return pattern.sub(replace, text), changed


def repair_category_anchor_ids(text):
    pattern = re.compile(
        r'<a\b(?=[^>]*\bname="(?P<name>anchor[^"]*)")[^>]*>',
        re.IGNORECASE,
    )
    repaired = 0

    def replace(match):
        nonlocal repaired
        tag = match.group(0)
        name = match.group('name')
        id_match = re.search(r'\bid="([^"]*)"', tag, re.IGNORECASE)
        current_id = id_match.group(1) if id_match else None
        if current_id == name:
            return tag
        repaired += 1
        if id_match:
            return tag[:id_match.start()] + f'id="{name}"' + tag[id_match.end():]
        return tag[:-1].rstrip() + f' id="{name}">'

    return pattern.sub(replace, text), repaired


index_path = SITE / 'index.html'
html = index_path.read_text(encoding='utf-8')

# Normaliza la semántica estática tanto en el artefacto como en runtime. También repara
# mojibake/caracteres de reemplazo capturados en IDs de categorías derivando cada ID
# desde el atributo name que se conserva intacto.
html, repaired_anchor_count = repair_category_anchor_ids(html)
html, normalized_cols_count = strip_inline_properties_from_class(html, 'normCols', {'height', 'min-height'})
html, banner_dimension_count = ensure_image_dimensions(html, r'\bclass=["\'][^"\']*\bimgBannerShop\b', 1500, 157)
html, tiktok_dimension_count = force_image_dimensions(html, r'\bsrc=["\'][^"\']*icons8-tiktok-32\.png[^"\']*["\']', 22, 22)
norm_cols_tag = re.search(r'<div\b(?=[^>]*\bclass=["\'][^"\']*\bnormCols\b[^"\']*["\'])[^>]*>', html, re.IGNORECASE)
if not norm_cols_tag or re.search(r'\b(?:height|min-height)\s*:', norm_cols_tag.group(0), re.IGNORECASE):
    raise SystemExit('Captured normCols height remains after snapshot cleanup')
banner_tag = re.search(r'<img\b(?=[^>]*\bclass=["\'][^"\']*\bimgBannerShop\b)[^>]*>', html, re.IGNORECASE)
if not banner_tag or not re.search(r'\bwidth=["\']1500["\']', banner_tag.group(0), re.IGNORECASE) or not re.search(r'\bheight=["\']157["\']', banner_tag.group(0), re.IGNORECASE):
    raise SystemExit('Banner intrinsic dimensions are missing after snapshot cleanup')
tiktok_tags = re.findall(r'<img\b(?=[^>]*icons8-tiktok-32\.png)[^>]*>', html, re.IGNORECASE)
if not tiktok_tags or any(not re.search(r'\bwidth=["\']22["\']', tag, re.IGNORECASE) or not re.search(r'\bheight=["\']22["\']', tag, re.IGNORECASE) for tag in tiktok_tags):
    raise SystemExit('TikTok 22x22 intrinsic dimensions are missing after snapshot cleanup')
aria_repairs = 0
for tag_name, lookahead, label in (
    ('select', r'\bname=["\']sucursalNews["\']', 'Espacio preferido'),
    ('input', r'\bclass=["\'][^"\']*\bnewsMail\b[^"\']*["\']', 'Email para newsletter'),
    ('button', r'\bclass=["\'][^"\']*\bclose\b[^"\']*["\']', 'Cerrar'),
    ('a', r'\bclass=["\'][^"\']*\bshopMenuRightIcon\b[^"\']*["\']', 'Ver carrito'),
    ('a', r'\bhref=["\']https://www\.sushiclub\.com\.ar/pedidosonline["\']', 'Pedidos online de SushiClub'),
    ('a', r'\bhref=["\'][^"\']*facebook\.com/sushiclubargentina[^"\']*["\']', 'Facebook de SushiClub'),
    ('a', r'\bhref=["\'][^"\']*instagram\.com/SushiClub_ar[^"\']*["\']', 'Instagram de SushiClub'),
    ('a', r'\bhref=["\'][^"\']*tiktok\.com/@sushiclub_ar[^"\']*["\']', 'TikTok de SushiClub'),
    ('a', r'\bhref=["\'][^"\']*pinterest\.com/sushiclub[^"\']*["\']', 'Pinterest de SushiClub'),
):
    html, count = add_aria_label(html, tag_name, lookahead, label)
    aria_repairs += count

if '\ufffd' in html:
    raise SystemExit('Unicode replacement character remains in the cleaned Pages snapshot')

jquery_fallback = re.compile(
    r'<script>\s*window\.jQuery\s*\|\|\s*document\.write\(.*?jquery-2\.1\.0\.min\.js.*?\)\s*</script>',
    re.IGNORECASE | re.DOTALL,
)
html, jquery_fallback_count = jquery_fallback.subn('', html, count=1)
if jquery_fallback_count != 1:
    raise SystemExit(f'Expected one redundant jQuery document.write fallback, found {jquery_fallback_count}')

captured_gtm = re.compile(
    r'<script\b[^>]*\bsrc=["\']https://www\.googletagmanager\.com/gtm\.js\?id=GTM-WQPLGX9["\'][^>]*>\s*</script>',
    re.IGNORECASE,
)
html, captured_gtm_count = captured_gtm.subn('', html, count=1)
if captured_gtm_count != 1:
    raise SystemExit(f'Expected one captured GTM runtime tag, found {captured_gtm_count}')

captured_recaptcha_runtime = re.compile(
    r'<script\b[^>]*\bsrc=["\']https://www\.gstatic\.com/recaptcha/releases/[^"\']+/recaptcha__en\.js["\'][^>]*>\s*</script>',
    re.IGNORECASE,
)
html, recaptcha_runtime_count = captured_recaptcha_runtime.subn('', html, count=1)
if recaptcha_runtime_count != 1:
    raise SystemExit(f'Expected one captured reCAPTCHA runtime tag, found {recaptcha_runtime_count}')

html = empty_div_contents(html, '<div class="g-recaptcha" data-sitekey=')
html = remove_div_block(html, '<div style="background-color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 3px;')

local_recaptcha_api = re.compile(
    r'<script\b[^>]*\bsrc=["\']_external/www\.google\.com/recaptcha/api\.js["\'][^>]*>\s*</script>',
    re.IGNORECASE,
)
remote_recaptcha_tag = '<script src="https://www.google.com/recaptcha/api.js" async defer></script>'
html, local_recaptcha_count = local_recaptcha_api.subn(remote_recaptcha_tag, html, count=1)
if local_recaptcha_count != 1:
    raise SystemExit(f'Expected one local captured reCAPTCHA api.js reference, found {local_recaptcha_count}')

jquery_tag = re.compile(
    r'<script\b[^>]*\bsrc=["\']js/jquery-2\.1\.0\.min\.js["\'][^>]*>\s*</script>',
    re.IGNORECASE,
)
remote_recaptcha_api = re.compile(
    r'<script\b[^>]*\bsrc=["\']https://www\.google\.com/recaptcha/api\.js["\'][^>]*>\s*</script>',
    re.IGNORECASE,
)

if len(jquery_tag.findall(html)) != 1:
    raise SystemExit('Pages artifact must retain exactly one explicit jQuery 2.1.0 script tag')
if captured_gtm.search(html):
    raise SystemExit('Captured GTM runtime tag remains after cleanup')
if 'GTM-WQPLGX9' not in html or 'googletagmanager.com/gtm.js?id=' not in html:
    raise SystemExit('Canonical GTM bootstrap snippet is missing after cleanup')
if len(remote_recaptcha_api.findall(html)) != 1:
    raise SystemExit('Official remote reCAPTCHA api.js script must remain exactly once')
if '_external/www.google.com/recaptcha/api.js' in html:
    raise SystemExit('Broken local reCAPTCHA api.js reference remains after cleanup')
if len(re.findall(r'<div class="g-recaptcha"\s+data-sitekey="[^"]+">\s*</div>', html, re.IGNORECASE)) != 1:
    raise SystemExit('Clean reCAPTCHA host with sitekey must remain exactly once')
for stale in ('recaptcha__en.js', '/recaptcha/api2/anchor?', '/recaptcha/api2/bframe?', 'g-recaptcha-bubble-arrow'):
    if stale in html:
        raise SystemExit(f'Captured reCAPTCHA runtime markup remains after cleanup: {stale}')

if '\ufffd' in html:
    raise SystemExit('Unicode replacement character remains in Pages snapshot')

index_path.write_text(html, encoding='utf-8')
print(f'Removed duplicate snapshot runtime state, normalized {normalized_cols_count} catalog height(s), repaired {banner_dimension_count + tiktok_dimension_count} intrinsic media dimension set(s), repaired {repaired_anchor_count} category anchor id(s), added {aria_repairs} accessibility label(s), and repaired the reCAPTCHA API source')
