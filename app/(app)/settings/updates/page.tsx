import { redirect } from 'next/navigation';

/** Updates moved to sidebar → /whats-new */
export default function UpdatesSettingsRedirectPage() {
  redirect('/whats-new');
}
