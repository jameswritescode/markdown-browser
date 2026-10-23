import type {} from "@zenbu-labs/pixel/preload";
import type { MdbBridge } from "../shared/types.ts";

declare global {
  interface Window {
    mdb: MdbBridge;
  }
}
