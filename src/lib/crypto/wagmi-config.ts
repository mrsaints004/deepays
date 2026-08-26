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
    return createConfig({
      chains: [base],
      connectors: [
        injected(),
        coinbaseConnector({ appName: "Deepays" }),
      ],
      transports: { [base.id]: http() },
      ssr: true,
    });
  }

  // Let RainbowKit manage ALL connectors — including the injected one.
  // Do NOT add a separate injected() connector. Having both causes
  // "connector already connected" errors across wallets.
  const connectors = connectorsForWallets(
    [
      {
        groupName: "Popular",
        wallets: [
          injectedWallet,
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
    { appName: "Deepays", projectId },
  );

  return createConfig({
    connectors,
    chains: [base],
    transports: { [base.id]: http() },
    ssr: true,
  });
}

export const wagmiConfig = buildConfig();
export const hasWalletConnectId = !!projectId;
