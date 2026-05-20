import { ScanView } from "./ScanView";

export default async function WalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { address } = await params;
  const { sns } = await searchParams;
  return (
    <ScanView address={address} sns={typeof sns === "string" ? sns : undefined} />
  );
}
