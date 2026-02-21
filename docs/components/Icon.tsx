"use client";

import * as PhosphorIcons from "@phosphor-icons/react";
import { createElement } from "react";

export function Icon({ name }: { name: string }) {
  const IconComponent = PhosphorIcons[name as keyof typeof PhosphorIcons] as any;
  if (!IconComponent) return null;
  return createElement(IconComponent);
}
