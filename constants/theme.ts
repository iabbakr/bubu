import { Platform } from "react-native";

const navy = "#000080";
const snowWhite = "#FFFAFA";
const lightBlue = "#ADD8E6";
const slateGray = "#6D8196";

export const Colors = {
  light: {
    primary: navy,
    secondary: lightBlue,
    background: snowWhite,
    accent: slateGray,
    text: navy,
    textSecondary: slateGray,
    textDisabled: slateGray + "66",
    textInverted: snowWhite,
    buttonText: snowWhite,
    tabIconDefault: slateGray + "80",
    tabIconSelected: navy,
    link: navy,
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: lightBlue,
    backgroundRoot: snowWhite,
    backgroundDefault: snowWhite,
    backgroundSecondary: lightBlue + "15",
    backgroundTertiary: slateGray + "10",
    border: slateGray + "26",
    cardBackground: snowWhite,
  },
  dark: {
    primary: lightBlue,
    secondary: slateGray,
    background: "#1A1A2E",
    accent: lightBlue,
    text: snowWhite,
    textSecondary: slateGray,
    textDisabled: slateGray + "66",
    textInverted: navy,
    buttonText: navy,
    tabIconDefault: slateGray,
    tabIconSelected: lightBlue,
    link: lightBlue,
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: lightBlue,
    backgroundRoot: "#1A1A2E",
    backgroundDefault: "#1A1A2E",
    backgroundSecondary: lightBlue + "15",
    backgroundTertiary: slateGray + "15",
    border: slateGray + "40",
    cardBackground: "#252540",
  },
};

export const Spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 48,
  fabSize: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 28,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 26,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 20,
    fontWeight: "500" as const,
  },
  h3: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  h4: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 12,
    fontWeight: "300" as const,
  },
  caption: {
    fontSize: 10,
    fontWeight: "300" as const,
  },
  label: {
    fontSize: 10,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 12,
    fontWeight: "300" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
