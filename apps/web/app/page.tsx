import { redirect } from 'next/navigation';

export default function HomePage() {
  // M1 replaces this with a session check: signed-in staff go to their role's
  // landing surface (/pos for a cashier, /dashboard for an owner).
  redirect('/login');
}
