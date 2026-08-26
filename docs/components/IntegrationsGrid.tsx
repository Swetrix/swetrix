"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { Cards, Card } from "fumadocs-ui/components/card";
import { INTEGRATION_COUNT, IntegrationLogo } from "./IntegrationLogo";

const INTEGRATIONS: {
  name: string;
  href: string;
}[] = [
  {
    name: "Angular",
    href: "/angular-integration",
  },
  {
    name: "Astro",
    href: "/astro-integration",
  },
  {
    name: "BigCommerce",
    href: "/bigcommerce-integration",
  },
  {
    name: "Carrd",
    href: "/carrd-integration",
  },
  {
    name: "Django",
    href: "/django-integration",
  },
  {
    name: "Docusaurus",
    href: "/docusaurus-integration",
  },
  {
    name: "Drupal",
    href: "/drupal-integration",
  },
  {
    name: "Flask",
    href: "/flask-integration",
  },
  {
    name: "Framer",
    href: "/framer-integration",
  },
  {
    name: "Gatsby",
    href: "/gatsby-integration",
  },
  {
    name: "Ghost",
    href: "/ghost-integration",
  },
  {
    name: "Search Console",
    href: "/integrations/google-search-console",
  },
  {
    name: "GTM",
    href: "/gtm-integration",
  },
  {
    name: "Hugo",
    href: "/hugo-integration",
  },
  {
    name: "Jekyll",
    href: "/jekyll-integration",
  },
  {
    name: "Laravel",
    href: "/laravel-integration",
  },
  {
    name: "Next.js",
    href: "/nextjs-integration",
  },
  {
    name: "Nuxt",
    href: "/nuxt-integration",
  },
  {
    name: "React",
    href: "/react-integration",
  },
  {
    name: "Remix",
    href: "/remix-integration",
  },
  {
    name: "Ruby on Rails",
    href: "/ruby-on-rails-integration",
  },
  {
    name: "Shopify",
    href: "/shopify-integration",
  },
  {
    name: "Squarespace",
    href: "/squarespace-integration",
  },
  {
    name: "SvelteKit",
    href: "/sveltekit-integration",
  },
  {
    name: "Vue",
    href: "/vue-integration",
  },
  {
    name: "Webflow",
    href: "/webflow-integration",
  },
  {
    name: "Wix",
    href: "/wix-integration",
  },
  {
    name: "WooCommerce",
    href: "/woocommerce-integration",
  },
  {
    name: "WordPress",
    href: "/wordpress-integration",
  },
];

export function IntegrationsGrid() {
  const moreIntegrationsCount = Math.max(INTEGRATION_COUNT - INTEGRATIONS.length, 0);

  return (
    <Cards className="sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {INTEGRATIONS.map((integration) => (
        <Card
          key={integration.name}
          href={integration.href}
          title={integration.name}
          icon={<IntegrationLogo href={integration.href} />}
        />
      ))}
      <Card
        href="/integrations"
        title={`+${moreIntegrationsCount} more`}
        icon={<ArrowRightIcon />}
        className="border-dashed"
      />
    </Cards>
  );
}
