"""Cruza candidaturas do TSE com deputados atuais da Câmara pelo CPF."""

import json
import re
from collections import defaultdict
from pathlib import Path


CANDIDATOS_FILE = Path("dados/candidatos_tse_2026.json")
DEPUTADOS_FILE = Path("dados/deputados_com_cpf.json")
OUT_FILE = Path("dados/candidatos_2026.json")


def normalize_cpf(value):
    return "".join(character for character in str(value or "") if character.isdigit())


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def status_priority(status):
    normalized = re.sub(r"[^A-Z]", "", str(status or "").upper())
    if normalized in {"DEFERIDO", "APTO"}:
        return 3
    if normalized in {"PENDENTE", "AGUARDANDOJULGAMENTO"}:
        return 2
    if normalized in {"INDEFERIDO", "CANCELADO", "RENUNCIA", "FALECIDO"}:
        return 1
    return 0


def deduplicate_candidates(candidatos):
    groups = defaultdict(list)
    for candidato in candidatos:
        cpf = normalize_cpf(candidato.get("NR_CPF_CANDIDATO"))
        if cpf:
            key = ("cpf", cpf)
        else:
            key = (
                "fields",
                candidato.get("NM_CANDIDATO"),
                candidato.get("NM_URNA_CANDIDATO"),
                candidato.get("NR_CANDIDATO"),
                candidato.get("SG_PARTIDO"),
                candidato.get("SG_UF"),
            )
        groups[key].append(candidato)

    deduplicados = []
    empates = 0
    for grupo in groups.values():
        maior_prioridade = max(status_priority(item.get("DS_SITUACAO_CANDIDATURA")) for item in grupo)
        melhores = [
            item
            for item in grupo
            if status_priority(item.get("DS_SITUACAO_CANDIDATURA")) == maior_prioridade
        ]
        if len(melhores) > 1:
            empates += 1
        deduplicados.append(melhores[0])
    return deduplicados, empates


def main():
    candidatos_brutos = load_json(CANDIDATOS_FILE)
    candidatos, empates = deduplicate_candidates(candidatos_brutos)
    deputados = load_json(DEPUTADOS_FILE)
    deputados_por_cpf = {
        normalize_cpf(deputado.get("cpf")): deputado
        for deputado in deputados
        if normalize_cpf(deputado.get("cpf"))
    }

    resultado = []
    for candidato in candidatos:
        deputado = deputados_por_cpf.get(normalize_cpf(candidato.get("NR_CPF_CANDIDATO")))
        item = dict(candidato)
        item["temMandatoAtual"] = deputado is not None
        item["idDeputado"] = deputado.get("id") if deputado else None
        resultado.append(item)

    temporary = OUT_FILE.with_suffix(OUT_FILE.suffix + ".tmp")
    temporary.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(OUT_FILE)

    ids_encontrados = {item["idDeputado"] for item in resultado if item["idDeputado"] is not None}
    nao_encontrados = [deputado for deputado in deputados if deputado.get("id") not in ids_encontrados]
    com_mandato = sum(item["temMandatoAtual"] for item in resultado)
    print(f"Candidatos antes da deduplicação: {len(candidatos_brutos)}")
    print(f"Candidatos no total após deduplicação: {len(resultado)}")
    print(f"Candidatos com mandato atual: {com_mandato}")
    print(f"Deputados atuais não encontrados entre os candidatos: {len(nao_encontrados)}")
    print(f"Grupos com empate de situação igualmente prioritária: {empates}")
    print(f"Salvo em {OUT_FILE}")


if __name__ == "__main__":
    main()