"""
Coletor de dados — Painel "Como seu deputado votou"
=====================================================

O que este script faz:
1. Para cada projeto da lista PROJETOS abaixo, encontra o id da proposição
   na API da Câmara dos Deputados.
2. Lista todas as votações em plenário daquela proposição e escolhe a
   votação certa (a mais próxima da data esperada / que bate com a palavra-chave).
3. Baixa o voto de cada deputado presente naquela votação.
4. Baixa a lista de todos os deputados atuais (nome, partido, UF, foto, id).
5. Salva tudo em /dados/votacoes.json, /dados/votos.json e /dados/deputados.json.

IMPORTANTE — rodar localmente:
Este script precisa de acesso à internet para dadosabertos.camara.leg.br.
O ambiente de chat onde eu (Claude) rodo código não tem acesso a esse domínio,
então não consegui testar a execução real aqui — rode você mesmo:

    pip install requests
    python coletar_dados_camara.py

A API é pública, gratuita e não exige chave de acesso.
Docs oficiais: https://dadosabertos.camara.leg.br/swagger/api.html
"""

import json
import time
from datetime import datetime
from pathlib import Path

import requests

BASE_URL = "https://dadosabertos.camara.leg.br/api/v2"
OUT_DIR = Path("dados")
OUT_DIR.mkdir(exist_ok=True)

HEADERS = {"Accept": "application/json"}
SLEEP_BETWEEN_CALLS = 0.4  # educado com o servidor público

# ---------------------------------------------------------------------------
# 1) CONFIGURAÇÃO DOS 9 PROJETOS
#
# "tipo"/"numero"/"ano" = como a proposição é identificada NA CÂMARA
# (atenção: às vezes o apelido popular usa a numeração do Senado — sempre
# confirme o número de origem na Câmara antes de rodar).
#
# "data_alvo" = data aproximada da votação que queremos (formato YYYY-MM-DD).
# "palavra_chave" = texto que deve aparecer na descrição da votação, usado
# como critério extra quando há mais de uma votação na mesma data.
# ---------------------------------------------------------------------------

PROJETOS = [
    {
        "apelido": "PEC da Blindagem",
        "tipo": "PEC",
        "numero": 3,
        "ano": 2021,
        "data_alvo": "2025-09-16",
        "palavra_chave": "emenda aglutinativa",
    },
    {
        "apelido": "PL da Anistia (urgência)",
        "tipo": "PL",
        "numero": 2162,
        "ano": 2023,
        "data_alvo": "2025-09-17",
        "palavra_chave": "urgência",
    },
    {
        "apelido": "PL da Dosimetria (votação final)",
        "tipo": "PL",
        "numero": 2162,
        "ano": 2023,
        "data_alvo": "2025-12-10",
        "palavra_chave": "substitutivo",
    },
    {
        "apelido": "PL Antifacção",
        "tipo": "PL",
        "numero": 5582,
        "ano": 2025,
        "data_alvo": "2025-11-18",
        "palavra_chave": "texto-base",
    },
    {
        "apelido": "Marco Temporal",
        "tipo": "PL",
        "numero": 490,
        "ano": 2007,
        "data_alvo": "2023-05-30",
        "palavra_chave": "",
    },
    {
        "apelido": "Reforma Tributária (PEC 45)",
        "tipo": "PEC",
        "numero": 45,
        "ano": 2019,
        "data_alvo": "2023-07-07",
        "palavra_chave": "",
    },
    {
        "apelido": "Isenção do IR até R$5 mil",
        "tipo": "PL",
        "numero": 1087,
        "ano": 2025,
        "data_alvo": "2025-10-01",
        "palavra_chave": "texto-base",
    },
    {
        "apelido": "PL das Fake News (urgência)",
        "tipo": "PL",
        "numero": 2630,
        "ano": 2020,
        "data_alvo": "2023-04-25",
        "palavra_chave": "urgência",
    },
    {
        "apelido": "PL da Devastação / Licenciamento Ambiental",
        "tipo": "PL",
        "numero": 2159,
        "ano": 2021,
        "data_alvo": "2025-07-17",
        "palavra_chave": "",
    },
]


def get_json(url, params=None):
    resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
    resp.raise_for_status()
    time.sleep(SLEEP_BETWEEN_CALLS)
    return resp.json()


def find_proposicao_id(tipo: str, numero: int, ano: int) -> int | None:
    """Busca o id interno da proposição a partir de tipo/número/ano."""
    data = get_json(
        f"{BASE_URL}/proposicoes",
        params={"siglaTipo": tipo, "numero": numero, "ano": ano},
    )
    itens = data.get("dados", [])
    if not itens:
        return None
    return itens[0]["id"]


