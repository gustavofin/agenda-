"""Baixa e filtra candidatos a Deputado Federal nas eleições de 2026."""

import csv
import io
import json
import re
import zipfile
from collections import Counter
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


PACKAGE_API = "https://dadosabertos.tse.jus.br/api/3/action/package_show"
PACKAGE_ID = "candidatos-2026"
FALLBACK_RESOURCE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip"
OUT_FILE = Path("dados/candidatos_tse_2026.json")
LOCAL_ZIP_NAME = "consulta_cand_2026.zip"
HEADERS = {"User-Agent": "agenda-camara/1.0", "Accept": "application/json"}
FIELDS = (
    "NM_CANDIDATO",
    "NM_URNA_CANDIDATO",
    "NR_CANDIDATO",
    "SG_PARTIDO",
    "SG_UF",
    "DS_SITUACAO_CANDIDATURA",
    "NR_CPF_CANDIDATO",
)


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


def package_resources(session):
    try:
        response = session.get(PACKAGE_API, params={"id": PACKAGE_ID}, timeout=60)
        response.raise_for_status()
        payload = response.json()
        if not payload.get("success"):
            raise RuntimeError(f"Catálogo TSE retornou resposta inválida: {payload}")
        return payload["result"]["resources"]
    except (requests.RequestException, ValueError) as error:
        print(f"Catálogo CKAN indisponível ({error}); usando o recurso nacional oficial.")
        return [{"name": "consulta_cand_2026.zip", "format": "ZIP", "url": FALLBACK_RESOURCE_URL}]


def resource_label(resource):
    return " ".join(
        str(resource.get(key) or "")
        for key in ("name", "description", "url", "format")
    ).upper()


def choose_resources(resources):
    archives = [r for r in resources if r.get("url") and str(r.get("format", "")).upper() in {"ZIP", "CSV"}]
    brazil = [r for r in archives if re.search(r"\bBRASIL\b", resource_label(r))]
    if brazil:
        return brazil[:1]

    states = [r for r in archives if re.search(r"\b(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b", resource_label(r))]
    if len(states) >= 27:
        return states
    raise RuntimeError("Não encontrei recurso nacional BRASIL nem os 27 recursos estaduais no catálogo TSE.")


def read_csv_bytes(content, source_name):
    """Lê CSV do TSE, inclusive CSVs dentro de ZIPs e com BOM."""
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    sample = text[:10000]
    try:
        delimiter = csv.Sniffer().sniff(sample, delimiters=";,").delimiter
    except csv.Error:
        delimiter = ";"
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        raise RuntimeError(f"CSV sem cabeçalho: {source_name}")
    reader.fieldnames = [field.strip().upper() for field in reader.fieldnames]
    missing = [field for field in ("DS_CARGO", *FIELDS) if field not in reader.fieldnames]
    if missing:
        raise RuntimeError(f"{source_name}: colunas ausentes: {', '.join(missing)}")
    return [row for row in reader if row.get("DS_CARGO", "").strip().upper() == "DEPUTADO FEDERAL"]


def rows_from_download(content, resource_name):
    if zipfile.is_zipfile(io.BytesIO(content)):
        rows = []
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
            if not csv_names:
                raise RuntimeError(f"ZIP sem CSV: {resource_name}")
            for csv_name in csv_names:
                rows.extend(read_csv_bytes(archive.read(csv_name), csv_name))
        return rows
    return read_csv_bytes(content, resource_name)


def find_local_zip():
    for candidate in (Path(LOCAL_ZIP_NAME), Path("..") / LOCAL_ZIP_NAME):
        if candidate.is_file():
            return candidate
    return None


def main():
    session = make_session()
    local_zip = find_local_zip()
    if local_zip:
        print(f"Usando ZIP local: {local_zip.resolve()}")
        candidatos = [
            {field: (row.get(field) or "").strip() or None for field in FIELDS}
            for row in rows_from_download(local_zip.read_bytes(), str(local_zip))
        ]
    else:
        resources = choose_resources(package_resources(session))
        print(f"Recursos selecionados: {len(resources)}")
        candidatos = []
        for index, resource in enumerate(resources, start=1):
            name = resource.get("name") or resource["url"]
            print(f"Baixando {index}/{len(resources)}: {name}")
            response = session.get(resource["url"], timeout=180)
            response.raise_for_status()
            for row in rows_from_download(response.content, name):
                candidatos.append({field: (row.get(field) or "").strip() or None for field in FIELDS})

    OUT_FILE.parent.mkdir(exist_ok=True)
    temporary = OUT_FILE.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(candidatos, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(OUT_FILE)

    por_uf = Counter(candidato["SG_UF"] for candidato in candidatos)
    print(f"Total de candidatos a Deputado Federal: {len(candidatos)}")
    print("Por UF:")
    for uf in sorted(por_uf):
        print(f"  {uf}: {por_uf[uf]}")
    print(f"Salvo em {OUT_FILE}")


if __name__ == "__main__":
    main()