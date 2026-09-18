import { redirect } from 'next/navigation';

export default function ListingDetailRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/donations/${params.id}`);
}
