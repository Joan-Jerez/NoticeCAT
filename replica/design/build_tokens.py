#!/usr/bin/env python3
"""tokens.json -> tokens.css (bloque @theme de Tailwind 4).

    py -3 replica/design/build_tokens.py

Escribe tokens.css junto a tokens.json y copia el mismo bloque dentro de
primitives.html, entre los marcadores TOKENS:START y TOKENS:END. Después de
cambiar un valor en tokens.json (por ejemplo en /replica-brand), se vuelve a
correr esto y luego contrast.py.
"""

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent


def px(n):
    return "0" if n == 0 else f"{n / 16:g}rem"


def build(tokens):
    out = ["@theme static {", "  --color-*: initial;"]
    for name, value in tokens["color"].items():
        out.append(f"  --color-{name}: {value};")

    out.append("")
    for name, value in tokens["font"].items():
        out.append(f"  --font-{name}: {value};")

    out.append("")
    out.append("  --text-*: initial;")
    for name, t in tokens["type"].items():
        out.append(f"  --text-{name}: {px(t['size'])};")
        out.append(f"  --text-{name}--line-height: {px(t['line'])};")
        out.append(f"  --text-{name}--font-weight: {t['weight']};")
        if "tracking" in t:
            out.append(f"  --text-{name}--letter-spacing: {t['tracking']}px;")

    out.append("")
    for name, value in tokens["tracking"].items():
        out.append(f"  --tracking-{name}: {value}px;")

    out.append("")
    out.append("  --spacing: 0.25rem;")

    out.append("")
    out.append("  --radius-*: initial;")
    for name, value in tokens["radius"].items():
        out.append(f"  --radius-{name}: {value if isinstance(value, str) else str(value) + 'px'};")

    out.append("")
    for name, value in tokens["shadow"].items():
        out.append(f"  --shadow-{name}: {value};")

    out.append("")
    m = tokens["motion"]
    for name in ("fast", "base", "slow"):
        out.append(f"  --duration-{name}: {m[name]};")
    out.append(f"  --ease-out: {m['ease']};")
    out.append(f"  --ease-soft: {m['ease-soft']};")
    out.append(f"  --motion-distance: {m['distance']};")

    layout = tokens["layout"]
    out.append("")
    for name in ("content", "article", "sidebar", "card", "thumb"):
        out.append(f"  --container-{name}: {px(layout[name])};")
    for name, value in layout["breakpoints"].items():
        out.append(f"  --breakpoint-{name}: {px(value)};")
    out.append("}")

    # tamaños de titular que bajan en móvil
    mobile = [(n, t["mobile"]) for n, t in tokens["type"].items() if "mobile" in t]
    if mobile:
        out.append("")
        out.append(f"@media (width < {px(layout['breakpoints']['md'])}) {{")
        out.append("  :root {")
        for name, m in mobile:
            out.append(f"    --text-{name}: {px(m['size'])};")
            out.append(f"    --text-{name}--line-height: {px(m['line'])};")
        out.append("  }")
        out.append("}")
    return "\n".join(out) + "\n"


def main():
    tokens = json.loads((HERE / "tokens.json").read_text(encoding="utf-8"))
    css = build(tokens)
    header = "/* Generado por build_tokens.py desde tokens.json. No editar a mano. */\n"
    (HERE / "tokens.css").write_text(header + css, encoding="utf-8")

    web = HERE.parent.parent / "web" / "src" / "app" / "tokens.css"
    if web.parent.exists():
        web.write_text(header + css, encoding="utf-8")

    page = HERE / "primitives.html"
    if page.exists():
        html = page.read_text(encoding="utf-8")
        new, n = re.subn(r"(/\* TOKENS:START \*/\n).*?(/\* TOKENS:END \*/)",
                         lambda m: m.group(1) + css + m.group(2), html, flags=re.S)
        if n:
            page.write_text(new, encoding="utf-8")
    print("tokens.css escrito" + (" y primitives.html actualizado" if page.exists() else ""))


if __name__ == "__main__":
    main()
