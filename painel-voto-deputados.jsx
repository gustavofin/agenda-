import React, { useMemo, useState } from "react";
import candidatosData from "./dados/candidatos_2026.json";
import deputadosData from "./dados/deputados.json";
import votacoesData from "./dados/votacoes.json";
import votosData from "./dados/votos.json";

const VOTACOES = votacoesData.map((votacao) => ({
  id: votacao.apelido,
  titulo: votacao.apelido,
  resumo: votacao.descricao || "Votação nominal registrada pela Câmara dos Deputados.",
  data: votacao.data,
}));

const VOTO = {
  SIM: "Sim",
  NAO: "Não",
  ABST: "Abstenção",
  AUSENTE: "Ausente",
  OBSTRUCAO: "Obstrução",
  ARTIGO_17: "Artigo 17",
  REGISTRADO: "Registrado",
  SEM_MANDATO: "Sem mandato atual",
};

function normalizarVoto(tipoVoto) {
  const tipo = (tipoVoto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (tipo === "sim") return "SIM";
  if (tipo === "nao") return "NAO";
  if (tipo.includes("abst")) return "ABST";
  if (tipo.includes("obstrucao")) return "OBSTRUCAO";
  if (tipo.includes("artigo 17")) return "ARTIGO_17";
  return "REGISTRADO";
}

function montarDeputados() {
  const votosPorProjeto = Object.fromEntries(
    Object.entries(votosData).map(([apelido, votos]) => [
      apelido,
      new Map(votos.map((registro) => [registro.deputado_?.id, normalizarVoto(registro.tipoVoto)])),
    ]),
  );

  const deputadoPorId = new Map(deputadosData.map((deputado) => [deputado.id, deputado]));

  return candidatosData.map((candidato) => {
    const deputado = candidato.idDeputado ? deputadoPorId.get(candidato.idDeputado) : null;
    return {
      id: candidato.idDeputado || candidato.NR_CPF_CANDIDATO || candidato.NR_CANDIDATO,
      nome: candidato.NM_URNA_CANDIDATO || candidato.NM_CANDIDATO,
      nomeCompleto: candidato.NM_CANDIDATO,
      partido: candidato.SG_PARTIDO,
      uf: candidato.SG_UF,
      numero: candidato.NR_CANDIDATO,
      urlFoto: deputado?.urlFoto,
      temMandatoAtual: candidato.temMandatoAtual,
      votos: Object.fromEntries(
        VOTACOES.map((votacao) => [
          votacao.id,
          candidato.temMandatoAtual
            ? votosPorProjeto[votacao.id]?.get(candidato.idDeputado) || "AUSENTE"
            : "SEM_MANDATO",
        ]),
      ),
    };
  });
}

const DEPUTADOS = montarDeputados();

const VOTE_STYLE = {
  SIM: { bg: "#EAF2EC", fg: "#2F6B4F", border: "#2F6B4F" },
  NAO: { bg: "#F6EAE7", fg: "#A23B2E", border: "#A23B2E" },
  ABST: { bg: "#F5EEDD", fg: "#96731B", border: "#96731B" },
  AUSENTE: { bg: "#EFEEEA", fg: "#7A7A73", border: "#7A7A73" },
  OBSTRUCAO: { bg: "#E9EEF2", fg: "#426278", border: "#426278" },
  ARTIGO_17: { bg: "#E9EEF2", fg: "#426278", border: "#426278" },
  REGISTRADO: { bg: "#E9EEF2", fg: "#426278", border: "#426278" },
  SEM_MANDATO: { bg: "#F5F3EE", fg: "#7A7A73", border: "#C9C4B4" },
};

function VoteBadge({ code }) {
  const s = VOTE_STYLE[code] || VOTE_STYLE.REGISTRADO;
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
      {VOTO[code] || "Registrado"}
    </span>
  );
}

