#!/usr/bin/env python3
from pathlib import Path
import shutil

SITE = Path('.pages-site')
LAB_PREPAINT = Path('lab/pages/assets/prepaint.css')
TARGET_PREPAINT = SITE / 'override/core/prepaint.css'
MAIN_CSS = SITE / 'override/main.css'
IMPORT_LINE = '@import "./core/prepaint.css?v=unversioned";\n'
ANCHOR = '@import "./components/category-nav/controls.css?v=unversioned";\n'

if not SITE.is_dir() or not MAIN_CSS.is_file() or not LAB_PREPAINT.is_file():
    raise SystemExit('lab Pages staging context is incomplete')

TARGET_PREPAINT.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(LAB_PREPAINT, TARGET_PREPAINT)

manifest = MAIN_CSS.read_text(encoding='utf-8')
if IMPORT_LINE in manifest:
    raise SystemExit('lab prepaint import already present in staged override manifest')
if ANCHOR not in manifest:
    raise SystemExit('category controls import anchor missing from staged override manifest')
manifest = manifest.replace(ANCHOR, ANCHOR + IMPORT_LINE, 1)
MAIN_CSS.write_text(manifest, encoding='utf-8')

print('Applied lab-only first-paint CSS to .pages-site staging copy.')
