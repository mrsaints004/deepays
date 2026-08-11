"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/crypto/wagmi-config";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export function AdminWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="fixed top-[4.5rem] right-4 z-40 lg:top-4 lg:right-8 scale-90 origin-top-right lg:scale-100">
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
