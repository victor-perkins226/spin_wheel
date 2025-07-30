// pages/referme/[walletAddress].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

interface ReferralPageProps {
  walletAddress: string;
}

export const getServerSideProps: GetServerSideProps<ReferralPageProps> = async ({
  params,
  locale,
}) => {
  const walletAddress = params?.walletAddress as string;
  
  // Validate wallet address format (basic validation)
  if (!walletAddress || walletAddress.length !== 44) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      walletAddress,
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
};

export default function ReferralPage({ walletAddress }: ReferralPageProps) {
  const router = useRouter();

  useEffect(() => {
    // Store the referral wallet address in localStorage or context
    localStorage.setItem('referralWallet', walletAddress);
    
    // Redirect to home page
    router.replace('/');
  }, [walletAddress, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p>Redirecting you to the main page...</p>
      </div>
    </div>
  );
}
