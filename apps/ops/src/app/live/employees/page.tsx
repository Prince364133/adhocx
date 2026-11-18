import { redirect } from 'next/navigation';

export default function LegacyEmployeeTrackingRedirect() {
  redirect('/employees');
}
