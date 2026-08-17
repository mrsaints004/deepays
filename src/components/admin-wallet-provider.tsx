"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";
import { wagmiConfig } from "@/lib/crypto/wagmi-config";
import { AdminWalletConnect } from "@/components/admin-wallet-connect";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export function AdminWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={base} modalSize="compact">
          <div className="fixed top-[4.5rem] right-4 z-40 lg:top-4 lg:right-8">
            <AdminWalletConnect />
          </div>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
