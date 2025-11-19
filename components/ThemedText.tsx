import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "h1" | "h2" | "h3" | "h4" | "body" | "caption" | "label" | "link";
  weight?: "regular" | "medium" | "semibold" | "bold";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  weight,
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "h4":
        return Typography.h4;
      case "body":
        return Typography.body;
      case "caption":
        return Typography.caption;
      case "label":
        return Typography.label;
      case "link":
        return Typography.link;
      default:
        return Typography.body;
    }
  };

  const getWeightStyle = () => {
    if (!weight) return undefined;
    switch (weight) {
      case "regular":
        return { fontWeight: "400" as const };
      case "medium":
        return { fontWeight: "500" as const };
      case "semibold":
        return { fontWeight: "600" as const };
      case "bold":
        return { fontWeight: "700" as const };
      default:
        return undefined;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), getWeightStyle(), style]} {...rest} />
  );
}
