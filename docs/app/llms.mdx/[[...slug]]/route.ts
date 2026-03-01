import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";
import { notFound } from "next/navigation";

export const revalidate = false;

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  let { slug } = await params;

  if (slug && slug.length > 0) {
    const last = slug[slug.length - 1];
    if (last.endsWith(".mdx")) {
      slug = [...slug];
      slug[slug.length - 1] = last.replace(/\.mdx$/, "");
    }
  }

  if (slug && slug.length === 1 && slug[0] === "index") {
    slug = [];
  }

  const page = source.getPage(slug);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
