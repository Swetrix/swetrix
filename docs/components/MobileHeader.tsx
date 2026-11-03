"use client";

import { ListIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { Header } from "fumadocs-ui/layouts/docs/slots/header";
import { useSidebar } from "fumadocs-ui/layouts/docs/slots/sidebar";

export function MobileHeader() {
  const { mode } = useSidebar();
  const { slots } = useDocsLayout();

  if (mode === "drawer") return <Header className="[&_button]:size-11" />;

  return (
    <header
      id="nd-subnav"
      className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-fd-background ps-4 pe-2 [grid-area:header] md:hidden max-md:layout:[--fd-header-height:--spacing(14)]"
    >
      <slots.navTitle className="me-auto inline-flex items-center" />
      <a
        href="/docs/browse#search"
        aria-label="Search documentation"
        className="grid size-11 place-items-center"
      >
        <MagnifyingGlassIcon size={20} />
      </a>
      <a
        href="/docs/browse"
        aria-label="Browse documentation"
        className="grid size-11 place-items-center"
      >
        <ListIcon size={20} />
      </a>
    </header>
  );
}
