import { getDefaultConfig, connectorsForWallets } from "@rainbow-me/rainbowkit";
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

export const wagmiConfig = projectId
  ? (() => {
      const connectors = connectorsForWallets(
        [
          {
            groupName: "Popular",
            wallets: [
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
              injectedWallet,
            ],
          },
        ],
        { appName: "Depay", projectId },
      );

      return createConfig({
        connectors,
        chains: [base],
        transports: { [base.id]: http() },
        ssr: true,
      });
    })()
  : createConfig({
      chains: [base],
      connectors: [
        injected(),
        coinbaseConnector({ appName: "Depay" }),
      ],
      transports: { [base.id]: http() },
      ssr: true,
    });

export const hasWalletConnectId = !!projectId;
