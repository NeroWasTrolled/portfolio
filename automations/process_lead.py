#!/usr/bin/env python3
"""Processa lead do portfolio: grava CSV e gera digest estruturado.

Uso (stdin JSON):
  echo '{"id":"...","name":"...","email":"...","message":"...","budget":null,"createdAt":"..."}' \\
    | python process_lead.py --out-dir ../data
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest_message(message: str) -> dict:
    words = [w for w in re.split(r"\s+", message.strip()) if w]
    lower = message.lower()
    signals = []
    mapping = {
        "dashboard": "dashboard",
        "painel": "dashboard",
        "automacao": "automacao",
        "automação": "automacao",
        "python": "automacao",
        "relatorio": "automacao",
        "relatório": "automacao",
        "crud": "sistema",
        "sistema": "sistema",
        "gestao": "sistema",
        "gestão": "sistema",
        "urgente": "urgencia",
        "urgencia": "urgencia",
        "urgência": "urgencia",
    }
    for key, tag in mapping.items():
        if key in lower and tag not in signals:
            signals.append(tag)
    return {
        "word_count": len(words),
        "char_count": len(message),
        "signals": signals or ["geral"],
        "preview": message.strip()[:180],
    }


def append_csv(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["id", "createdAt", "name", "email", "budget", "signals", "message"]
    write_header = not path.exists()
    with path.open("a", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        writer.writerow(row)


def main() -> int:
    parser = argparse.ArgumentParser(description="Processa lead do formulario do portfolio")
    parser.add_argument("--out-dir", required=True, help="Diretorio de saida (data/)")
    args = parser.parse_args()

    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"ok": False, "error": "stdin vazio"}, ensure_ascii=False))
        return 1

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": f"JSON invalido: {exc}"}, ensure_ascii=False))
        return 1

    email = str(payload.get("email") or "").strip().lower()
    if not EMAIL_RE.match(email):
        print(json.dumps({"ok": False, "error": "email invalido no process_lead"}, ensure_ascii=False))
        return 1

    message = str(payload.get("message") or "")
    analysis = digest_message(message)
    out_dir = Path(args.out_dir)
    csv_path = out_dir / "leads.csv"
    digest_path = out_dir / "last_lead_digest.json"

    row = {
        "id": payload.get("id") or "",
        "createdAt": payload.get("createdAt") or utc_now(),
        "name": payload.get("name") or "",
        "email": email,
        "budget": "" if payload.get("budget") in (None, "") else payload.get("budget"),
        "signals": "|".join(analysis["signals"]),
        "message": message.replace("\n", " ").strip()[:500],
    }
    append_csv(csv_path, row)

    digest = {
        "ok": True,
        "engine": "python",
        "script": "process_lead.py",
        "processedAt": utc_now(),
        "leadId": row["id"],
        "csvPath": str(csv_path),
        "analysis": analysis,
        "nextStep": "Notificar por email e responder no WhatsApp",
    }
    digest_path.write_text(json.dumps(digest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(digest, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
