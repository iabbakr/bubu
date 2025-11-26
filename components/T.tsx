// components/T.tsx ← BEST VERSION (copy-paste this)
import React from "react";
import { ThemedText } from "./ThemedText";
import i18n from "../lib/i18n";

type TProps = {
  children: keyof typeof import("../lib/i18n").translations.en;
  type?: "h1" | "h2" | "h3" | "h4" | "body" | "caption";
  style?: any;
};

export const T = ({ children, type = "body", style }: TProps) => {
  return (
    <ThemedText type={type} style={style}>
      {i18n.t(children)}
    </ThemedText>
  );
};