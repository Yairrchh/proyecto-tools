export interface ToolConfig {
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  steps: string[];
  faq: { question: string; answer: string }[];
}

const commonSteps = [
  'Arrastra tus imágenes a la zona de arriba o pulsa para seleccionarlas.',
  'Elige el nivel de compresión: alta calidad, equilibrada o máxima compresión.',
  'Descarga cada imagen o todas juntas en un ZIP.',
];

const privacyFaq = {
  question: '¿Se suben mis imágenes a algún servidor?',
  answer:
    'No. La compresión se hace directamente en tu navegador, así que tus imágenes no salen de tu dispositivo.',
};

const metadataFaq = {
  question: '¿Se conservan los datos EXIF como la ubicación o la cámara?',
  answer:
    'Al comprimir JPG y WebP se eliminan los metadatos, incluida la ubicación GPS. Es una ventaja si vas a compartir la foto.',
};

export const HOME_TOOL: ToolConfig = {
  slug: '',
  h1: 'Comprime tus imágenes gratis',
  title: 'Comprimir imágenes online (JPG, PNG, WebP) gratis',
  description:
    'Reduce el peso de tus imágenes JPG, PNG y WebP en segundos, gratis, sin registro y sin subir tus archivos: todo se procesa en tu navegador.',
  intro: 'Reduce el peso de tus JPG, PNG y WebP en segundos, sin registrarte y sin subir nada.',
  steps: commonSteps,
  faq: [
    privacyFaq,
    {
      question: '¿Qué formatos puedo comprimir?',
      answer: 'JPG, PNG y WebP, hasta 25 MB por imagen y 20 imágenes a la vez.',
    },
    {
      question: '¿Cuánto se reduce el tamaño?',
      answer:
        'Depende de la imagen y del nivel elegido. En fotos JPG es habitual ahorrar más de la mitad del peso sin diferencias visibles.',
    },
    metadataFaq,
  ],
};

export const FORMAT_TOOLS: ToolConfig[] = [
  {
    slug: 'comprimir-jpg',
    h1: 'Comprimir JPG online gratis',
    title: 'Comprimir JPG online gratis y sin subir archivos',
    description:
      'Reduce el tamaño de tus fotos JPG online, gratis y sin registro. Se comprimen en tu navegador, así que tus imágenes no salen de tu dispositivo.',
    intro: 'Reduce el peso de tus fotos JPG para enviarlas por WhatsApp o correo, o para subirlas a tu web.',
    steps: commonSteps,
    faq: [
      privacyFaq,
      {
        question: '¿Se nota la pérdida de calidad al comprimir un JPG?',
        answer:
          'Con la calidad equilibrada la diferencia es prácticamente invisible en la mayoría de las fotos. Puedes probar los tres niveles y comparar el tamaño resultante.',
      },
      {
        question: '¿Cómo reducir un JPG para enviarlo por WhatsApp o correo?',
        answer:
          'Sube la foto, elige "Máxima compresión" y descárgala. Suele bajar a una fracción del tamaño original.',
      },
      metadataFaq,
    ],
  },
  {
    slug: 'comprimir-png',
    h1: 'Comprimir PNG online gratis',
    title: 'Comprimir PNG online gratis, sin perder calidad',
    description:
      'Optimiza tus imágenes PNG online sin perder calidad, gratis y sin registro. Todo se procesa en tu navegador y no subes ningún archivo.',
    intro: 'Optimiza tus PNG sin pérdida de calidad: mismos píxeles, menos peso.',
    steps: commonSteps,
    faq: [
      privacyFaq,
      {
        question: '¿Comprimir un PNG reduce su calidad?',
        answer:
          'No. Los PNG se optimizan sin pérdida: la imagen es idéntica píxel a píxel, solo cambia cómo se guarda.',
      },
      {
        question: '¿Por qué mi PNG casi no se reduce?',
        answer:
          'El ahorro en PNG suele ser menor que en JPG, sobre todo en fotografías o si la imagen ya estaba optimizada. En ese caso se conserva el original.',
      },
    ],
  },
  {
    slug: 'comprimir-webp',
    h1: 'Comprimir WebP online gratis',
    title: 'Comprimir WebP online gratis y privado',
    description:
      'Reduce el tamaño de tus imágenes WebP online, gratis y sin registro. La compresión ocurre en tu navegador: tus archivos no se suben a ningún servidor.',
    intro: 'Reduce aún más el peso de tus imágenes WebP, directamente en tu navegador.',
    steps: commonSteps,
    faq: [
      privacyFaq,
      {
        question: '¿Se puede comprimir un WebP que ya es ligero?',
        answer:
          'Sí, pero el ahorro será menor. Si no se consigue reducir, se conserva el original para que nunca pese más.',
      },
      {
        question: '¿Qué nivel de compresión me conviene?',
        answer:
          'Para web, "Equilibrada" suele ser suficiente. Si necesitas el archivo más pequeño posible, prueba "Máxima compresión".',
      },
      metadataFaq,
    ],
  },
];

export function getToolBySlug(slug: string): ToolConfig | undefined {
  return FORMAT_TOOLS.find((t) => t.slug === slug);
}
