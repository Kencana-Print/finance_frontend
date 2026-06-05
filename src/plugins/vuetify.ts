import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// ─── Tema FINANCE — Hijau Emerald ───────────────────────────────────────────
// Beda dari Garmen (biru #1565c0) → Finance pakai hijau teal #1b5e20 / #2e7d32
const financeTheme = {
  dark: false,
  colors: {
    // Primary — hijau tua elegan
    primary:         "#2e7d32",
    "primary-darken-1": "#1b5e20",
    "primary-lighten-1": "#388e3c",

    // Secondary — teal untuk aksen
    secondary:       "#00695c",
    "secondary-darken-1": "#004d40",

    // Status colors
    success:         "#43a047",
    info:            "#0288d1",
    warning:         "#f57c00",
    error:           "#c62828",

    // Surface
    background:      "#f1f8f1",   // hijau sangat muda
    surface:         "#ffffff",
    "surface-variant": "#e8f5e9",
    "on-surface":    "#1a1a1a",
    "on-primary":    "#ffffff",
  },
};

const financeDarkTheme = {
  dark: true,
  colors: {
    primary:         "#66bb6a",
    "primary-darken-1": "#43a047",
    secondary:       "#4db6ac",
    success:         "#81c784",
    info:            "#4fc3f7",
    warning:         "#ffb74d",
    error:           "#ef5350",
    background:      "#0d1a0d",
    surface:         "#1a2e1a",
    "surface-variant": "#1e3a1e",
    "on-surface":    "#e8f5e8",
    "on-primary":    "#0d1a0d",
  },
};

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "financeTheme",
    themes: {
      financeTheme,
      financeDarkTheme,
    },
  },
  defaults: {
    VBtn: {
      style: "font-size: 12px; letter-spacing: 0.02em; font-weight: 600;",
    },
    VTextField: {
      density: "compact",
      variant: "outlined",
      hideDetails: "auto",
      style: "font-size: 12px;",
    },
    VSelect: {
      density: "compact",
      variant: "outlined",
      hideDetails: "auto",
      style: "font-size: 12px;",
    },
    VAutocomplete: {
      density: "compact",
      variant: "outlined",
      hideDetails: "auto",
      style: "font-size: 12px;",
    },
    VTextarea: {
      density: "compact",
      variant: "outlined",
      hideDetails: "auto",
      style: "font-size: 12px;",
    },
    VCheckbox: {
      density: "compact",
      hideDetails: "auto",
    },
    VCard: {
      rounded: "lg",
      elevation: 1,
    },
    VDataTable: {
      density: "compact",
    },
  },
});
