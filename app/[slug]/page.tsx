import { notFound } from "next/navigation";
import { SecondaryPage } from "@/components/marketing/secondary-page";
import { marketingPages, marketingPagesBySlug } from "@/lib/marketing-pages";

export function generateStaticParams() {
  return marketingPages.map((page) => ({ slug: page.slug }));
}

export default async function MarketingSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = marketingPagesBySlug[slug];

  if (!page) {
    notFound();
  }

  return <SecondaryPage page={page} />;
}
