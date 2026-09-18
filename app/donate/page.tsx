import { redirect } from 'next/navigation';

export default function DonateRedirectPage() {
  redirect('/donations/create');
}
