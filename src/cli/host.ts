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
  /** Resolves when the pane is ready for pixel to start. This can take a long time. */
  ready(): Promise<void>;
}

const PIXEL_CHOOSES: Render = { fps: null, frames: null, present: null };

/** The terminals where mdb must do more than pixel does, by the name that pixel gives them. */
const HOSTS = new Map<string, (terminal: Terminal) => Host>([["rex", rexHost]]);

export function findHost(env: NodeJS.ProcessEnv): Host {
  const terminal = detect(env);
  const own = terminal && HOSTS.get(terminal.name);
  return terminal && own ? own(terminal) : pixelHost(terminal, env);
}

/** Every terminal where pixel does all the work. */
function pixelHost(terminal: Terminal | null, env: NodeJS.ProcessEnv): Host {
  return {
    terminal,
    render: PIXEL_CHOOSES,
    tab: async () => env.CMUX_WORKSPACE_ID ?? env.HERDR_TAB_ID ?? null,
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
