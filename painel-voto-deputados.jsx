import React, { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// DADOS DE DEMONSTRAÇÃO — 100% FICTÍCIOS.
// Nenhum nome, partido ou voto abaixo corresponde a um deputado real.
// Isso existe só para mostrar como a interface funciona. Antes de publicar,
// troque por dados reais vindos da API de Dados Abertos da Câmara.
// ---------------------------------------------------------------------------

const VOTACOES = [
  {
    id: "blindagem",
    titulo: "PEC da Blindagem",
    resumo:
      "Condiciona a abertura de processo criminal contra deputados e senadores no STF à autorização prévia da Câmara ou do Senado.",
    data: "16/09/2025 (demonstração)",
  },
  {
    id: "anistia",
    titulo: "Urgência do PL da Anistia",
    resumo:
      "Regime de urgência para o projeto que trata de anistia a condenados por atos golpistas de 8 de janeiro de 2023.",
    data: "17/09/2025 (demonstração)",
  },
  {
    id: "marco_temporal",
    titulo: "Marco Temporal",
    resumo:
      "Estabelece que só podem ser demarcadas terras indígenas ocupadas por povos originários na data da promulgação da Constituição, em 1988.",
    data: "30/05/2023 (demonstração)",
  },
  {
    id: "reforma_tributaria",
    titulo: "Reforma Tributária (PEC 45)",
    resumo:
      "Unifica tributos sobre consumo em um novo sistema de IVA dual (CBS e IBS), substituindo PIS, Cofins, IPI, ICMS e ISS.",
    data: "07/07/2023 (demonstração)",
  },
  {
    id: "arcabouco_fiscal",
    titulo: "Novo Arcabouço Fiscal",
    resumo:
      "Substitui o teto de gastos por regras de crescimento da despesa pública atreladas à variação da receita.",
    data: "23/05/2023 (demonstração)",
  },
];

const VOTO = { SIM: "Sim", NAO: "Não", ABST: "Absteve", AUSENTE: "Ausente" };

const DEPUTADOS = [
  { nome: "Ana Beatriz Moreira", partido: "PT", uf: "SP", votos: { blindagem: "NAO", anistia: "NAO", marco_temporal: "NAO", reforma_tributaria: "SIM", arcabouco_fiscal: "SIM" } },
  { nome: "Carlos Eduardo Faria", partido: "PL", uf: "MG", votos: { blindagem: "SIM", anistia: "SIM", marco_temporal: "SIM", reforma_tributaria: "NAO", arcabouco_fiscal: "NAO" } },
  { nome: "Débora Santos Lima", partido: "PSOL", uf: "RJ", votos: { blindagem: "NAO", anistia: "NAO", marco_temporal: "NAO", reforma_tributaria: "SIM", arcabouco_fiscal: "NAO" } },
  { nome: "Eduardo Nogueira", partido: "UNIÃO", uf: "BA", votos: { blindagem: "SIM", anistia: "AUSENTE", marco_temporal: "SIM", reforma_tributaria: "SIM", arcabouco_fiscal: "SIM" } },
  { nome: "Fernanda Ribeiro Alves", partido: "MDB", uf: "PR", votos: { blindagem: "ABST", anistia: "NAO", marco_temporal: "SIM", reforma_tributaria: "SIM", arcabouco_fiscal: "SIM" } },
  { nome: "Gustavo Henrique Pires", partido: "PP", uf: "RS", votos: { blindagem: "SIM", anistia: "SIM", marco_temporal: "SIM", reforma_tributaria: "NAO", arcabouco_fiscal: "NAO" } },
  { nome: "Helena Cristina Souza", partido: "PSD", uf: "CE", votos: { blindagem: "NAO", anistia: "AUSENTE", marco_temporal: "NAO", reforma_tributaria: "SIM", arcabouco_fiscal: "SIM" } },
  { nome: "Igor Almeida Castro", partido: "REPUBLICANOS", uf: "PE", votos: { blindagem: "SIM", anistia: "SIM", marco_temporal: "SIM", reforma_tributaria: "SIM", arcabouco_fiscal: "NAO" } },
  { nome: "Juliana Martins Reis", partido: "PDT", uf: "SC", votos: { blindagem: "NAO", anistia: "NAO", marco_temporal: "AUSENTE", reforma_tributaria: "SIM", arcabouco_fiscal: "SIM" } },
  { nome: "Leonardo Costa Duarte", partido: "PODEMOS", uf: "GO", votos: { blindagem: "SIM", anistia: "ABST", marco_temporal: "SIM", reforma_tributaria: "NAO", arcabouco_fiscal: "SIM" } },
  { nome: "Mariana Oliveira Prado", partido: "PSB", uf: "PA", votos: { blindagem: "NAO", anistia: "NAO", marco_temporal: "NAO", reforma_tributaria: "SIM", arcabouco_fiscal: "NAO" } },
  { nome: "Nelson Rodrigues Vaz", partido: "PSDB", uf: "SP", votos: { blindagem: "SIM", anistia: "AUSENTE", marco_temporal: "SIM", reforma_tributaria: "SIM", arcabouco_fiscal: "SIM" } },
];

const VOTE_STYLE = {
  SIM: { bg: "#EAF2EC", fg: "#2F6B4F", border: "#2F6B4F" },
  NAO: { bg: "#F6EAE7", fg: "#A23B2E", border: "#A23B2E" },
  ABST: { bg: "#F5EEDD", fg: "#96731B", border: "#96731B" },
  AUSENTE: { bg: "#EFEEEA", fg: "#7A7A73", border: "#7A7A73" },
};

function VoteBadge({ code }) {
  const s = VOTE_STYLE[code];
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        borderRadius: 3,
        padding: "3px 8px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {VOTO[code]}
    </span>
  );
}

