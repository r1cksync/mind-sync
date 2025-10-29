import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-900 to-indigo-900">
      <SignUp afterSignUpUrl="/home" />
    </div>
  );
}