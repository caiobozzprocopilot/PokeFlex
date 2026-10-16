import type { Page } from '../store/ui'

// Histórico de novidades mostrado na tela "Novidades". A versão mais nova fica no topo.
// Prints: public/updates/<nome>.webp (1280x800, modo demonstração).

export type UpdateAction = { label: string; page?: Page; scan?: boolean }

export type UpdateItem = {
  title: string
  body: string
  image?: string
  tip?: string
  action?: UpdateAction
}

export type Release = {
  version: string
  date: string
  title: string
  intro: string
  items: UpdateItem[]
}

export const RELEASES: Release[] = [
  {
    version: '0.5',
    date: '2026-10-16',
    title: 'Tela de Novidades',
    intro: 'Agora você sempre sabe o que mudou no PokeFlex e como aproveitar.',
    items: [
      {
        title: 'Novidades com prints e dicas',
        body: 'Cada atualização aparece aqui com prints das telas, explicação e um atalho para experimentar na hora.',
        image: '/updates/novidades.webp',
        tip: 'Quando sair algo novo, o ícone de brilho no topo ganha um pontinho amarelo. Toque nos prints para ver em tamanho grande.',
      },
    ],
  },
  {
    version: '0.4',
    date: '2026-10-16',
    title: 'Câmera e app no celular',
    intro: 'Agora dá para adicionar cartas fotografando e instalar o PokeFlex como um app.',
    items: [
      {
        title: 'Escaneie cartas com a câmera',
        body: 'Aponte a câmera para a carta, toque no botão e o PokeFlex encontra qual é entre quase 20 mil cartas, com set e número. Toque na certa e ela já abre pronta para adicionar.',
        image: '/updates/camera-resultado.webp',
        tip: 'Um fundo liso e escuro e luz sem reflexo deixam o reconhecimento mais certeiro. Funciona até com a carta de cabeça para baixo ou um pouco torta. Se aparecer “Qual destas é a sua?”, é só escolher entre as candidatas.',
        action: { label: 'Abrir a câmera', scan: true },
      },
      {
        title: 'Instale o PokeFlex como app',
        body: 'O PokeFlex ganhou ícone de Pokébola e abre em tela cheia, como um app. A casca do app e as imagens que você já viu ficam guardadas, então ele abre rápido mesmo com internet fraca.',
        tip: 'No Android e no computador, use o botão “Instalar app” no menu ou no Perfil. No iPhone, abra no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.',
      },
    ],
  },
  {
    version: '0.3',
    date: '2026-10-16',
    title: 'Seu perfil, suas vitrines',
    intro: 'O perfil ficou com a sua cara: foto, vitrines montadas por você e a carta mais valiosa em destaque.',
    items: [
      {
        title: 'Foto de perfil e nome',
        body: 'Toque na sua foto no Perfil para trocar a imagem e o nome de treinador. Ela aparece no topo do app e na intro da Pokédex.',
        image: '/updates/perfil.webp',
        tip: 'Recortamos o centro da imagem em quadrado, então prefira uma foto com o rosto (ou a carta) no meio.',
        action: { label: 'Ir para o Perfil', page: 'perfil' },
      },
      {
        title: 'Vitrines personalizadas',
        body: 'Monte vitrines com as cartas que você mais gosta, na ordem que quiser e com o estilo de giro preferido. A vitrine principal é a que gira no Início.',
        image: '/updates/vitrine-editor.webp',
        tip: 'Use as setas para mudar a ordem. O estilo Órbita deixa todas as cartas sempre viradas para você; o Cilindro curva as cartas em volta.',
        action: { label: 'Montar uma vitrine', page: 'perfil' },
      },
      {
        title: 'Sua carta mais valiosa em destaque',
        body: 'O Início e o Perfil mostram a carta que mais vale por cópia, com preço em reais, variação da semana e quanto você pagou.',
        image: '/updates/inicio-destaque.webp',
        tip: 'O valor já considera a condição que você informou: uma carta “Jogada” vale menos que a mesma em “Near Mint”.',
        action: { label: 'Ver no Início', page: 'inicio' },
      },
    ],
  },
  {
    version: '0.2',
    date: '2026-10-15',
    title: 'Quanto vale sua coleção',
    intro: 'Acompanhe o valor da coleção, o que falta para completar cada set e as cartas que você quer.',
    items: [
      {
        title: 'Página Valor',
        body: 'Veja quanto sua coleção vale hoje, as cartas que mais subiram e caíram, as mais valiosas e quanto você ganhou sobre o que pagou.',
        image: '/updates/valor.webp',
        tip: 'O gráfico de histórico ganha um ponto por dia em que você abre o PokeFlex. Quanto mais você usa, mais completa fica a linha.',
        action: { label: 'Ver meu valor', page: 'valor' },
      },
      {
        title: 'Lista de desejos com preço-alvo',
        body: 'Toque em “Quero esta” em qualquer carta e defina um preço-alvo. Quando o preço cair até ele, a carta fica verde e o menu avisa.',
        image: '/updates/desejos.webp',
        tip: 'Use “Selecionar” para remover vários desejos de uma vez, ou toque em “Já abaixo do alvo” para separar só as oportunidades.',
        action: { label: 'Abrir desejos', page: 'desejos' },
      },
      {
        title: 'Quanto falta para completar o set',
        body: 'Na Coleção, “Quanto falta pra completar?” lista as cartas que faltam, do preço mais alto ao mais baixo, com o custo total estimado.',
        image: '/updates/completar-set.webp',
        tip: '“Todas para os desejos” manda todas as cartas que faltam para a lista de desejos de uma vez.',
        action: { label: 'Abrir a Coleção', page: 'colecao' },
      },
    ],
  },
  {
    version: '0.1',
    date: '2026-10-15',
    title: 'Primeira versão',
    intro: 'O começo do PokeFlex: a intro da Pokédex, todas as cartas oficiais e preços em reais.',
    items: [
      {
        title: 'Intro da Pokédex',
        body: 'O PokeFlex abre com a Pokédex ligando. Se você já entrou antes, ela reconhece você e entra direto, sem pedir senha.',
        image: '/updates/intro-reconhecido.webp',
        tip: 'Toque em “Ligar a Pokédex” para ouvir o som da intro. Com pressa? “Pular intro” vai direto ao ponto.',
      },
      {
        title: 'Preço de mercado em reais',
        body: 'Toque em qualquer carta para ver o preço do Cardmarket e do TCGplayer convertido para reais, com a variação recente.',
        image: '/updates/carta-preco.webp',
        tip: 'Cada variante (Normal, Holo, Reverse holo, 1ª edição) tem preço próprio: toque nelas para comparar.',
        action: { label: 'Explorar a Coleção', page: 'colecao' },
      },
      {
        title: 'Adicione cartas com todos os detalhes',
        body: 'Informe variante, condição, idioma, quantidade, se é graduada e quanto pagou. O valor estimado aparece na hora.',
        image: '/updates/carta-adicionar.webp',
        tip: 'Preencher “Quanto você pagou?” faz o PokeFlex mostrar quanto cada carta valorizou.',
      },
      {
        title: 'Busca em todas as coleções',
        body: 'Digite o nome de um Pokémon e veja todas as versões dele em todos os sets, das mais novas às mais antigas.',
        image: '/updates/busca.webp',
        tip: 'Aperte “/” em qualquer tela para ir direto à busca. Os nomes da base estão em inglês (ex.: “Charizard”, “Professor”).',
        action: { label: 'Buscar uma carta', page: 'busca' },
      },
    ],
  },
]

export const LATEST_VERSION = RELEASES[0].version
