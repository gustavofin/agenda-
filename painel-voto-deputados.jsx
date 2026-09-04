import React, { useMemo, useState } from "react";
import deputadosData from "./dados/deputados.json";
import votacoesData from "./dados/votacoes.json";
import votosData from "./dados/votos.json";

const CATEGORIAS = {
  sim: { rotulo: "Sim", sigla: "S", cor: "#2F5233", fundo: "#DCE7DD" },
  nao: { rotulo: "Não", sigla: "N", cor: "#7A2E2E", fundo: "#EFDBD9" },
  abstencao: { rotulo: "Abstenção", sigla: "Ab", cor: "#7A5A10", fundo: "#F0E5C9" },
  obstrucao: { rotulo: "Obstrução", sigla: "Ob", cor: "#39506B", fundo: "#DCE3EC" },
  ausente: { rotulo: "Ausente", sigla: "Au", cor: "#5C6169", fundo: "#E4E3DE" },
  outro: { rotulo: "Outro", sigla: "?", cor: "#5C6169", fundo: "#E4E3DE" },
  semDados: { rotulo: "Sem dados", sigla: "—", cor: "#96731B", fundo: "#F2E9D2" },
};

function normalizarCategoria(tipoVoto) {
  if (!tipoVoto) return "outro";
  const t = tipoVoto.trim().toLowerCase();
  if (t === "sim") return "sim";
  if (t === "não" || t === "nao") return "nao";
  if (t === "abstenção" || t === "abstencao" || t === "artigo 17") return "abstencao";
  if (t === "obstrução" || t === "obstrucao") return "obstrucao";
  return "outro";
}

