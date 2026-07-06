/*
  Kleiner Resolver-Hook nur fuer die Tests.

  Node im Strip-Types-Modus verlangt bei relativen Importen die Endung. Der
  Anwendungscode nutzt aber (wie in Next ueblich) endungslose Importe. Dieser
  Hook haengt fuer relative Importe ohne Endung ".ts" an, damit die .test.ts-
  Dateien den unveraenderten Quellcode importieren koennen.
*/

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.(ts|tsx|js|jsx|mjs|cjs|json)$/i.test(specifier)) {
    const base = new URL(specifier + ".ts", context.parentURL);
    if (existsSync(fileURLToPath(base))) {
      return nextResolve(specifier + ".ts", context);
    }
  }
  return nextResolve(specifier, context);
}
