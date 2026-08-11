import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY_REGEX = /^0x[0-9a-fA-F]{64}$/;

function validatePrivateKey(key: string): `0x${string}` {
  if (!PRIVATE_KEY_REGEX.test(key)) {
    throw new Error(
      "TREASURY_PRIVATE_KEY is malformed. Expected a 66-character hex string starting with 0x (0x + 64 hex chars)."
    );
  }
  return key as `0x${string}`;
}

export function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
  });
}

export function getTreasuryWalletClient() {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("TREASURY_PRIVATE_KEY is not set");
  }

  const validatedKey = validatePrivateKey(privateKey);
  const account = privateKeyToAccount(validatedKey);

  return {
    client: createWalletClient({
      account,
      chain: base,
      transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
    }),
    account,
  };
}
