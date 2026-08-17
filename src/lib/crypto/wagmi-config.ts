import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  okxWallet,
  trustWallet,
  coinbaseWallet,
  phantomWallet,
  bybitWallet,
  binanceWallet,
  bitgetWallet,
  walletConnectWallet,
  injectedWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet as coinbaseConnector } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

function buildConfig() {
  if (!projectId) {
    // Fallback without WalletConnect — basic injected + coinbase only
    return createConfig({
      chains: [base],
      connectors: [
        injected(),
        coinbaseConnector({ appName: "Depay" }),
      ],
      transports: { [base.id]: http() },
      ssr: true,
    });
  }

  // RainbowKit wallets for the modal (desktop / regular browser)
  const rainbowKitConnectors = connectorsForWallets(
    [
      {
        groupName: "Popular",
        wallets: [
          injectedWallet,   // MUST be first — catches dApp browser providers
          metaMaskWallet,
          okxWallet,
          trustWallet,
          coinbaseWallet,
          phantomWallet,
          binanceWallet,
          bybitWallet,
          bitgetWallet,
        ],
      },
      {
        groupName: "More",
        wallets: [
          rainbowWallet,
          walletConnectWallet,
        ],
      },
    ],
    { appName: "Depay", projectId },
  );

  // Merge RainbowKit connectors with a raw injected() connector.
  // The raw injected() ensures window.ethereum is always available as a
  // registered connector for direct dApp-browser connections.
  return createConfig({
    connectors: [
      injected({ shimDisconnect: true }),
      ...rainbowKitConnectors,
    ],
    chains: [base],
    transports: { [base.id]: http() },
    ssr: true,
  });
}

export const wagmiConfig = buildConfig();
export const hasWalletConnectId = !!projectId;
