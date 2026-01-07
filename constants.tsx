
import { Product } from './types';

export const ASSETS = {
  LOGO: '/assets/logo.png',
  HERO_IMAGE: '/assets/hero.jpg',
  REGISTER_IMAGE: '/assets/register.jpg'
};

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Loção Tônica Capilar',
    price: 109.89,
    originalPrice: 115.68,
    description: 'Loção tônica que estimula o couro cabeludo e fortalece os fios, promovendo um crescimento saudável.',
    fullDescription: 'A loção tônica auxilia na circulação do couro cabeludo, fortalece e estimula o bulbo capilar.',
    volume: '200ml',
    category: 'Tratamento',
    tags: ['5% OFF', 'Tônico'],
    imageUrl: '/assets/product_locao_tonica.png',
    detailImageUrl: '/assets/detail_locao_tonica.jpg',
    featured: true,
    ingredients: [
      { name: 'Extrato de Açafrão', description: 'anti-inflamatória, antioxidante e antimicrobiana, a cúrcuma contém ferro, manganês, vitamina B6, fibras e potássio. Ajudam na remoção de escamações no couro cabeludo, controle de caspa e queda dos cabelos.' },
      { name: 'Extrato de Jaborandi', description: 'estimulante celular; ativador da produção de secreção; restaurador de tecidos e tônico capilar. Trata a queda do cabelo.' },
      { name: 'Pantenol', description: 'cicatrização e maciez dos fios.' },
      { name: 'Extrato de Aloe Vera', description: 'Ação emoliente, cicatrizante, tonificante, anti-inflamatória, suavizante, lenitiva, refrescante, hidratante, protetora e restauradora de tecidos.' },
      { name: 'Extrato de Arnica Montana', description: 'tem ação adstringente, ativador da circulação periférica, tonificante, descongestionante, anti-inflamatório, antiacne e estimulante do couro cabeludo.' },
      { name: 'Extrato de Ginseng', description: 'Cicatrizante, dermopurificante, descongestionante, e emoliente tendo efeito bioativador, tonificando, hidratando e regenerando os tecidos da pele.' },
      { name: 'Extrato de Graviola', description: 'Fortalecimento dos fios, atuando na caspa e coceira.' },
      { name: 'Extrato de Tomilho', description: 'Fungicida e bactericida.' },
      { name: 'Óleo Abacate', description: 'Proporciona hidratação, brilho e maciez. Ajuda no fortalecimento dos fios estimulando o crescimento, além de diminuir a queda capilar.' },
      { name: 'Óleo de Coco Extra Virgem', description: 'Diminui o frizz e reduz as pontas duplas. Melhora a circulação sanguínea no couro cabeludo, deixando os fios mais fortes e resistentes e auxiliando no crescimento.' }
    ],
    usage: 'Borrife a loção no couro cabeludo e massageie com movimentos circulares. Não é necessário enxágue. Para uso Home Care, borrife em todo couro cabeludo à noite. Agite antes de usar.'
  },
  {
    id: '2',
    name: 'Shampoo Porcelain Hair Care',
    price: 70.90,
    originalPrice: 74.64,
    description: 'Limpeza suave e profunda para fios saudáveis e brilhantes. Fórmula vegana sem sulfatos.',
    fullDescription: 'Porcelain Hair Care é uma linha de tratamento nutritivo e intensivo que proporciona aos fios força, maciez, leveza e brilho intenso. O shampoo deixa o cabelo forte, saudável, atuando na prevenção da queda excessiva e estimulando o crescimento saudável dos fios.',
    volume: '250ml',
    category: 'Limpeza',
    tags: ['5% OFF', 'Vegano'],
    imageUrl: '/assets/product_shampoo.jpg',
    detailImageUrl: '/assets/detail_shampoo.jpg',
    ingredients: [
      { name: 'Extrato de Jaborandi', description: 'é rico em pilocarpina, substância que fortalece os cabelos, evitando a queda, estimulando o crescimento dos fios e recuperando a textura capilar.' },
      { name: 'Extrato de Confrei', description: 'apresenta propriedades cicatrizantes, hidratante e adstringentes.' },
      { name: 'Extrato Alecrim', description: 'ação dermo purificante, tonificante, estimulante celular, antioxidante. Pode ser usado em preparações para o couro cabeludo, estimulando a circulação e o crescimento capilar.' },
      { name: 'Extrato Aloe Vera', description: 'ação emoliente, cicatrizante, tonificante, anti-inflamatória, suavizante, lenitiva, refrescante, hidratante, protetora e restauradora.' },
      { name: 'Extrato de Calêndula', description: 'ação emoliente, tonificante, lenitiva, cicatrizante, suavizante, refrescante, antialergênica, anti-inflamatória, antisséptica, bactericida.' },
      { name: 'Extrato de Ginseng', description: 'atua na prevenção e combate à queda de cabelo, além de estimular o crescimento de fios mais fortes e saudáveis.' },
      { name: 'Extrato de Graviola', description: 'atua no combate a queda de cabelo, pontas duplas a cabelos ásperos e danificados.' },
      { name: 'Lactato de Mentila', description: 'ação adstringente; tônica, estimulante, antiqueda e anticaspa, além de atuar como tônico capilar. Ajuda a eliminar a caspa e a seborreia.' }
    ],
    usage: 'Aplique sobre os cabelos molhados e massageie suavemente. Enxágue. Repita o procedimento se necessário.'
  },
  {
    id: '3',
    name: 'Máscara de Hidratação Capilar',
    price: 92.75,
    originalPrice: 97.64,
    description: 'Tratamento intensivo que nutre, reconstrói e hidrata profundamente a fibra capilar.',
    fullDescription: 'Máscara de tratamento que estimula e fortalece a fibra capilar, além de promover brilho intenso, nutrição e maciez.',
    volume: '220ml',
    category: 'Tratamento',
    tags: ['5% OFF', 'Reconstrução'],
    imageUrl: '/assets/product_mascara.jpg',
    detailImageUrl: '/assets/detail_mascara.jpg',
    ingredients: [
      { name: 'Óleo de Argan', description: 'rico em vitamina E, tendo assim um efeito reparador da fibra dos cabelos, recuperando a elasticidade para fio, evitando também a queda e acrescentando brilho.' },
      { name: 'Óleo de Abacate', description: 'rico em minerais como magnésio e zinco, Vitamina E e algumas do Complexo B. Possui ação antioxidante e anti-inflamatória.' }
    ],
    usage: 'Retirar o excesso de água dos cabelos e aplicar quantidade suficiente das pontas à raiz. Fazer movimentos de enluvamento mecha a mecha, distribuindo bem o produto. Deixar agir por 10 minutos e enxaguar.'
  },
  {
    id: '4',
    name: 'Leave-In Porcelain Vegan',
    price: 75.27,
    originalPrice: 79.24,
    description: 'Finalizador vegano que protege, hidrata e deixa os fios sedosos e brilhantes o dia todo.',
    fullDescription: 'Atua na hidratação e proteção dos cabelos contra agentes externos. Contém ativos que apresentam atividades antioxidantes e atuam na reestruturação da fibra.',
    volume: '200ml',
    category: 'Tratamento',
    tags: ['5% OFF', 'Vegano'],
    imageUrl: '/assets/product_leave_in.jpg',
    detailImageUrl: '/assets/detail_leave_in.jpg',
    ingredients: [
      { name: 'Proteína do Arroz', description: 'é rica em aminoácidos, repara e fortalece a fibra capilar deixando os fios mais encorpados e fortes. Isso evita as quebras e quedas capilares. Ajuda também a manter a cor dos cabelos e a reter a água, mantendo o nível de hidratação.' },
      { name: 'Óleo de Abacate', description: 'ajuda a controlar o frizz e deixar o cabelo mais macio e brilhoso, além de ajudar na restauração das pontas ressecadas. Poderoso hidratante para cabelos secos e fracos.' },
      { name: 'Óleo de Açaí Orgânico', description: 'contém polifenóis, que são poderosos antioxidantes naturais. Os componentes antioxidantes desse óleo tem a capacidade de inibir ou reduzir os processos de oxidação gerados pelos radicais livres. Com eficácia comprovada, mantém a hidratação da pele e reduz a perda de água transepidermal. Este ingrediente, aprovado pela COSMOS, é ideal para produtos de cuidados para a pele.' },
      { name: 'Óleo Essencial de Alecrim', description: 'pode ser usado para tratar cabelos oleosos e também apresenta funções anticaspa e serve como tônico capilar. Costuma acrescentar brilho aos fios.' }
    ],
    usage: 'Após lavar os cabelos com os fios ainda úmidos, aplicar o leave-in no comprimento e pontas do cabelo.'
  },
  {
    id: '5',
    name: 'Condicionador Porcelain Vegan',
    price: 70.90,
    originalPrice: 74.64,
    description: 'Condicionador vegano que sela as cutículas, promovendo desembaraço fácil e maciez extrema.',
    fullDescription: 'O condicionador da linha Porcelain Hair Care é aplicado para todos os tipos de cabelos. Condiciona, hidrata e desembaraça. Sua fórmula nutre e proporciona maciez e brilho intenso.',
    volume: '250ml',
    category: 'Hidratação',
    tags: ['5% OFF', 'Vegano'],
    imageUrl: '/assets/product_condicionador.jpg',
    detailImageUrl: '/assets/detail_condicionador.jpg',
    ingredients: [
      { name: 'Manteiga de Karité', description: 'rico em ácidos graxos e vitaminas A e E. Possui forte ação emoliente com uma ação protetora sobre os cabelos, prevenindo o ressecamento dos fios.' },
      { name: 'Vitamina E', description: 'é um antioxidante natural que bloqueia os radicais livres, evitando o envelhecimento precoce dos cabelos e deixando-os saudáveis e bonitos por mais tempo.' },
      { name: 'Óleo de Argan', description: 'rico em vitamina E, tendo assim um efeito reparador da fibra dos cabelos, recuperando a elasticidade para fio, evitando também a queda e acrescentando brilho.' },
      { name: 'Óleo de Coco Extra Virgem', description: 'é composto por antioxidantes, diminuindo a ação dos radicais livres, além de ser rico em ácidos graxos, vitamina E, Ômega 6 e Ômega 9.' },
      { name: 'Óleo de Abacate', description: 'rico em minerais como magnésio e zinco, Vitamina E e algumas do Complexo B. Possui ação antioxidante e anti-inflamatória.' }
    ],
    usage: 'Aplique sobre os cabelos lavados massageie e deixe agir por um minuto. Enxágue bem. Para melhores resultados, use também o shampoo.'
  },
  {
    id: '6',
    name: 'Kit Completo Porcelain Hair Care',
    price: 419.75,
    originalPrice: 441.84,
    description: 'A rotina completa de cuidados capilares: Shampoo, Condicionador, Máscara, Loção Tônica e Leave-In.',
    fullDescription: 'Kit completo com todos os produtos da linha Porcelain Hair Care para uma rotina completa de tratamento capilar. Inclui Shampoo, Condicionador, Máscara de Hidratação, Loção Tônica e Leave-In.',
    category: 'Tratamento',
    tags: ['5% OFF', 'Kit Completo'],
    imageUrl: '/assets/product_kit_completo.jpg',
    detailImageUrl: '/assets/product_kit_completo.jpg',
    usage: 'Use os produtos na seguinte ordem: 1) Shampoo, 2) Condicionador ou Máscara, 3) Leave-In nos fios úmidos, 4) Loção Tônica no couro cabeludo à noite.'
  }
];
