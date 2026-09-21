"""Completa dados/deputados.json com o CPF retornado pelo detalhe da Câmara."""

import json
import time
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


BASE_URL = "https://dadosabertos.camara.leg.br/api/v2"
SOURCE_FILE = Path("dados/deputados.json")
OUT_FILE = Path("dados/deputados_com_cpf.json")
SAVE_EVERY = 25
HEADERS = {"Accept": "application/json", "User-Agent": "agenda-camara/1.0"}


def make_session():
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    session = requests.Session()
    session.headers.update(HEADERS)
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path, data):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def get_cpf(session, deputy_id):
    response = session.get(f"{BASE_URL}/deputados/{deputy_id}", timeout=60)
    response.raise_for_status()
    data = response.json().get("dados", {})
    return data.get("cpf")


def main():
    deputados = load_json(SOURCE_FILE)
    resultado = load_json(OUT_FILE) if OUT_FILE.exists() else []
    by_id = {deputado["id"]: dict(deputado) for deputado in deputados}
    by_id.update(
        {deputado["id"]: deputado for deputado in resultado if deputado.get("id") is not None}
    )

    session = make_session()
    for index, deputado in enumerate(deputados, start=1):
        deputy_id = deputado["id"]
        if deputy_id in by_id and "cpf" in by_id[deputy_id]:
            continue

        enriched = dict(deputado)
        enriched["cpf"] = get_cpf(session, deputy_id)
        by_id[deputy_id] = enriched
        resultado = [by_id[item["id"]] for item in deputados]
        if index % SAVE_EVERY == 0:
            save_json(OUT_FILE, resultado)
            print(f"Progresso salvo: {index}/{len(deputados)}")
        time.sleep(0.4)

    resultado = [by_id[item["id"]] for item in deputados]
    save_json(OUT_FILE, resultado)
    com_cpf = sum(bool(str(deputado.get("cpf") or "").strip()) for deputado in resultado)
    print(f"{com_cpf} de {len(resultado)} deputados vieram com CPF preenchido.")
    print(f"Salvo em {OUT_FILE}")


if __name__ == "__main__":
    main()