import { ScanView } from "./ScanView";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <ScanView address={address} />;
}
