import { redirect } from 'next/navigation';

export default function RoutesLayout(): never {
  redirect('/dashboard');
}
