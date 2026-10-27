import type {} from "@zenbu-labs/pixel/preload";
import type { MdbBridge } from "../shared/types.ts";
import type { OpenResult, RemoteOpen } from "./tabs.ts";

declare global {
  interface Window {
    mdb: MdbBridge;
    mdbRemote: {
      open(request: RemoteOpen): Promise<{ heading: boolean | null; result: OpenResult }>;
    };
  }
}