def list_votacoes(id_proposicao: int) -> list[dict]:
    """Lista todas as votações registradas para uma proposição."""
    data = get_json(f"{BASE_URL}/proposicoes/{id_proposicao}/votacoes")
    return data.get("dados", [])


def pick_votacao(votacoes: list[dict], data_alvo: str, palavra_chave: str) -> dict | None:
    """Escolhe a votação mais provável: mesma data + (se houver) palavra-chave na descrição."""
    alvo = datetime.strptime(data_alvo, "%Y-%m-%d").date()
    candidatas = []
    for v in votacoes:
        data_votacao = v.get("data")
        if not data_votacao:
            continue
        d = datetime.strptime(data_votacao, "%Y-%m-%d").date()
        if d == alvo:
            candidatas.append(v)

    if not candidatas:
        # fallback: pega a mais próxima da data alvo
        votacoes_com_data = [v for v in votacoes if v.get("data")]
        if not votacoes_com_data:
            return None
        candidatas = sorted(
            votacoes_com_data,
            key=lambda v: abs((datetime.strptime(v["data"], "%Y-%m-%d").date() - alvo).days),
        )
        return candidatas[0]

    if palavra_chave:
        for v in candidatas:
            descricao = (v.get("descricao") or "").lower()
            if palavra_chave.lower() in descricao:
                return v

    return candidatas[0]


def get_votos(id_votacao: str) -> list[dict]:
    """Baixa o voto individual de cada deputado numa votação nominal."""
    data = get_json(f"{BASE_URL}/votacoes/{id_votacao}/votos")
    return data.get("dados", [])


def get_todos_deputados() -> list[dict]:
    """Lista todos os deputados em exercício (paginado)."""
    deputados = []
    pagina = 1
    while True:
        data = get_json(
            f"{BASE_URL}/deputados",
            params={"pagina": pagina, "itens": 100, "ordem": "ASC", "ordenarPor": "nome"},
        )
        itens = data.get("dados", [])
        if not itens:
            break
        deputados.extend(itens)
        pagina += 1
    return deputados


def main():
    print("Baixando lista de deputados...")
    deputados = get_todos_deputados()
    with open(OUT_DIR / "deputados.json", "w", encoding="utf-8") as f:
        json.dump(deputados, f, ensure_ascii=False, indent=2)
    print(f"  {len(deputados)} deputados salvos em dados/deputados.json")

    resultado_votacoes = []
    resultado_votos = {}

    for projeto in PROJETOS:
        apelido = projeto["apelido"]
        print(f"\nProcessando: {apelido}")

        id_prop = find_proposicao_id(projeto["tipo"], projeto["numero"], projeto["ano"])
        if id_prop is None:
            print(f"  [ERRO] Proposição {projeto['tipo']} {projeto['numero']}/{projeto['ano']} não encontrada.")
            continue

        votacoes = list_votacoes(id_prop)
        if not votacoes:
            print(f"  [AVISO] Nenhuma votação registrada para essa proposição ainda.")
            continue

        votacao_escolhida = pick_votacao(votacoes, projeto["data_alvo"], projeto["palavra_chave"])
        if votacao_escolhida is None:
            print(f"  [AVISO] Não encontrei votação próxima de {projeto['data_alvo']}.")
            continue

        id_votacao = votacao_escolhida["id"]
        print(f"  Votação encontrada: {id_votacao} em {votacao_escolhida.get('data')}")
        print(f"  Descrição: {votacao_escolhida.get('descricao')}")

        votos = get_votos(id_votacao)
        if not votos:
            print(f"  [AVISO] Votação sem registro individual (pode ter sido simbólica/em bloco).")

        resultado_votacoes.append(
            {
                "apelido": apelido,
                "idProposicao": id_prop,
                "idVotacao": id_votacao,
                "data": votacao_escolhida.get("data"),
                "descricao": votacao_escolhida.get("descricao"),
                "aprovacao": votacao_escolhida.get("aprovacao"),
            }
        )
        resultado_votos[apelido] = votos
        print(f"  {len(votos)} votos individuais registrados.")

    with open(OUT_DIR / "votacoes.json", "w", encoding="utf-8") as f:
        json.dump(resultado_votacoes, f, ensure_ascii=False, indent=2)

    with open(OUT_DIR / "votos.json", "w", encoding="utf-8") as f:
        json.dump(resultado_votos, f, ensure_ascii=False, indent=2)

    print("\nPronto. Confira a pasta dados/:")
    print("  - deputados.json  (quem é quem)")
    print("  - votacoes.json   (metadados de cada votação encontrada)")
    print("  - votos.json      (voto de cada deputado, por projeto)")
    print("\nPróximo passo: cruzar 'deputados.json' com a base de candidaturas 2026")
    print("do TSE (dadosabertos.tse.jus.br) para marcar quem está concorrendo à reeleição.")


if __name__ == "__main__":
    main()
