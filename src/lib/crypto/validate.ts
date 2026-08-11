import { isAddress, getAddress } from "viem";

export function isValidEthAddress(address: string): boolean {
  return isAddress(address);
}

export function checksumAddress(address: string): string {
  return getAddress(address);
}
