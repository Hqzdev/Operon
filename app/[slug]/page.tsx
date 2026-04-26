import { notFound } from "next/navigation";
import { SecondaryPage } from "@/components/marketing/secondary-page";
import { marketingPages, marketingPagesBySlug } from "@/lib/marketing-pages";

export function generateStaticParams() {
  return marketingPages.map((page) => ({ slug: page.slug }));
}

export default function MarketingSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = marketingPagesBySlug[params.slug];

  if (!page) {
    notFound();
  }

  return <SecondaryPage page={page} />;
}
