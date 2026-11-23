/** A command to the page harness, one on each stdin line. */
export interface Command {
  id: number;
  action: "key" | "type" | "hover" | "click" | "scroll" | "eval" | "shot" | "clipboard";
  args: unknown[];
}

/** Electron and Chromium also write to stdout, so each harness message line has this prefix. */
export const PREFIX = "\u0001mdb ";