export default function App() {
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("TODOS");
  const [partido, setPartido] = useState("TODOS");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 40;

  const ufs = useMemo(() => ["TODOS", ...new Set(DEPUTADOS.map((d) => d.uf))].sort(), []);
  const partidos = useMemo(() => ["TODOS", ...new Set(DEPUTADOS.map((d) => d.partido))].sort(), []);

  const filtrados = DEPUTADOS.filter((d) => {
    const termo = busca.toLowerCase();
    const passaBusca = [d.nome, d.nomeCompleto, d.partido, d.uf, d.numero].some((valor) =>
      String(valor || "").toLowerCase().includes(termo),
    );
    const passaUf = uf === "TODOS" || d.uf === uf;
    const passaPartido = partido === "TODOS" || d.partido === partido;
    const passaMandato = mostrarTodos || d.temMandatoAtual;
    return passaBusca && passaUf && passaPartido && passaMandato;
  });
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const deputadosDaPagina = filtrados.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA,
  );

  return (
    <div style={{ background: "#F5F3EE", minHeight: "100%", fontFamily: "Georgia, 'Times New Roman', serif", color: "#1B2733" }}>
      <div style={{ background: "#1B2733", color: "#F5F3EE", padding: "8px 20px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12.5, textAlign: "center" }}>
        Dados Abertos da Câmara dos Deputados · 57ª Legislatura
      </div>

      {/* Masthead */}
      <header style={{ borderBottom: "3px double #1B2733", padding: "28px 20px 18px", maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, letterSpacing: 1, color: "#7A7A73", marginBottom: 6 }}>
          Câmara dos Deputados · 57ª Legislatura
        </div>
        <h1 style={{ fontSize: 34, margin: 0, fontWeight: 700, lineHeight: 1.15 }}>
          Como seu deputado votou
        </h1>
        <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 14.5, color: "#3D4753", maxWidth: 620, marginTop: 10, lineHeight: 1.5 }}>
          Registro factual dos votos de deputados federais em nove votações de grande repercussão.
          Sem opinião, sem qualificação — só o placar.
        </p>
      </header>

      {/* Legenda das votações */}
      <section style={{ maxWidth: 1040, margin: "0 auto", padding: "20px 20px 0" }}>
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12.5, color: "#7A7A73", marginBottom: 10 }}>
          As nove votações
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
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar nome, partido, UF ou número..."
            style={{ flex: "1 1 240px", padding: "9px 12px", border: "1px solid #C9C4B4", borderRadius: 3, fontSize: 13.5, background: "#fff" }}
          />
          <select value={uf} onChange={(e) => { setUf(e.target.value); setPagina(1); }} style={{ padding: "9px 10px", border: "1px solid #C9C4B4", borderRadius: 3, fontSize: 13.5, background: "#fff" }}>
            {ufs.map((u) => (
              <option key={u} value={u}>{u === "TODOS" ? "Todos os estados" : u}</option>
            ))}
          </select>
          <select value={partido} onChange={(e) => { setPartido(e.target.value); setPagina(1); }} style={{ padding: "9px 10px", border: "1px solid #C9C4B4", borderRadius: 3, fontSize: 13.5, background: "#fff" }}>
            {partidos.map((p) => (
              <option key={p} value={p}>{p === "TODOS" ? "Todos os partidos" : p}</option>
            ))}
          </select>
          <select value={mostrarTodos ? "TODOS" : "MANDATO"} onChange={(e) => { setMostrarTodos(e.target.value === "TODOS"); setPagina(1); }} style={{ padding: "9px 10px", border: "1px solid #C9C4B4", borderRadius: 3, fontSize: 13.5, background: "#fff" }}>
            <option value="MANDATO">Só deputados atuais</option>
            <option value="TODOS">Mostrar todos os candidatos</option>
          </select>
        </div>
        <div style={{ fontSize: 12, color: "#7A7A73", marginTop: 8 }}>
          {filtrados.length} de {DEPUTADOS.length} candidatos exibidos
        </div>
      </section>

      {/* Tabela */}
      <section style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 20px 40px" }}>
        <div style={{ overflowX: "auto", border: "1px solid #E1DDCF", borderRadius: 4, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1B2733" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>Candidato</th>
                {VOTACOES.map((v) => (
                  <th key={v.id} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600, minWidth: 130 }}>
                    {v.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deputadosDaPagina.map((d, i) => (
                <tr
                  key={`${d.id}-${d.numero}`}
                  onClick={() => setSelecionado(d)}
                  style={{
                    borderBottom: "1px solid #EFEBDF",
                    background: i % 2 ? "#FBFAF6" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      {d.urlFoto && <img src={d.urlFoto} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3 }} />}
                      <span>{d.nome}</span>
                    </div>
                    <div style={{ fontWeight: 400, color: "#7A7A73", fontSize: 12 }}>{d.partido}-{d.uf} · nº {d.numero}</div>
                    {!d.temMandatoAtual && <div style={{ fontWeight: 400, color: "#96731B", fontSize: 11, marginTop: 2 }}>Candidato · sem mandato atual</div>}
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
                    Nenhum candidato encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPaginas > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12.5, color: "#7A7A73" }}>
            <span>Página {paginaAtual} de {totalPaginas}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
                disabled={paginaAtual === 1}
                style={{ padding: "7px 12px", border: "1px solid #C9C4B4", background: "#fff", borderRadius: 3, cursor: paginaAtual === 1 ? "default" : "pointer" }}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}
                disabled={paginaAtual === totalPaginas}
                style={{ padding: "7px 12px", border: "1px solid #C9C4B4", background: "#fff", borderRadius: 3, cursor: paginaAtual === totalPaginas ? "default" : "pointer" }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
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
            {selecionado.urlFoto && (
              <img src={selecionado.urlFoto} alt={`Foto de ${selecionado.nome}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 3, marginBottom: 12 }} />
            )}
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700 }}>{selecionado.nome}</div>
            <div style={{ color: "#7A7A73", fontSize: 13, marginTop: 2, marginBottom: 4 }}>{selecionado.partido}-{selecionado.uf} · nº {selecionado.numero}</div>
            <div style={{ color: selecionado.temMandatoAtual ? "#2F6B4F" : "#96731B", fontSize: 12, marginBottom: 16 }}>
              {selecionado.temMandatoAtual ? "Deputado atual" : "Candidato · sem mandato atual"}
            </div>
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
        Fonte: Dados Abertos da Câmara dos Deputados (dadosabertos.camara.leg.br). A ausência indica que não há voto individual registrado para aquela votação.
      </footer>
    </div>
  );
}
