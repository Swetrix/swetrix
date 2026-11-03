import { DocsPage, DocsTitle } from "fumadocs-ui/page";
import Link from "next/link";
import { docsSearch } from "@/lib/search";
import { source } from "@/lib/source";

export const metadata = { title: "Browse documentation" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const pages = query
    ? (await docsSearch.search(query))
        .filter((result) => result.type === "page")
        .map((result) => ({ url: result.url, title: result.content }))
    : source
        .getPages()
        .map((page) => ({ url: page.url, title: page.data.title }))
        .sort((a, b) => a.title.localeCompare(b.title, "en"));

  return (
    <DocsPage full>
      <DocsTitle>Browse documentation</DocsTitle>
      <form action="/docs/browse" role="search" className="my-4 flex gap-2">
        <input
          type="search"
          id="search"
          name="q"
          aria-label="Search documentation"
          placeholder="Search documentation"
          defaultValue={query}
          className="min-w-0 flex-1 rounded-md border px-3 py-2"
        />
        <button type="submit" className="rounded-md border px-4 py-2">
          Search
        </button>
      </form>
      {pages.length === 0 && <p>No matching pages.</p>}
      <ul>
        {pages.map((page) => (
          <li key={page.url}>
            <Link href={page.url} prefetch={false} className="block py-2 underline">
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </DocsPage>
  );
}
