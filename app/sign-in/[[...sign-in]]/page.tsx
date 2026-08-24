import { SignIn } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site";

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <SignIn />
      </main>
    </>
  );
}
