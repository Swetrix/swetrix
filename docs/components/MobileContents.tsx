"use client";

import { useEffect, useRef, useState } from "react";
import { useTOCItems } from "fumadocs-ui/components/toc";
import { TOCPopover } from "fumadocs-ui/layouts/docs/page/slots/toc";

export function MobileContents() {
  const headings = useTOCItems();
  const details = useRef<HTMLDetailsElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!details.current?.open) setReady(true);
  }, []);

  if (ready) return <TOCPopover />;

  return (
    <details
      ref={details}
      className="border-b bg-fd-background text-sm [grid-area:toc-popover] xl:hidden"
      onToggle={(event) => {
        if (!event.currentTarget.open) setReady(true);
      }}
    >
      <summary className="cursor-pointer px-4 py-3">On this page</summary>
      <nav aria-label="On this page" className="px-4 pb-2">
        {headings.map(({ url, title }) => (
          <a key={url} href={url} className="block py-2">
            {title}
          </a>
        ))}
      </nav>
    </details>
  );
}
