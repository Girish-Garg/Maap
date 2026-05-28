import { PricingForm } from "@/components/project/pricing-form";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PricingForm projectId={id} />;
}
