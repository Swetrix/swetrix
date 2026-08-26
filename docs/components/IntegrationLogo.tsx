import type { Item, Node, Root } from "fumadocs-core/page-tree";
import type { ComponentType, CSSProperties } from "react";
import {
  siAngular,
  siAstro,
  siBigcommerce,
  siCarrd,
  siDjango,
  siDocusaurus,
  siDotnet,
  siDrupal,
  siEleventy,
  siExpress,
  siFastapi,
  siFastify,
  siFlask,
  siFramer,
  siGatsby,
  siGhost,
  siGitbook,
  siGoogletagmanager,
  siHexo,
  siHtmx,
  siHugo,
  siJekyll,
  siJoomla,
  siLaravel,
  siMaterialformkdocs,
  siNestjs,
  siNextdotjs,
  siNextra,
  siNuxt,
  siPreact,
  siPrestashop,
  siQwik,
  siReact,
  siRemix,
  siRubyonrails,
  siShopify,
  siSolid,
  siSquarespace,
  siSvelte,
  siTildapublishing,
  siVitepress,
  siVuedotjs,
  siWebflow,
  siWix,
  siWoocommerce,
  siWordpress,
  type SimpleIcon,
} from "simple-icons";
import GoogleGIcon from "./GoogleGIcon";

type LogoDefinition =
  | { icon: SimpleIcon }
  | { component: ComponentType<{ className?: string }> }
  | { monogram: string; color: string };

const LOGOS_BY_URL: Record<string, LogoDefinition> = {
  "/angular-integration": { icon: siAngular },
  "/aspnet-integration": { icon: siDotnet },
  "/astro-integration": { icon: siAstro },
  "/bigcommerce-integration": { icon: siBigcommerce },
  "/bubble-integration": { monogram: "B", color: "#6C5CE7" },
  "/carrd-integration": { icon: siCarrd },
  "/docusaurus-integration": { icon: siDocusaurus },
  "/drupal-integration": { icon: siDrupal },
  "/eleventy-integration": { icon: siEleventy },
  "/express-integration": { icon: siExpress },
  "/fastify-integration": { icon: siFastify },
  "/framer-integration": { icon: siFramer },
  "/ghost-integration": { icon: siGhost },
  "/gitbook-integration": { icon: siGitbook },
  "/integrations/google-search-console": { component: GoogleGIcon },
  "/gtm-integration": { icon: siGoogletagmanager },
  "/hexo-integration": { icon: siHexo },
  "/htmx-integration": { icon: siHtmx },
  "/hugo-integration": { icon: siHugo },
  "/jekyll-integration": { icon: siJekyll },
  "/joomla-integration": { icon: siJoomla },
  "/laravel-integration": { icon: siLaravel },
  "/mkdocs-integration": { icon: siMaterialformkdocs },
  "/nestjs-integration": { icon: siNestjs },
  "/prestashop-integration": { icon: siPrestashop },
  "/django-integration": { icon: siDjango },
  "/fastapi-integration": { icon: siFastapi },
  "/flask-integration": { icon: siFlask },
  "/qwik-integration": { icon: siQwik },
  "/gatsby-integration": { icon: siGatsby },
  "/nextjs-integration": { icon: siNextdotjs },
  "/nextra-integration": { icon: siNextra },
  "/preact-integration": { icon: siPreact },
  "/react-integration": { icon: siReact },
  "/remix-integration": { icon: siRemix },
  "/ruby-on-rails-integration": { icon: siRubyonrails },
  "/shopify-integration": { icon: siShopify },
  "/solidjs-integration": { icon: siSolid },
  "/squarespace-integration": { icon: siSquarespace },
  "/sveltekit-integration": { icon: siSvelte },
  "/thrivecart-integration": { monogram: "TC", color: "#1E73EA" },
  "/tilda-integration": { icon: siTildapublishing },
  "/nuxt-integration": { icon: siNuxt },
  "/vitepress-integration": { icon: siVitepress },
  "/vue-integration": { icon: siVuedotjs },
  "/webflow-integration": { icon: siWebflow },
  "/weebly-integration": { monogram: "W", color: "#2990EA" },
  "/wix-integration": { icon: siWix },
  "/woocommerce-integration": { icon: siWoocommerce },
  "/wordpress-integration": { icon: siWordpress },
};

export const INTEGRATION_COUNT = Object.keys(LOGOS_BY_URL).length;

const classes = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(" ");

const hasDarkBrandColor = (hex: string) => {
  const [red, green, blue] = hex.match(/.{2}/g)?.map((value) => Number.parseInt(value, 16)) ?? [];
  return red * 0.299 + green * 0.587 + blue * 0.114 < 70;
};

export function IntegrationLogo({ href, className }: { href: string; className?: string }) {
  const logo = LOGOS_BY_URL[href];
  if (!logo) return null;

  if ("component" in logo) {
    return <logo.component className={className} />;
  }

  if ("monogram" in logo) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect width="24" height="24" rx="6" fill={logo.color} />
        <text
          x="12"
          y="12.5"
          fill="white"
          dominantBaseline="central"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize={logo.monogram.length > 1 ? 8 : 12}
          fontWeight="700"
        >
          {logo.monogram}
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={classes(
        "text-(--integration-logo-color)",
        hasDarkBrandColor(logo.icon.hex) && "dark:text-white",
        className,
      )}
      style={{ "--integration-logo-color": `#${logo.icon.hex}` } as CSSProperties}
      aria-hidden="true"
    >
      <path fill="currentColor" d={logo.icon.path} />
    </svg>
  );
}

const addLogoToNode = (node: Node): Node => {
  if (node.type === "page") {
    if (!LOGOS_BY_URL[node.url]) return node;
    return { ...node, icon: <IntegrationLogo href={node.url} /> };
  }

  if (node.type === "folder") {
    return {
      ...node,
      children: node.children.map(addLogoToNode),
      index: node.index ? (addLogoToNode(node.index) as Item) : undefined,
    };
  }

  return node;
};

export function addIntegrationLogos(tree: Root): Root {
  return {
    ...tree,
    children: tree.children.map(addLogoToNode),
    fallback: tree.fallback ? addIntegrationLogos(tree.fallback) : undefined,
  };
}
