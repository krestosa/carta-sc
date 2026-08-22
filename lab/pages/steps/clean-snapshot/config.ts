export interface MutationResult {
  readonly html: string;
  readonly count: number;
}

export interface AriaRule {
  readonly tag: string;
  readonly lookahead: string;
  readonly label: string;
}

export const NORMALIZED_HEIGHT_PROPERTIES = new Set(['height', 'min-height']);
export const ARIA_RULES: readonly AriaRule[] = [
  { tag: 'select', lookahead: '\\bname=["\']sucursalNews["\']', label: 'Espacio preferido' },
  { tag: 'input', lookahead: '\\bclass=["\'][^"\']*\\bnewsMail\\b[^"\']*["\']', label: 'Email para newsletter' },
  { tag: 'button', lookahead: '\\bclass=["\'][^"\']*\\bclose\\b[^"\']*["\']', label: 'Cerrar' },
  { tag: 'a', lookahead: '\\bclass=["\'][^"\']*\\bshopMenuRightIcon\\b[^"\']*["\']', label: 'Ver carrito' },
  { tag: 'a', lookahead: '\\bhref=["\']https://www\\.sushiclub\\.com\\.ar/pedidosonline["\']', label: 'Pedidos online de SushiClub' },
  { tag: 'a', lookahead: '\\bhref=["\'][^"\']*facebook\\.com/sushiclubargentina[^"\']*["\']', label: 'Facebook de SushiClub' },
  { tag: 'a', lookahead: '\\bhref=["\'][^"\']*instagram\\.com/SushiClub_ar[^"\']*["\']', label: 'Instagram de SushiClub' },
  { tag: 'a', lookahead: '\\bhref=["\'][^"\']*tiktok\\.com/@sushiclub_ar[^"\']*["\']', label: 'TikTok de SushiClub' },
  { tag: 'a', lookahead: '\\bhref=["\'][^"\']*pinterest\\.com/sushiclub[^"\']*["\']', label: 'Pinterest de SushiClub' },
];
