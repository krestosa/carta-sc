/* GENERADO desde tokens/design.tokens.json. No editar manualmente. */
export const tokenMedia = Object.freeze({
  layoutNarrow: '(max-width: 640px)',
  layoutCompact: '(max-width: 767px)',
  layoutMedium: '(min-width: 768px) and (max-width: 992px)',
  layoutIntermediate: '(min-width: 641px) and (max-width: 992px)',
  layoutBelowWide: '(max-width: 992px)',
  layoutWide: '(min-width: 993px)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  moreContrast: '(prefers-contrast: more)',
  forcedColors: '(forced-colors: active)',
} as const);

export const systemTokens = Object.freeze({
  "color": {
    "light": {
      "brand": {
        "primary": "rgb(13 102 238)",
        "primaryPressed": "rgb(10 84 199)",
        "onPrimary": "rgb(255 255 255)"
      },
      "text": {
        "primary": "rgb(10 10 10)",
        "heading": "rgb(48 48 48)",
        "secondary": "rgb(95 95 95)",
        "muted": "rgb(118 118 118)",
        "subtle": "rgb(152 152 152)",
        "disabled": "rgb(183 183 178)",
        "inverse": "rgb(255 255 255)",
        "link": "rgb(13 102 238)"
      },
      "icon": {
        "primary": "rgb(10 10 10)",
        "secondary": "rgb(95 95 95)",
        "muted": "rgb(118 118 118)",
        "subtle": "rgb(152 152 152)",
        "inverse": "rgb(255 255 255)"
      },
      "surface": {
        "canvas": "rgb(245 245 245)",
        "subtle": "rgb(239 239 236)",
        "raised": "rgb(251 251 250)",
        "overlay": "rgb(251 251 250)",
        "inverse": "rgb(10 10 10)",
        "transparent": "rgb(245 245 245 / 0)"
      },
      "border": {
        "subtle": "rgb(227 227 222)",
        "default": "rgb(227 227 222)",
        "strong": "rgb(209 209 203)",
        "focus": "rgb(10 10 10)"
      },
      "action": {
        "primary": "rgb(13 102 238)",
        "onPrimary": "rgb(255 255 255)",
        "selected": "rgb(13 102 238)",
        "disabled": "rgb(183 183 178)"
      },
      "feedback": {
        "error": {
          "default": "rgb(180 35 24)",
          "surface": "rgb(254 243 242)",
          "border": "rgb(253 162 155)",
          "on": "rgb(255 255 255)"
        },
        "success": {
          "default": "rgb(6 118 71)",
          "surface": "rgb(236 253 243)",
          "border": "rgb(108 233 166)",
          "on": "rgb(255 255 255)"
        },
        "warning": {
          "default": "rgb(181 71 8)",
          "surface": "rgb(255 250 235)",
          "border": "rgb(254 200 75)",
          "on": "rgb(255 255 255)"
        },
        "info": {
          "default": "rgb(23 92 211)",
          "surface": "rgb(239 248 255)",
          "border": "rgb(132 202 255)",
          "on": "rgb(255 255 255)"
        }
      }
    },
    "dark": {
      "brand": {
        "primary": "rgb(13 102 238)",
        "primaryPressed": "rgb(10 84 199)",
        "onPrimary": "rgb(255 255 255)"
      },
      "text": {
        "primary": "rgb(243 243 240)",
        "heading": "rgb(255 255 255)",
        "secondary": "rgb(200 200 194)",
        "muted": "rgb(156 156 149)",
        "subtle": "rgb(111 111 111)",
        "disabled": "rgb(92 92 87)",
        "inverse": "rgb(10 10 10)",
        "link": "rgb(91 155 255)"
      },
      "icon": {
        "primary": "rgb(243 243 240)",
        "secondary": "rgb(200 200 194)",
        "muted": "rgb(156 156 149)",
        "subtle": "rgb(111 111 111)",
        "inverse": "rgb(10 10 10)"
      },
      "surface": {
        "canvas": "rgb(0 0 0)",
        "subtle": "rgb(10 10 10)",
        "raised": "rgb(10 10 10)",
        "overlay": "rgb(10 10 10)",
        "inverse": "rgb(255 255 255)",
        "transparent": "rgb(0 0 0 / 0)"
      },
      "border": {
        "subtle": "rgb(45 45 41)",
        "default": "rgb(45 45 41)",
        "strong": "rgb(68 68 62)",
        "focus": "rgb(243 243 240)"
      },
      "action": {
        "primary": "rgb(13 102 238)",
        "onPrimary": "rgb(255 255 255)",
        "selected": "rgb(91 155 255)",
        "disabled": "rgb(92 92 87)"
      },
      "feedback": {
        "error": {
          "default": "rgb(249 112 102)",
          "surface": "rgb(45 10 10)",
          "border": "rgb(240 68 56)",
          "on": "rgb(10 10 10)"
        },
        "success": {
          "default": "rgb(50 213 131)",
          "surface": "rgb(5 46 26)",
          "border": "rgb(18 183 106)",
          "on": "rgb(10 10 10)"
        },
        "warning": {
          "default": "rgb(253 176 34)",
          "surface": "rgb(58 36 0)",
          "border": "rgb(247 144 9)",
          "on": "rgb(10 10 10)"
        },
        "info": {
          "default": "rgb(83 177 253)",
          "surface": "rgb(7 29 51)",
          "border": "rgb(46 144 250)",
          "on": "rgb(10 10 10)"
        }
      }
    },
    "scrim": "rgb(0 0 0 / 0.32)"
  },
  "typography": {
    "heading1Wide": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "28px",
      "fontWeight": 600,
      "lineHeight": 1.08,
      "letterSpacing": "-1.12px"
    },
    "heading1Medium": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "22px",
      "fontWeight": 600,
      "lineHeight": 1.08,
      "letterSpacing": "-0.704px"
    },
    "heading1Narrow": {
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
    "heading3Wide": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "18.5px",
      "fontWeight": 600,
      "lineHeight": 1.15,
      "letterSpacing": "-0.4625px"
    },
    "heading3Medium": {
      "fontFamily": "'SC Acumin', Arial, sans-serif",
      "fontSize": "16px",
      "fontWeight": 600,
      "lineHeight": 1.16,
      "letterSpacing": "-0.288px"
    },
    "heading3Narrow": {
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
    "extraSmall": "4px",
    "menu": "4px",
    "control": "8px",
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
  "layout": {
    "container": {
      "wide": "1240px",
      "content": "1200px",
      "narrow": "900px",
      "text": "620px"
    },
    "pageGutter": {
      "wide": "28px",
      "contentNarrow": "24px",
      "medium": "24px",
      "narrow": "20px"
    },
    "gridGap": {
      "wide": "28px",
      "contentNarrow": "24px",
      "medium": "24px",
      "narrow": "20px"
    },
    "sectionGap": {
      "compact": "32px",
      "default": "48px",
      "spacious": "64px",
      "expanded": "80px",
      "immersive": "96px"
    }
  },
  "size": {
    "touchTarget": "48px",
    "icon": {
      "small": "16px",
      "medium": "20px",
      "large": "24px"
    },
    "control": {
      "small": "40px",
      "medium": "48px",
      "large": "56px"
    }
  },
  "state": {
    "opacity": {
      "disabled": 0.38,
      "muted": 0.78,
      "placeholder": 0.88,
      "hover": 0.08,
      "focus": 0.12,
      "pressed": 0.12,
      "dragged": 0.16
    }
  },
  "elevation": {
    "level0": "0px 0px 0px 0px rgb(0 0 0 / 0.08)",
    "level1": "0px 1px 3px 0px rgb(0 0 0 / 0.08)",
    "level2": "0px 3px 6px 0px rgb(0 0 0 / 0.08)",
    "level3": "0px 6px 12px 0px rgb(0 0 0 / 0.09)",
    "level4": "0px 8px 20px 0px rgb(0 0 0 / 0.09)",
    "level5": "0px 12px 32px 0px rgb(0 0 0 / 0.22)",
    "menu": "0px 3px 6px 0px rgb(0 0 0 / 0.08)",
    "popover": "0px 6px 12px 0px rgb(0 0 0 / 0.09)",
    "dialog": "0px 12px 32px 0px rgb(0 0 0 / 0.22)"
  },
  "layer": {
    "base": 0,
    "raised": 1,
    "sticky": 120,
    "dropdown": 160,
    "popover": 240,
    "drawer": 1000,
    "toast": 8000,
    "modal": 9000,
    "tooltip": 10000
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
