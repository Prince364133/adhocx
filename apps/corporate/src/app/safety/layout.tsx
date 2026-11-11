import { redirect } from 'next/navigation';

export default function SafetyLayout(): never {
  redirect('/dashboard');
}