export default function App() {
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("TODOS");
  const [partido, setPartido] = useState("TODOS");
  const [selecionado, setSelecionado] = useState(null);

  const ufs = useMemo(() => ["TODOS", ...new Set(DEPUTADOS.map((d) => d.uf))].sort(), []);
  const partidos = useMemo(() => ["TODOS", ...new Set(DEPUTADOS.map((d) => d.partido))].sort(), []);

  const filtrados = DEPUTADOS.filter((d) => {
    const passaBusca = d.nome.toLowerCase().includes(busca.toLowerCase());
    const passaUf = uf === "TODOS" || d.uf === uf;
    const passaPartido = partido === "TODOS" || d.partido === partido;
    return passaBusca && passaUf && passaPartido;
  });

  return (
    <div style={{ background: "#F5F3EE", minHeight: "100%", fontFamily: "Georgia, 'Times New Roman', serif", color: "#1B2733" }}>
      {/* Faixa de aviso de demonstração */}
      <div style={{ background: "#1B2733", color: "#F5F3EE", padding: "8px 20px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12.5, textAlign: "center" }}>
        Protótipo de demonstração — todos os nomes, partidos e votos abaixo são fictícios.
      </div>

      {/* Masthead */}
      <header style={{ borderBottom: "3px double #1B2733", padding: "28px 20px 18px", maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, letterSpacing: 1, color: "#7A7A73", marginBottom: 6 }}>
          Câmara dos Deputados · 57ª Legislatura · Eleições 2026
        </div>
        <h1 style={{ fontSize: 34, margin: 0, fontWeight: 700, lineHeight: 1.15 }}>
          Como seu deputado votou
        </h1>
        <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 14.5, color: "#3D4753", maxWidth: 620, marginTop: 10, lineHeight: 1.5 }}>
          Registro factual dos votos de deputados federais em candidatura à reeleição, em cinco votações
          de grande repercussão desta legislatura. Sem opinião, sem qualificação — só o placar.
        </p>
      </header>

      {/* Legenda das votações */}
      <section style={{ maxWidth: 1040, margin: "0 auto", padding: "20px 20px 0" }}>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12.5, color: "#7A7A73", marginBottom: 10 }}>
          As cinco votações
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {VOTACOES.map((v) => (
            <div key={v.id} style={{ borderLeft: "3px solid #1B2733", paddingLeft: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{v.titulo}</div>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12.5, color: "#3D4753", marginTop: 3, lineHeight: 1.4 }}>
                {v.resumo}
              </div>
              <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 11, color: "#96876B", marginTop: 4 }}>
                {v.data}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filtros */}
      <section style={{ maxWidth: 1040, margin: "0 auto", padding: "26px 20px 0", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar deputado pelo nome..."
            style={{ flex: "1 1 240px", padding: "9px 12px", border: "1px solid #C9C4B4", borderRadius: 3, fontSize: 13.5, background: "#fff" }}
          />
          <select value={uf} onChange={(e) => setUf(e.target.value)} style={{ padding: "9px 10px", border: "1px solid #C9C4B4", borderRadius: 3, fontSize: 13.5, background: "#fff" }}>
            {ufs.map((u) => (
              <option key={u} value={u}>{u === "TODOS" ? "Todos os estados" : u}</option>
            ))}
          </select>
          <select value={partido} onChange={(e) => setPartido(e.target.value)} style={{ padding: "9px 10px", border: "1px solid #C9C4B4", borderRadius: 3, fontSize: 13.5, background: "#fff" }}>
            {partidos.map((p) => (
              <option key={p} value={p}>{p === "TODOS" ? "Todos os partidos" : p}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 12, color: "#7A7A73", marginTop: 8 }}>
          {filtrados.length} de {DEPUTADOS.length} deputados (fictícios) exibidos
        </div>
      </section>

      {/* Tabela */}
      <section style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 20px 40px" }}>
        <div style={{ overflowX: "auto", border: "1px solid #E1DDCF", borderRadius: 4, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1B2733" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>Deputado</th>
                {VOTACOES.map((v) => (
                  <th key={v.id} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600, minWidth: 130 }}>
                    {v.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((d, i) => (
                <tr
                  key={d.nome}
                  onClick={() => setSelecionado(d)}
                  style={{
                    borderBottom: "1px solid #EFEBDF",
                    background: i % 2 ? "#FBFAF6" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                    {d.nome}
                    <div style={{ fontWeight: 400, color: "#7A7A73", fontSize: 12 }}>{d.partido}-{d.uf}</div>
                  </td>
                  {VOTACOES.map((v) => (
                    <td key={v.id} style={{ padding: "10px 12px" }}>
                      <VoteBadge code={d.votos[v.id]} />
                    </td>
                  ))}
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={VOTACOES.length + 1} style={{ padding: 24, textAlign: "center", color: "#7A7A73" }}>
                    Nenhum deputado encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Painel de detalhe */}
      {selecionado && (
        <div
          onClick={() => setSelecionado(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(27,39,51,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#F5F3EE", maxWidth: 460, width: "100%", borderRadius: 6, padding: 26, fontFamily: "Helvetica, Arial, sans-serif" }}
          >
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700 }}>{selecionado.nome}</div>
            <div style={{ color: "#7A7A73", fontSize: 13, marginTop: 2, marginBottom: 16 }}>{selecionado.partido}-{selecionado.uf} · dado fictício</div>
            {VOTACOES.map((v) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #E1DDCF" }}>
                <span style={{ fontSize: 13 }}>{v.titulo}</span>
                <VoteBadge code={selecionado.votos[v.id]} />
              </div>
            ))}
            <button
              onClick={() => setSelecionado(null)}
              style={{ marginTop: 18, padding: "8px 16px", border: "1px solid #1B2733", background: "transparent", borderRadius: 3, fontSize: 13, cursor: "pointer" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <footer style={{ borderTop: "1px solid #E1DDCF", padding: "18px 20px", maxWidth: 1040, margin: "0 auto", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 11.5, color: "#96876B" }}>
        Fonte pretendida para a versão real: Dados Abertos da Câmara dos Deputados (dadosabertos.camara.leg.br) e Repositório de Dados Eleitorais do TSE. Dados nesta tela são apenas ilustrativos.
      </footer>
    </div>
  );
}
