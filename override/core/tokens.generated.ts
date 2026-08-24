/* GENERATED from tokens/design.tokens.json. Do not edit manually. */
export const tokenMedia = Object.freeze({
  phone: '(max-width: 640px)',
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 992px)',
  compact: '(max-width: 992px)',
  compactWide: '(min-width: 641px) and (max-width: 992px)',
  desktop: '(min-width: 993px)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  moreContrast: '(prefers-contrast: more)',
  forcedColors: '(forced-colors: active)',
} as const);

export const systemTokens = Object.freeze({
  "color": {
    "light": {
      "ink": "rgb(10 10 10)",
      "heading": "rgb(48 48 48)",
      "copy": "rgb(95 95 95)",
      "muted": "rgb(118 118 118)",
      "trait": "rgb(152 152 152)",
      "surface": "rgb(245 245 245)",
      "surfaceTransparent": "rgb(245 245 245 / 0)",
      "surfaceRaised": "rgb(251 251 250)",
      "border": "rgb(227 227 222)",
      "borderStrong": "rgb(209 209 203)",
      "focusRing": "rgb(10 10 10)"
    },
    "dark": {
      "ink": "rgb(243 243 240)",
      "heading": "rgb(255 255 255)",
      "copy": "rgb(200 200 194)",
      "muted": "rgb(156 156 149)",
      "trait": "rgb(111 111 111)",
      "surface": "rgb(0 0 0)",
      "surfaceTransparent": "rgb(0 0 0 / 0)",
      "surfaceRaised": "rgb(10 10 10)",
      "border": "rgb(45 45 41)",
      "borderStrong": "rgb(68 68 62)",
      "focusRing": "rgb(243 243 240)"
    },
    "scrim": "rgb(0 0 0 / 0.32)"
  },
  "typography": {
    "heading1Desktop": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "28px",
      "fontWeight": 600,
      "lineHeight": 1.08,
      "letterSpacing": "-1.12px"
    },
    "heading1Tablet": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "22px",
      "fontWeight": 600,
      "lineHeight": 1.08,
      "letterSpacing": "-0.704px"
    },
    "heading1Mobile": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "20px",
      "fontWeight": 600,
      "lineHeight": 1.08,
      "letterSpacing": "-0.64px"
    },
    "heading2": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "20px",
      "fontWeight": 600,
      "lineHeight": 1.2,
      "letterSpacing": "-0.5px"
    },
    "heading3Desktop": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "18.5px",
      "fontWeight": 600,
      "lineHeight": 1.15,
      "letterSpacing": "-0.4625px"
    },
    "heading3Tablet": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "16px",
      "fontWeight": 600,
      "lineHeight": 1.16,
      "letterSpacing": "-0.288px"
    },
    "heading3Mobile": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "15.5px",
      "fontWeight": 600,
      "lineHeight": 1.16,
      "letterSpacing": "-0.279px"
    },
    "heading4": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "15.5px",
      "fontWeight": 600,
      "lineHeight": 1.26,
      "letterSpacing": "-0.2325px"
    },
    "bodyLarge": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "15px",
      "fontWeight": 400,
      "lineHeight": 1.3333333333,
      "letterSpacing": "0px"
    },
    "body": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "13.5px",
      "fontWeight": 400,
      "lineHeight": 1.52,
      "letterSpacing": "0px"
    },
    "bodySmall": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "12.5px",
      "fontWeight": 400,
      "lineHeight": 1.28,
      "letterSpacing": "0px"
    },
    "label": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "12px",
      "fontWeight": 400,
      "lineHeight": 1.2,
      "letterSpacing": "-0.06px"
    },
    "labelStrong": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "14px",
      "fontWeight": 600,
      "lineHeight": 1.2,
      "letterSpacing": "0px"
    },
    "price": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "15.5px",
      "fontWeight": 600,
      "lineHeight": 1.1612903226,
      "letterSpacing": "-0.279px"
    },
    "priceLarge": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "17px",
      "fontWeight": 600,
      "lineHeight": 1.2,
      "letterSpacing": "0px"
    }
  },
  "shape": {
    "none": "0px",
    "extraSmall": "1px",
    "menu": "2px",
    "control": "4px",
    "card": "16px",
    "dialog": "28px",
    "button": "9999px",
    "full": "9999px"
  },
  "spacing": {
    "extraSmall": "4px",
    "small": "8px",
    "medium": "12px",
    "large": "16px",
    "extraLarge": "24px",
    "doubleExtraLarge": "32px",
    "tripleExtraLarge": "48px",
    "quadExtraLarge": "64px"
  },
  "state": {
    "opacity": {
      "disabled": 0.38,
      "muted": 0.78,
      "placeholder": 0.88
    }
  },
  "layer": {
    "raised": 1,
    "sticky": 120,
    "popover": 120,
    "mobileMenu": 1000,
    "mobilePanel": 1001,
    "modal": 9000
  },
  "media": {
    "productAspectRatio": 1.43
  },
  "motion": {
    "durationMs": {
      "short1": 50,
      "short2": 100,
      "short3": 150,
      "short4": 200,
      "medium1": 250,
      "medium2": 300,
      "medium3": 350,
      "medium4": 400,
      "long1": 450,
      "long2": 500,
      "long3": 550,
      "long4": 600,
      "extraLong1": 700,
      "extraLong2": 800,
      "extraLong3": 900,
      "extraLong4": 1000
    },
    "durations": {
      "short1": 0.05,
      "short2": 0.1,
      "short3": 0.15,
      "short4": 0.2,
      "medium1": 0.25,
      "medium2": 0.3,
      "medium3": 0.35,
      "medium4": 0.4,
      "long1": 0.45,
      "long2": 0.5,
      "long3": 0.55,
      "long4": 0.6,
      "extraLong1": 0.7,
      "extraLong2": 0.8,
      "extraLong3": 0.9,
      "extraLong4": 1
    },
    "curves": {
      "standard": [
        0.2,
        0,
        0,
        1
      ],
      "accelerate": [
        0.3,
        0,
        1,
        1
      ],
      "decelerate": [
        0,
        0,
        0,
        1
      ],
      "linear": [
        0,
        0,
        1,
        1
      ]
    },
    "cssEasings": {
      "standard": "cubic-bezier(0.2, 0, 0, 1)",
      "accelerate": "cubic-bezier(0.3, 0, 1, 1)",
      "decelerate": "cubic-bezier(0, 0, 0, 1)",
      "linear": "cubic-bezier(0, 0, 1, 1)"
    },
    "transitions": {
      "fast": "150ms cubic-bezier(0, 0, 0, 1) 0ms",
      "standard": "150ms cubic-bezier(0.2, 0, 0, 1) 0ms",
      "icon": "200ms cubic-bezier(0, 0, 0, 1) 0ms",
      "theme": "550ms cubic-bezier(0.2, 0, 0, 1) 0ms"
    },
    "springs": {
      "spatial": {
        "fast": {
          "stiffness": 1400,
          "damping": 0.9
        },
        "default": {
          "stiffness": 700,
          "damping": 0.9
        },
        "slow": {
          "stiffness": 300,
          "damping": 0.9
        }
      },
      "effects": {
        "fast": {
          "stiffness": 3800,
          "damping": 1
        },
        "default": {
          "stiffness": 1600,
          "damping": 1
        },
        "slow": {
          "stiffness": 800,
          "damping": 1
        }
      },
      "indicator": {
        "soft": {
          "stiffness": 500,
          "damping": 1
        },
        "firm": {
          "stiffness": 1000,
          "damping": 1
        }
      },
      "focus": {
        "stiffness": 1500,
        "damping": 1
      }
    }
  }
} as const);
