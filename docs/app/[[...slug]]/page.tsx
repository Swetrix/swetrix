import { source } from "@/lib/source";
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { IntegrationsGrid } from "@/components/IntegrationsGrid";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import { getMDXComponents } from "@/mdx-components";

const GITHUB_OWNER = "Swetrix";
const GITHUB_REPO = "swetrix";
const GITHUB_BRANCH = "main";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const Mdx = page.data.body;
  const markdownUrl = `/docs${page.url === "/" ? "/index" : page.url}.mdx`;
  const githubUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/docs/content/docs/${page.path}`;

  return (
    <DocsPage
      toc={page.data.toc}
      editOnGithub={{
        repo: GITHUB_REPO,
        owner: GITHUB_OWNER,
        sha: GITHUB_BRANCH,
        path: `docs/content/docs/${page.path}`,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
        <LLMCopyButton markdownUrl={markdownUrl} />
        <ViewOptions markdownUrl={markdownUrl} githubUrl={githubUrl} />
      </div>
      <DocsBody>
        <Mdx components={getMDXComponents({ IntegrationsGrid })} />
        <FeedbackWidget />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