function semAcento(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatarData(iso) {
  if (!iso) return "";
  const partes = iso.split("-");
  if (partes.length !== 3) return iso;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

export default function PainelVotoDeputados() {
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("todas");
  const [partido, setPartido] = useState("todos");
  const [selecionadoId, setSelecionadoId] = useState(null);

  const votacoes = useMemo(() => {
    return votacoesData.map((v) => {
      const registros = votosData[v.apelido] || [];
      const porDeputado = new Map();
      registros.forEach((r) => {
        if (r.deputado_ && r.deputado_.id != null) {
          porDeputado.set(r.deputado_.id, r);
        }
      });
      return { ...v, semDados: registros.length === 0, porDeputado };
    });
  }, []);

  const deputados = useMemo(() => {
    return deputadosData.map((dep) => {
      const votos = {};
      votacoes.forEach((v) => {
        if (v.semDados) {
          votos[v.apelido] = { categoria: "semDados", tipoVotoOriginal: null };
          return;
        }
        const registro = v.porDeputado.get(dep.id);
        votos[v.apelido] = registro
          ? { categoria: normalizarCategoria(registro.tipoVoto), tipoVotoOriginal: registro.tipoVoto }
          : { categoria: "ausente", tipoVotoOriginal: null };
      });
      return { ...dep, votos, concorreReeleicao: null };
    });
  }, [votacoes]);

  const ufs = useMemo(() => Array.from(new Set(deputadosData.map((d) => d.siglaUf))).sort(), []);
  const partidos = useMemo(
    () => Array.from(new Set(deputadosData.map((d) => d.siglaPartido))).sort(),
    []
  );

  const deputadosFiltrados = useMemo(() => {
    const termo = semAcento(busca);
    return deputados.filter((d) => {
      if (termo && !semAcento(d.nome).includes(termo)) return false;
      if (uf !== "todas" && d.siglaUf !== uf) return false;
      if (partido !== "todos" && d.siglaPartido !== partido) return false;
      return true;
    });
  }, [deputados, busca, uf, partido]);

  const votacoesSemDados = votacoes.filter((v) => v.semDados);

  const selecionado = useMemo(
    () => deputados.find((d) => d.id === selecionadoId) || null,
    [deputados, selecionadoId]
  );

  return (
    <div className="pvd-app">
      <style>{CSS}</style>

      <header className="pvd-header">
        <p className="pvd-eyebrow">Diário Oficial do Voto</p>
        <h1>Como seu deputado votou</h1>
        <p className="pvd-subtitulo">
          {deputadosData.length} deputados federais em exercício · {votacoesData.length} votações
          acompanhadas
        </p>
      </header>

      {votacoesSemDados.length > 0 && (
        <div className="pvd-aviso">
          <strong>Aviso:</strong> não encontramos votos individuais registrados para{" "}
          {votacoesSemDados.map((v) => v.apelido).join(", ")}. Pode ser uma votação simbólica/de
          líderes, ou um id de votação incorreto no coletor — nessas colunas os deputados aparecem
          como "Sem dados", e não como "Ausente".
        </div>
      )}

      <div className="pvd-filtros">
        <input
          type="text"
          placeholder="Buscar deputado por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="todas">Todas as UFs</option>
          {ufs.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select value={partido} onChange={(e) => setPartido(e.target.value)}>
          <option value="todos">Todos os partidos</option>
          {partidos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="pvd-contador">
          {deputadosFiltrados.length} de {deputadosData.length} deputados
        </span>
      </div>

      <div className="pvd-legenda">
        {Object.entries(CATEGORIAS)
          .filter(([chave]) => chave !== "outro")
          .map(([chave, c]) => (
            <span key={chave} className="pvd-legenda-item">
              <span className="pvd-badge" style={{ color: c.cor, background: c.fundo }}>
                {c.sigla}
              </span>
              {c.rotulo}
            </span>
          ))}
      </div>

      <div className="pvd-tabela-wrap">
        <table className="pvd-tabela">
          <thead>
            <tr>
              <th className="pvd-col-dep">Deputado</th>
              <th>UF</th>
              <th>Partido</th>
              {votacoes.map((v) => (
                <th key={v.apelido} title={v.descricao || v.apelido}>
                  <span className="pvd-th-apelido">{v.apelido}</span>
                  <span className="pvd-th-data">{formatarData(v.data)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deputadosFiltrados.map((dep) => (
              <tr key={dep.id} className="pvd-linha" onClick={() => setSelecionadoId(dep.id)}>
                <td className="pvd-col-dep">
                  <FotoDeputado dep={dep} tamanho={28} />
                  <span>{dep.nome}</span>
                </td>
                <td>{dep.siglaUf}</td>
                <td>{dep.siglaPartido}</td>
                {votacoes.map((v) => {
                  const voto = dep.votos[v.apelido];
                  const c = CATEGORIAS[voto.categoria] || CATEGORIAS.outro;
                  return (
                    <td key={v.apelido}>
                      <span
                        className="pvd-badge"
                        style={{ color: c.cor, background: c.fundo }}
                        title={voto.tipoVotoOriginal || c.rotulo}
                      >
                        {c.sigla}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {deputadosFiltrados.length === 0 && (
              <tr>
                <td colSpan={3 + votacoes.length} className="pvd-vazio">
                  Nenhum deputado encontrado com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selecionado && (
        <PainelDetalhe
          deputado={selecionado}
          votacoes={votacoes}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}

function FotoDeputado({ dep, tamanho }) {
  const [erro, setErro] = useState(false);
  if (!dep.urlFoto || erro) {
    const iniciais = dep.nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    return (
      <span className="pvd-foto-placeholder" style={{ width: tamanho, height: tamanho }}>
        {iniciais}
      </span>
    );
  }
  return (
    <img
      src={dep.urlFoto}
      alt={dep.nome}
      width={tamanho}
      height={tamanho}
      className="pvd-foto"
      onError={() => setErro(true)}
    />
  );
}

function PainelDetalhe({ deputado, votacoes, onFechar }) {
  return (
    <div className="pvd-overlay" onClick={onFechar}>
      <aside className="pvd-painel" onClick={(e) => e.stopPropagation()}>
        <button className="pvd-fechar" onClick={onFechar} aria-label="Fechar">
          ×
        </button>
        <div className="pvd-painel-cabecalho">
          <FotoDeputado dep={deputado} tamanho={64} />
          <div>
            <h2>{deputado.nome}</h2>
            <p>
              {deputado.siglaPartido} · {deputado.siglaUf}
            </p>
            {deputado.email && <p className="pvd-email">{deputado.email}</p>}
          </div>
        </div>
        <ul className="pvd-painel-lista">
          {votacoes.map((v) => {
            const voto = deputado.votos[v.apelido];
            const c = CATEGORIAS[voto.categoria] || CATEGORIAS.outro;
            return (
              <li key={v.apelido}>
                <div className="pvd-painel-linha-topo">
                  <span className="pvd-badge" style={{ color: c.cor, background: c.fundo }}>
                    {voto.tipoVotoOriginal || c.rotulo}
                  </span>
                  <strong>{v.apelido}</strong>
                  <span className="pvd-painel-data">{formatarData(v.data)}</span>
                </div>
                {v.descricao && <p className="pvd-painel-descricao">{v.descricao}</p>}
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

const CSS = `
.pvd-app {
  --bg: #F5F3EE;
  --ink: #1B2733;
  --gold: #96731B;
  --line: #DCD5C0;
  --card: #FFFFFF;
  --muted: #6B6457;
  background: var(--bg);
  color: var(--ink);
  font-family: Georgia, 'Times New Roman', serif;
  min-height: 100vh;
  padding: 32px 24px 64px;
  box-sizing: border-box;
}
.pvd-app * { box-sizing: border-box; }

.pvd-header { max-width: 1100px; margin: 0 auto 24px; border-bottom: 2px solid var(--ink); padding-bottom: 16px; }
.pvd-eyebrow { text-transform: uppercase; letter-spacing: 0.14em; font-size: 12px; color: var(--gold); margin: 0 0 6px; }
.pvd-header h1 { font-size: 32px; margin: 0 0 6px; font-weight: 400; }
.pvd-subtitulo { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--muted); margin: 0; font-size: 14px; }

.pvd-aviso {
  max-width: 1100px; margin: 0 auto 20px; padding: 12px 16px;
  border-left: 3px solid var(--gold); background: #FBF6E9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px; color: var(--ink); line-height: 1.5;
}

.pvd-filtros {
  max-width: 1100px; margin: 0 auto 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.pvd-filtros input, .pvd-filtros select {
  border: 1px solid var(--line); background: var(--card); color: var(--ink);
  padding: 8px 10px; font-size: 14px; border-radius: 2px;
}
.pvd-filtros input { flex: 1 1 240px; }
.pvd-contador { margin-left: auto; font-size: 13px; color: var(--muted); }

.pvd-legenda {
  max-width: 1100px; margin: 0 auto 12px; display: flex; gap: 16px; flex-wrap: wrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: var(--muted);
}
.pvd-legenda-item { display: inline-flex; align-items: center; gap: 6px; }

.pvd-badge {
  display: inline-block; min-width: 22px; text-align: center; padding: 2px 6px;
  font-size: 11px; font-weight: 600; border-radius: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.pvd-tabela-wrap { max-width: 1100px; margin: 0 auto; overflow-x: auto; border: 1px solid var(--line); background: var(--card); }
.pvd-tabela { border-collapse: collapse; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; }
.pvd-tabela th, .pvd-tabela td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
.pvd-tabela thead th { background: #EDE9DD; font-weight: 600; position: sticky; top: 0; z-index: 1; vertical-align: top; }
.pvd-th-apelido { display: block; max-width: 130px; white-space: normal; font-weight: 600; }
.pvd-th-data { display: block; font-weight: 400; color: var(--muted); font-size: 11px; }
.pvd-col-dep { position: sticky; left: 0; background: var(--card); display: flex; align-items: center; gap: 8px; min-width: 200px; }
.pvd-tabela thead .pvd-col-dep { background: #EDE9DD; }
.pvd-linha { cursor: pointer; }
.pvd-linha:hover td { background: #F6F1E4; }
.pvd-linha:hover .pvd-col-dep { background: #F6F1E4; }
.pvd-vazio { text-align: center; color: var(--muted); padding: 24px; }

.pvd-foto, .pvd-foto-placeholder {
  border-radius: 50%; object-fit: cover; flex-shrink: 0;
}
.pvd-foto-placeholder {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--ink); color: #F5F3EE; font-size: 11px; font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.pvd-overlay {
  position: fixed; inset: 0; background: rgba(27, 39, 51, 0.45); display: flex; justify-content: flex-end; z-index: 10;
}
.pvd-painel {
  width: min(420px, 100%); background: var(--bg); height: 100%; overflow-y: auto; padding: 28px 24px;
  box-shadow: -4px 0 16px rgba(0,0,0,0.12); position: relative;
}
.pvd-fechar {
  position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px;
  color: var(--ink); cursor: pointer; line-height: 1;
}
.pvd-painel-cabecalho { display: flex; gap: 14px; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid var(--ink); }
.pvd-painel-cabecalho h2 { margin: 0 0 4px; font-size: 20px; font-weight: 400; font-family: Georgia, serif; }
.pvd-painel-cabecalho p { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: var(--muted); }
.pvd-email { font-size: 12px !important; }

.pvd-painel-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.pvd-painel-lista li { border-bottom: 1px solid var(--line); padding-bottom: 14px; }
.pvd-painel-linha-topo { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.pvd-painel-linha-topo strong { font-size: 13px; font-weight: 600; flex: 1; }
.pvd-painel-data { font-size: 11px; color: var(--muted); }
.pvd-painel-descricao { margin: 0; font-size: 12px; color: var(--muted); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; }
`;
