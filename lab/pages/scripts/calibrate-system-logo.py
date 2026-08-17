#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
STATE = SITE / '.system-logo-optics.json'
MOBILE_RASTER = SITE / '_critical-media/mobile-logo.webp'
DESKTOP_RASTER = SITE / '_chrome-media/desktop-logo.webp'


def visible_bbox(path):
    with Image.open(path) as source:
        source.load()
        rgba = source.convert('RGBA')
        w, h = rgba.size
        alpha = rgba.getchannel('A')
        bbox = alpha.point(lambda p: 255 if p > 8 else 0).getbbox()
        if bbox and bbox != (0, 0, w, h):
            return (w, h), bbox
        corner = rgba.getpixel((0, 0))
        bg = Image.new('RGBA', rgba.size, corner)
        diff = ImageChops.difference(rgba, bg).convert('L')
        bbox = diff.point(lambda p: 255 if p > 10 else 0).getbbox()
        return (w, h), (bbox or (0, 0, w, h))


def measure():
    if not MOBILE_RASTER.is_file() or not DESKTOP_RASTER.is_file():
        raise SystemExit('system-logo optical calibration inputs are missing')
    mobile_size, mobile_bbox = visible_bbox(MOBILE_RASTER)
    desktop_size, desktop_bbox = visible_bbox(DESKTOP_RASTER)

    mobile_visible = mobile_bbox[2] - mobile_bbox[0]
    mobile_width = round(333 * mobile_visible / mobile_size[0])
    if not 72 <= mobile_width <= 240:
        raise SystemExit(
            f'unexpected mobile logo optical width {mobile_width}px from '
            f'source={mobile_size} bbox={mobile_bbox}'
        )

    # Desktop source is rendered at its intrinsic 250px canvas. The SVG has a
    # tight viewBox, so preserve the raster's visible wordmark width instead of
    # the obsolete 75px wrapper constraint.
    desktop_width = desktop_bbox[2] - desktop_bbox[0]
    if not 160 <= desktop_width <= 280:
        raise SystemExit(
            f'unexpected desktop logo optical width {desktop_width}px from '
            f'source={desktop_size} bbox={desktop_bbox}'
        )

    state = {
        'mobile_source': mobile_size,
        'mobile_bbox': mobile_bbox,
        'mobile_width': mobile_width,
        'desktop_source': desktop_size,
        'desktop_bbox': desktop_bbox,
        'desktop_width': desktop_width,
    }
    STATE.write_text(json.dumps(state, separators=(',', ':')), encoding='utf-8')
    print(
        'System logo optics measured: '
        f'mobile source={mobile_size} bbox={mobile_bbox} -> {mobile_width}px; '
        f'desktop source={desktop_size} bbox={desktop_bbox} -> {desktop_width}px.'
    )


def apply():
    if not INDEX.is_file() or not STATE.is_file():
        raise SystemExit('system-logo optical calibration state is missing')
    state = json.loads(STATE.read_text(encoding='utf-8'))
    mw = int(state['mobile_width'])
    dw = int(state['desktop_width'])
    html = INDEX.read_text(encoding='utf-8')
    start = html.find('<style id="sc-system-brand-css">')
    if start < 0:
        raise SystemExit('system logo critical CSS was not generated')
    end = html.find('</style>', start)
    if end < 0:
        raise SystemExit('system logo critical CSS closing tag is missing')
    end += len('</style>')

    css = f'''<style id="sc-system-brand-css">
body.sushiShop .sc-system-brand-logo{{display:block!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;opacity:1!important;visibility:visible!important;object-fit:contain!important;object-position:center center!important;filter:invert(1)!important;transform:none!important;transition:filter var(--sc-motion-theme,560ms) cubic-bezier(.45,0,.55,1)!important}}
html[data-sc-theme-resolved='dark'] body.sushiShop .sc-system-brand-logo{{filter:none!important}}
@media(min-width:993px){{body.sushiShop .topBar.newVer17topBar{{background-color:var(--sc-color-surface)!important;color:var(--sc-color-ink)!important}}body.sushiShop .newVer17topBar span,body.sushiShop .newVer17topBar a,body.sushiShop .newVer17topBar .dropdown a,body.sushiShop .newVer17topBar .top-reservas span a,body.sushiShop .newVer17topBar .socialTop .fa{{color:var(--sc-color-ink)!important}}body.sushiShop .newVer17topBar .brandCol,body.sushiShop .newVer17topBar .main-nav,body.sushiShop .newVer17topBar .nav{{background-color:transparent!important}}body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo){{box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:{dw}px!important;max-width:{dw}px!important;height:55px!important;max-height:55px!important;margin:0 auto!important;padding:0!important;line-height:0!important;vertical-align:top!important}}body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)>a{{display:flex!important;position:static!important;top:auto!important;left:auto!important;align-items:center!important;justify-content:center!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;line-height:0!important;transform:none!important}}body.sushiShop .newVer17topBar .sc-system-brand-logo{{width:{dw}px!important;max-width:{dw}px!important;height:auto!important;max-height:45px!important}}}}
@media(max-width:992px){{body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo){{display:flex!important;position:relative!important;align-items:center!important;justify-content:center!important;height:var(--sc-mobile-header-height,100px)!important;margin:0!important;padding:0!important}}body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)>a{{display:flex!important;position:static!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;align-items:center!important;justify-content:center!important;width:{mw}px!important;max-width:calc(100vw - 96px)!important;height:100%!important;margin:0!important;padding:0!important;line-height:0!important;transform:none!important}}body.sushiShop .brandOnlyMobile .sc-system-brand-logo{{width:{mw}px!important;max-width:100%!important;height:auto!important;max-height:45px!important;aspect-ratio:312/45!important}}}}
</style>'''
    html = html[:start] + css + html[end:]
    INDEX.write_text(html, encoding='utf-8')
    STATE.unlink()
    print(
        f'System logo optical size applied: desktop={dw}px mobile={mw}px; '
        'centered on both axes; desktop nav bound to theme surface/ink.'
    )


if len(sys.argv) != 2 or sys.argv[1] not in {'measure', 'apply'}:
    raise SystemExit('usage: calibrate-system-logo.py measure|apply')
(measure if sys.argv[1] == 'measure' else apply)()
