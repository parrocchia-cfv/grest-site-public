import type { Metadata } from 'next';
import { RegistrationsSoonPage } from '@/components/RegistrationsSoonPage';

export const metadata: Metadata = {
  title: 'Iscrizioni in arrivo',
  description: 'Le iscrizioni saranno disponibili a breve.',
};

export default function InArrivoPage() {
  return <RegistrationsSoonPage />;
}
