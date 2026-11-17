import { useEffect, useRef, useState, type FormEvent } from "react";
import { libraryRequest, validPage, type Page } from "./api";
type Reader = { id:string; nome:string; email?:string; ra:string|null; curso:string|null; ativo:boolean; habilitado:boolean; versao:number };
const blank = { nome:"",email:"",password:"",ra:"",curso:"" };
export default function Readers({ own = false }: { own?:boolean }) {
  const [items,setItems] = useState<Page<Reader>>({items:[],total:0,pagina:1,limite:10});
  const [profile,setProfile] = useState<Reader|null>(null),[selected,setSelected] = useState<Reader|null>(null);
  const [search,setSearch] = useState(""),[query,setQuery] = useState(""),[page,setPage] = useState(1),[revision,setRevision] = useState(0);
  const [error,setError] = useState(""),[notice,setNotice] = useState(""),[loading,setLoading] = useState(true),[busy,setBusy] = useState(false),[creating,setCreating] = useState(false);
  const [form,setForm] = useState(blank);
  const pending=useRef(false);
  useEffect(() => {
    let active=true;setLoading(true);setError("");setProfile(null);setItems({items:[],total:0,pagina:page,limite:10});
    (own ? libraryRequest<Reader>('/meu-perfil') : libraryRequest<Page<Reader>>(`/leitores?q=${encodeURIComponent(query)}&pagina=${page}`).then(validPage<Reader>))
      .then((data) => { if(active) { if(own) setProfile(data as Reader);else setItems(data as Page<Reader>); } })
      .catch((e:Error) => { if(active) setError(e.message); }).finally(() => { if(active) setLoading(false); });
    return () => { active=false; };
  },[own,query,page,revision]);
  async function run(action:()=>Promise<unknown>) {
    if(pending.current)return;pending.current=true;setBusy(true);setError("");setNotice("");
    try { await action();setNotice('Alteração confirmada pela biblioteca.');setRevision((v)=>v+1); }
    catch(e) { setError(e instanceof Error?e.message:'Operação não concluída.'); }
    finally {pending.current=false;setBusy(false);}
  }
  function save(e:FormEvent) {
    e.preventDefault();void run(async()=>{
      if(selected) await libraryRequest(`/leitores/${selected.id}`,'PUT',{nome:selected.nome,ra:selected.ra,curso:selected.curso,habilitado:selected.habilitado,versao:selected.versao});
      else await libraryRequest('/leitores','POST',form);
      setSelected(null);setCreating(false);setForm(blank);
    });
  }
  const Heading = own?'h2':'h1';
  return <section className="library-view" aria-label={own?'Meu perfil de leitor':'Gestão de leitores'}>
    <Heading className="page-title" tabIndex={-1}>{own?'Meu perfil':'Leitores'}</Heading>
    <p>Conta de acesso e ficha acadêmica são reutilizadas. A habilitação na biblioteca não muda perfil ou senha.</p>
    {!own && <><form className="library-fields" onSubmit={(e)=>{e.preventDefault();setPage(1);setQuery(search);}}><label>Nome ou RA<input value={search} maxLength={200} onChange={(e)=>setSearch(e.target.value)}/></label><button className="outline-button">Pesquisar leitores</button></form><button className="primary-button" onClick={()=>{setCreating(true);setSelected(null);}}>Cadastrar leitor aluno</button></>}
    {loading&&<p role="status">Carregando leitores…</p>}{error&&<p role="alert">{error} <button className="outline-button" onClick={()=>setRevision((v)=>v+1)}>Tentar novamente</button></p>}{notice&&<p role="status">{notice}</p>}
    {own&&profile&&<dl><dt>Nome</dt><dd>{profile.nome}</dd><dt>E-mail da conta</dt><dd>{profile.email}</dd><dt>RA</dt><dd>{profile.ra||'Não informado'}</dd><dt>Curso</dt><dd>{profile.curso||'Não informado'}</dd><dt>Vínculo</dt><dd>{profile.ativo&&profile.habilitado?'Habilitado':'Não habilitado'}</dd></dl>}
    {!own&&!loading&&!error&&!items.total&&<p>Nenhum leitor encontrado.</p>}
    {!own&&<><ul className="library-list">{items.items.map((r)=><li className="simple-page-card" key={r.id}><h2>{r.nome}</h2><p>RA: {r.ra||'Não informado'} · Curso: {r.curso||'Não informado'} · {r.ativo&&r.habilitado?'Habilitado':'Não habilitado'}</p><button className="outline-button" onClick={()=>setSelected({...r})}>Editar leitor {r.nome}</button></li>)}</ul><div className="library-actions"><button className="outline-button" disabled={page===1||loading} onClick={()=>setPage(page-1)}>Página anterior de leitores</button><span>{page} · {items.total} leitores</span><button className="outline-button" disabled={page*10>=items.total||loading} onClick={()=>setPage(page+1)}>Próxima página de leitores</button></div></>}
    {!own&&(creating||selected)&&<form className="simple-page-card" onSubmit={save}><h2>{selected?'Atualizar ficha':'Novo leitor aluno'}</h2><div className="library-fields">
      {(['nome',...(selected?[]:['email','password']),'ra','curso'] as (keyof typeof blank)[]).map((key)=><label key={key}>{({nome:'Nome',email:'E-mail',password:'Senha inicial: 15–128 caracteres',ra:'RA opcional',curso:'Curso opcional'})[key]}<input type={key==='password'?'password':key==='email'?'email':'text'} required={['nome','email','password'].includes(key)} autoComplete={key==='password'?'new-password':'off'} value={selected?(selected[key as 'nome'|'ra'|'curso']||''):form[key]} onChange={(e)=>selected?setSelected({...selected,[key]:e.target.value}):setForm({...form,[key]:e.target.value})}/></label>)}
      {selected&&<label><input type="checkbox" checked={selected.habilitado} onChange={(e)=>setSelected({...selected,habilitado:e.target.checked})}/>Habilitado para circulação</label>}</div>
      <button className="primary-button" disabled={busy}>Salvar leitor</button><button className="outline-button" type="button" disabled={busy} onClick={()=>{setCreating(false);setSelected(null);setForm(blank);}}>Cancelar ficha</button></form>}
  </section>;
}
