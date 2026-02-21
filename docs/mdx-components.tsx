import defaultMdxComponents from "fumadocs-ui/mdx";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { File, Folder, Files } from "fumadocs-ui/components/files";
import type { MDXComponents } from "mdx/types";
import type { ImgHTMLAttributes } from "react";

const BASE_PATH = "/docs";

function Img(props: ImgHTMLAttributes<HTMLImageElement>) {
  const raw = props.src;
  const src =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith(BASE_PATH)
      ? `${BASE_PATH}${raw}`
      : raw;
  return <img {...props} src={src} />;
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    img: Img,
    Callout,
    Step,
    Steps,
    Tab,
    Tabs,
    Accordion,
    Accordions,
    File,
    Folder,
    Files,
    ...components,
  };
}
