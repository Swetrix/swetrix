import defaultMdxComponents from "fumadocs-ui/mdx";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs, TabsList, TabsTrigger, TabsContent } from "fumadocs-ui/components/tabs";
import {
  GoogleAnalyticsIcon,
  UmamiIcon,
  SimpleAnalyticsIcon,
  FathomIcon,
  PlausibleIcon,
  NpmIcon,
} from "@/components/provider-icons";
import {
  EmailChannelIcon,
  TelegramChannelIcon,
  DiscordChannelIcon,
  SlackChannelIcon,
  WebhookChannelIcon,
  WebpushChannelIcon,
} from "@/components/channel-icons";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { File, Folder, Files } from "fumadocs-ui/components/files";
import { CodeIcon } from "@phosphor-icons/react/dist/ssr";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Callout,
    Step,
    Steps,
    Tab,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    GoogleAnalyticsIcon,
    UmamiIcon,
    SimpleAnalyticsIcon,
    FathomIcon,
    PlausibleIcon,
    NpmIcon,
    EmailChannelIcon,
    TelegramChannelIcon,
    DiscordChannelIcon,
    SlackChannelIcon,
    WebhookChannelIcon,
    WebpushChannelIcon,
    CodeIcon,
    Accordion,
    Accordions,
    File,
    Folder,
    Files,
    ...components,
  };
}
