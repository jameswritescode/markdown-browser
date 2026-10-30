import { detect, type Terminal } from "@zenbu-labs/pixel/terminal";
import type { Render } from "../shared/types.ts";
import { rexHost } from "./rex.ts";

/** The terminal that mdb runs in, and what mdb must do differently there. */
export interface Host {
  /** Finds the caller's pane and opens new panes. Null when mdb cannot script the terminal. */
  terminal: Terminal | null;
  /** How pixel draws when the user does not choose. */
  render: Render;
  /** The tab of the pane that mdb runs in, for an mdb with no --tab. */
  tab(): Promise<string | null>;
  /** Resolves when the pane is ready for pixel to start. */
  ready(): Promise<void>;
}

const PIXEL_CHOOSES: Render = { fps: null, frames: null, present: null };

/** Gives a host when mdb runs in its terminal, and null when it does not. */
export type FindHost = (env: NodeJS.ProcessEnv) => Host | null;

/** The terminals that need their own host. The first match wins. */
const HOSTS: FindHost[] = [rexHost];

export function findHost(env: NodeJS.ProcessEnv): Host {
  for (const find of HOSTS) {
    const host = find(env);
    if (host) return host;
  }
  return pixelHost(env);
}

/** Every terminal that pixel knows. */
function pixelHost(env: NodeJS.ProcessEnv): Host {
  return {
    terminal: detect(env),
    render: PIXEL_CHOOSES,
    tab: async () => env.CMUX_WORKSPACE_ID ?? null,
    ready: async () => {},
  };
}

export function withDefaults(render: Render, defaults: Render): Render {
  return {
    fps: render.fps ?? defaults.fps,
    frames: render.frames ?? defaults.frames,
    present: render.present ?? defaults.present,
  };
}
