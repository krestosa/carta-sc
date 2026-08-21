import { SYSTEM_LOGO_SIZE, SYSTEM_LOGO_STYLE_ID } from './system-logo-config.js';

const rule = (selector: string, declarations: readonly string[]): string =>
  `${selector}{${declarations.join(';')}}`;

const media = (query: string, rules: readonly string[]): string =>
  `@media(${query}){${rules.join('')}}`;

const styleElement = (rules: readonly string[]): string =>
  `<style id="${SYSTEM_LOGO_STYLE_ID}">\n${rules.join('\n')}\n</style>`;

const commonLogoDeclarations = [
  'display:block!important',
  'margin:0!important',
  'padding:0!important',
  'opacity:1!important',
  'visibility:visible!important',
  'object-fit:contain!important',
  'object-position:center center!important',
  'filter:invert(1)!important',
  'transform:none!important',
  'transition:filter var(--sc-motion-theme,560ms) cubic-bezier(.45,0,.55,1)!important',
] as const;

const darkLogoRule = rule(
  "html[data-sc-theme-resolved='dark'] body.sushiShop .sc-system-brand-logo",
  ['filter:none!important'],
);

function desktopHeaderRules(width: number): string[] {
  const height = SYSTEM_LOGO_SIZE.height;
  return [
    rule('body.sushiShop .newVer17topBar .bord-line', [
      'display:grid!important',
      `grid-template-columns:minmax(0,1fr) ${width}px minmax(0,1fr)!important`,
      'grid-template-rows:40px 55px!important',
      'align-items:center!important',
      'column-gap:clamp(12px,2vw,28px)!important',
      'width:100%!important',
      'min-width:0!important',
      'height:95px!important',
      'margin:0!important',
      'padding:0!important',
      'border:0!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.miniBotTop', [
      'display:flex!important',
      'grid-column:1!important',
      'grid-row:1!important',
      'align-items:center!important',
      'justify-content:flex-start!important',
      'gap:clamp(10px,1.25vw,22px)!important',
      'float:none!important',
      'width:auto!important',
      'min-width:0!important',
      'height:40px!important',
      'margin:0!important',
      'padding:0!important',
      'white-space:nowrap!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.miniBotTop>.top-reservas', [
      'float:none!important',
      'flex:0 1 auto!important',
      'width:auto!important',
      'height:40px!important',
      'margin:0!important',
      'padding:0!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.miniBotTop>.top-reservas span', [
      'display:block!important',
      'line-height:40px!important',
      'margin:0!important',
      'padding:0!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.miniBotTop>.top-reservas a', [
      'display:block!important',
      'margin:0!important',
      'padding:0!important',
      'border:0!important',
      'white-space:nowrap!important',
    ]),
    rule('body.sushiShop .newVer17topBar .brandCol:has(.sc-system-brand-logo)', [
      'display:flex!important',
      'position:static!important',
      'grid-column:2!important',
      'grid-row:2!important',
      'align-items:center!important',
      'justify-content:center!important',
      'justify-self:center!important',
      'align-self:center!important',
      `width:${width}px!important`,
      `max-width:${width}px!important`,
      'height:55px!important',
      'margin:0!important',
      'padding:0!important',
      'text-align:center!important',
      'pointer-events:none!important',
    ]),
    rule('body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)', [
      'box-sizing:border-box!important',
      'display:flex!important',
      'align-items:center!important',
      'justify-content:center!important',
      `width:${width}px!important`,
      `max-width:${width}px!important`,
      `height:${height}px!important`,
      `max-height:${height}px!important`,
      'margin:0!important',
      'padding:0!important',
      'line-height:0!important',
      'pointer-events:none!important',
    ]),
    rule('body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)>a', [
      'display:flex!important',
      'position:static!important',
      'align-items:center!important',
      'justify-content:center!important',
      `width:${width}px!important`,
      `max-width:${width}px!important`,
      `height:${height}px!important`,
      `max-height:${height}px!important`,
      'margin:0!important',
      'padding:0!important',
      'line-height:0!important',
      'transform:none!important',
      'pointer-events:auto!important',
    ]),
    rule('body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)>a>.sc-system-brand-logo', [
      `width:${width}px!important`,
      `max-width:${width}px!important`,
      `height:${height}px!important`,
      `max-height:${height}px!important`,
      'flex:0 0 auto!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.topRight', [
      'display:flex!important',
      'grid-column:3!important',
      'grid-row:1!important',
      'align-items:center!important',
      'justify-content:flex-end!important',
      'gap:clamp(8px,1vw,16px)!important',
      'float:none!important',
      'justify-self:stretch!important',
      'width:auto!important',
      'min-width:0!important',
      'height:40px!important',
      'margin:0!important',
      'padding:0!important',
      'text-align:right!important',
      'white-space:nowrap!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.topRight>.dropPais', [
      'float:none!important',
      'flex:0 1 auto!important',
      'width:auto!important',
      'margin:0!important',
      'padding:0!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.topRight .top-paises', [
      'display:flex!important',
      'align-items:center!important',
      'justify-content:flex-end!important',
      'gap:2px!important',
      'margin:0!important',
      'padding:0!important',
      'white-space:nowrap!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.topRight .top-paises span', [
      'display:block!important',
      'line-height:40px!important',
      'margin:0!important',
      'padding:0!important',
    ]),
    rule('body.sushiShop .newVer17topBar .bord-line>.topRight .top-paises a', [
      'margin:0!important',
      'padding:0!important',
      'white-space:nowrap!important',
    ]),
    rule('body.sushiShop .newVer17topBar .main-nav', [
      'display:block!important',
      'float:none!important',
      'width:100%!important',
      'height:40px!important',
      'margin:0!important',
      'padding:0!important',
    ]),
    rule('body.sushiShop .newVer17topBar .main-nav>.nav', [
      'box-sizing:border-box!important',
      'display:flex!important',
      'align-items:center!important',
      'justify-content:space-between!important',
      'gap:clamp(8px,1.15vw,20px)!important',
      'width:100%!important',
      'height:40px!important',
      'margin:0!important',
      'padding:0!important',
      'white-space:nowrap!important',
    ]),
    rule('body.sushiShop .newVer17topBar .main-nav>.nav>li', [
      'flex:0 1 auto!important',
      'min-width:0!important',
      'margin:0!important',
      'padding:0!important',
    ]),
    rule('body.sushiShop .newVer17topBar .main-nav>.nav>li>a', [
      'font-size:clamp(11px,1.05vw,14px)!important',
      'white-space:nowrap!important',
    ]),
  ];
}

export function createInitialSystemLogoCss(): string {
  const width = SYSTEM_LOGO_SIZE.width;
  const height = SYSTEM_LOGO_SIZE.height;
  const rules = [
    rule('body.sushiShop .sc-system-brand-logo', [
      ...commonLogoDeclarations.slice(0, 1),
      'flex:0 0 auto!important',
      `width:${width}px!important`,
      'max-width:100%!important',
      `height:${height}px!important`,
      `max-height:${height}px!important`,
      ...commonLogoDeclarations.slice(1),
    ]),
    darkLogoRule,
    media('min-width:993px', desktopHeaderRules(width)),
    media('max-width:992px', [
      rule('body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)', [
        'display:flex!important',
        'align-items:center!important',
        'justify-content:center!important',
      ]),
      rule('body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)>a', [
        'display:flex!important',
        'align-items:center!important',
        'justify-content:center!important',
        `width:${width}px!important`,
        'max-width:calc(100vw - 120px)!important',
        'height:var(--sc-mobile-header-height,100px)!important',
        'margin:0!important',
        'padding:0!important',
        'line-height:0!important',
      ]),
      rule('body.sushiShop .brandOnlyMobile .sc-system-brand-logo', [
        `width:${width}px!important`,
        'max-width:100%!important',
        'height:auto!important',
        `max-height:${height}px!important`,
        `aspect-ratio:${width}/${height}!important`,
      ]),
    ]),
  ];
  return styleElement(rules);
}

export function createCalibratedSystemLogoCss(mobileWidth: number, desktopWidth: number): string {
  const height = SYSTEM_LOGO_SIZE.height;
  const rules = [
    rule('body.sushiShop .sc-system-brand-logo', [
      ...commonLogoDeclarations.slice(0, 1),
      'width:auto!important',
      'height:auto!important',
      ...commonLogoDeclarations.slice(1),
    ]),
    darkLogoRule,
    media('min-width:993px', [
      rule('body.sushiShop .topBar.newVer17topBar', [
        'background-color:var(--sc-color-surface)!important',
        'color:var(--sc-color-ink)!important',
      ]),
      rule([
        'body.sushiShop .newVer17topBar span',
        'body.sushiShop .newVer17topBar a',
        'body.sushiShop .newVer17topBar .dropdown a',
        'body.sushiShop .newVer17topBar .top-reservas span a',
        'body.sushiShop .newVer17topBar .socialTop .fa',
      ].join(','), ['color:var(--sc-color-ink)!important']),
      rule([
        'body.sushiShop .newVer17topBar .brandCol',
        'body.sushiShop .newVer17topBar .main-nav',
        'body.sushiShop .newVer17topBar .nav',
      ].join(','), ['background-color:transparent!important']),
      ...desktopHeaderRules(desktopWidth),
      rule('body.sushiShop .newVer17topBar .sc-system-brand-logo', [
        `width:${desktopWidth}px!important`,
        `max-width:${desktopWidth}px!important`,
        `height:${height}px!important`,
        `max-height:${height}px!important`,
      ]),
    ]),
    media('max-width:992px', [
      rule('body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)', [
        'display:flex!important',
        'position:relative!important',
        'align-items:center!important',
        'justify-content:center!important',
        'height:var(--sc-mobile-header-height,100px)!important',
        'margin:0!important',
        'padding:0!important',
      ]),
      rule('body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)>a', [
        'display:flex!important',
        'position:static!important',
        'top:auto!important',
        'right:auto!important',
        'bottom:auto!important',
        'left:auto!important',
        'align-items:center!important',
        'justify-content:center!important',
        `width:${mobileWidth}px!important`,
        'max-width:calc(100vw - 96px)!important',
        'height:100%!important',
        'margin:0!important',
        'padding:0!important',
        'line-height:0!important',
        'transform:none!important',
      ]),
      rule('body.sushiShop .brandOnlyMobile .sc-system-brand-logo', [
        `width:${mobileWidth}px!important`,
        'max-width:100%!important',
        'height:auto!important',
        `max-height:${height}px!important`,
        `aspect-ratio:${SYSTEM_LOGO_SIZE.width}/${height}!important`,
      ]),
    ]),
  ];
  return styleElement(rules);
}
