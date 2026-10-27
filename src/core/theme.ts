import type { TerminalTheme } from "@zenbu-labs/pixel/preload";
import type { Background } from "../shared/types.ts";

type Rgb = readonly [number, number, number];

const FALLBACK_FG: Rgb = [220, 220, 220];
const FALLBACK_BG: Rgb = [24, 24, 27];
const FALLBACK_ANSI: Record<number, Rgb> = {
  1: [224, 108, 117],
  2: [152, 195, 121],
  3: [229, 192, 123],
  4: [97, 175, 239],
  5: [198, 120, 221],
  6: [86, 182, 194],
};

function rgb(color: Rgb, alpha?: number): string {
  const base = `${color[0]} ${color[1]} ${color[2]}`;
  return alpha === undefined ? `rgb(${base})` : `rgb(${base} / ${alpha})`;
}

function toRgb(value: number[] | null | undefined, fallback: Rgb): Rgb {
  return value && value.length >= 3 ? [value[0]!, value[1]!, value[2]!] : fallback;
}

export function themeVariables(
  theme: TerminalTheme | null,
  background: Background,
): Record<string, string> {
  const fg = toRgb(theme?.foreground, FALLBACK_FG);
  const bg = toRgb(theme?.background, FALLBACK_BG);
  const ansi = (i: number) => toRgb(theme?.ansi[i], FALLBACK_ANSI[i]!);
  const page = background === "solid" ? rgb(bg) : "transparent";
  return {
    "--bg": page,
    "--fg": rgb(fg),
    "--muted": rgb(fg, 0.65),
    "--hairline": rgb(fg, 0.14),
    "--surface": rgb(fg, 0.06),
    "--surface-strong": rgb(fg, 0.12),
    "--accent": rgb(ansi(4)),
    "--note": rgb(ansi(4)),
    "--tip": rgb(ansi(2)),
    "--important": rgb(ansi(5)),
    "--warning": rgb(ansi(3)),
    "--caution": rgb(ansi(1)),
    "--syntax-keyword": rgb(ansi(5)),
    "--syntax-string": rgb(ansi(2)),
    "--syntax-number": rgb(ansi(3)),
    "--syntax-title": rgb(ansi(4)),
    "--syntax-type": rgb(ansi(6)),
    "--syntax-deletion": rgb(ansi(1)),
    "--pele-bg": rgb(bg),
    "--pele-fg": rgb(fg),
    "--pele-muted": rgb(fg, 0.65),
    "--pele-line": rgb(fg, 0.7),
    "--pele-surface": rgb(fg, 0.08),
    "--pele-surface-alt": rgb(fg, 0.14),
    "--pele-border": rgb(fg, 0.3),
    "--pele-accent": rgb(ansi(4)),
  };
}
