import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// With a WalletConnect project ID: full RainbowKit with all wallets (mobile deep links, QR codes, etc.)
// Without: injected (MetaMask, OKX in-app browser, Trust in-app browser) + Coinbase Wallet SDK
export const wagmiConfig = projectId
  ? getDefaultConfig({
      appName: "Depay",
      projectId,
      chains: [base],
      ssr: true,
    })
  : createConfig({
      chains: [base],
      connectors: [
        injected(),
        coinbaseWallet({ appName: "Depay" }),
      ],
      transports: { [base.id]: http() },
      ssr: true,
    });

export const hasWalletConnectId = !!projectId;
