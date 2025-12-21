import { redirect } from 'next/navigation';

export default function LocaleRootPage() {
  // Redirect to dashboard (middleware handles auth check)
  redirect('/dashboard/default');
}

