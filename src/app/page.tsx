import { redirect } from 'next/navigation';

/** Stessa esperienza di /in-arrivo (messaggio “iscrizioni in arrivo”). */
export default function HomePage() {
  redirect('/in-arrivo');
}
