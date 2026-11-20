export default function Unavailable({title}:{title:string}){
 return <section className="library-view"><h1 className="page-title" tabIndex={-1}>{title}</h1><p>Esta funcionalidade institucional ainda não está implementada. Nenhuma ação ou relatório foi gerado.</p><p>Consulte Visão geral para indicadores reais de estoque e circulação. Preferências visuais continuam disponíveis em Configurações.</p></section>;
}
