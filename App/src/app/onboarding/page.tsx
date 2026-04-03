import { redirect } from 'next/navigation';

export default function OnboardingPage() {
  // Redirect to phone number screen
  redirect('/onboarding/phone');
}

