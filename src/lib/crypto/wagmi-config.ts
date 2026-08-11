import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = projectId
  ? getDefaultConfig({
      appName: "DePay Admin",
      projectId,
      chains: [base],
      ssr: true,
    })
  : createConfig({
      chains: [base],
      connectors: [injected()],
      transports: { [base.id]: http() },
      ssr: true,
    });
