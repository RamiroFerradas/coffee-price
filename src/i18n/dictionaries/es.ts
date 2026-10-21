import type { Dictionary } from "./types";

export const es: Dictionary = {
  meta: {
    title: "Quiero Café — Precios de café de especialidad en Argentina",
    description:
      "Compará precios por kilo de café de especialidad de tostadores argentinos: marcas, orígenes y moliendas en un solo lugar, con datos actualizados a diario desde las tiendas de cada tostador.",
    keywords: [
      "café de especialidad",
      "café por kilo",
      "precio café por kilo",
      "tostadores argentinos",
      "comparador de café",
      "café Colombia",
      "café Etiopía",
      "café Brasil",
      "café Bolivia",
      "comprar café especial Argentina",
    ],
    jsonLd: {
      name: "Quiero Café",
      description:
        "Comparador de precios de café de especialidad de tostadores argentinos, con precio por kilo comparable.",
      inLanguage: "es-AR",
    },
  },
  ticker: {
    roasters: (count) => `${count} tostadores`,
    dailyPrices: "precios actualizados todos los días",
    comparablePerKg: "precio por kilo comparable",
    specialtyBlendsGear: "café de especialidad, blends y equipo",
  },
  hero: {
    eyebrow: "Comparador de precios",
    description: (count) =>
      `Precios de café de especialidad de ${count} tostadores argentinos, directo desde sus tiendas.`,
  },
  emptyCatalog: {
    title: "Todavía no hay datos",
    body: "Esperá al próximo scrapeo: los precios se actualizan solos todos los días.",
  },
  footer: {
    description:
      "Los precios se actualizan solos todos los días, directo desde las tiendas de cada tostador, así siempre comparás el último valor por kilo.",
    disclaimer:
      "Quiero Café no vende café ni procesa pagos. Mostramos precios públicos de tiendas de terceros y cada enlace de compra te lleva a la tienda del tostador.",
    links: {
      about: "Sobre el sitio",
      contact: "Contacto",
      privacy: "Privacidad",
      terms: "Términos",
    },
  },
  trust: {
    about: {
      metaTitle:
        "Sobre Quiero Café — Comparador independiente de café de especialidad",
      metaDescription:
        "Qué es Quiero Café, cómo obtiene y normaliza los precios por kilo y por qué es un comparador independiente sin ventas ni pagos.",
      title: "Sobre Quiero Café",
      intro:
        "Quiero Café es un comparador independiente de precios de café de especialidad. Reunimos en un solo lugar los precios públicos de tostadores argentinos para que puedas compararlos por kilo.",
      sections: [
        {
          heading: "Un comparador, no una tienda",
          paragraphs: [
            "No vendemos café, no tenemos carrito ni checkout y no procesamos pagos. Nuestro único trabajo es mostrarte precios y llevarte a la tienda del tostador cuando encontrás algo que te interesa.",
            "No tenemos afiliación comercial con las tiendas que comparamos: no cobramos comisiones por venta ni pagamos por aparecer. Los enlaces salientes van siempre a la tienda oficial de cada tostador.",
          ],
        },
        {
          heading: "Cómo obtenemos los precios",
          paragraphs: [
            "Leemos las páginas públicas de las tiendas de cada tostador y actualizamos el catálogo todos los días. No accedemos a datos privados ni a precios mayoristas.",
            "Para comparar productos de distintos gramajes, normalizamos el precio a un valor por kilo. Es una referencia calculada, no el precio final que cobra la tienda.",
          ],
        },
        {
          heading: "Qué podés esperar",
          paragraphs: [
            "Los precios y la disponibilidad pueden cambiar entre una actualización y otra. Antes de comprar, confirmá el valor final, el stock y las condiciones de envío en la tienda del tostador.",
            "Si encontrás un error o querés sugerir un tostador, escribinos por GitHub: es nuestro único canal de contacto.",
          ],
        },
      ],
    },
    contact: {
      metaTitle: "Contacto — Quiero Café",
      metaDescription:
        "Cómo reportar correcciones, pedir la baja de un tostador o sugerir tiendas de café para el comparador.",
      title: "Contacto",
      intro:
        "Para correcciones, pedidos de baja o sugerencias de tostadores, usá el repositorio público del proyecto. No tenemos formularios, teléfono ni dirección.",
      sections: [
        {
          heading: "GitHub es el único canal",
          paragraphs: [
            "Abrí un issue en el repositorio público y contanos qué encontraste. Ahí también podés pedir que saquemos una tienda o un producto del catálogo.",
            "Usamos ese canal porque deja un registro público y verificable de cada pedido. No inventamos un email de contacto ni un formulario que no podamos atender.",
          ],
        },
        {
          heading: "Qué incluir en el reporte",
          paragraphs: [
            "Si reportás un precio incorrecto, incluí la URL del producto y la tienda. Si pedís una baja, indicá la tienda o el producto y el motivo.",
            "Para sugerir un tostador, mandanos el nombre y la dirección de su tienda. Revisamos que los precios sean públicos y que el catálogo se pueda leer sin cuenta.",
          ],
        },
      ],
    },
    privacy: {
      metaTitle: "Privacidad — Quiero Café",
      metaDescription:
        "Qué datos usa Quiero Café: sin cuentas ni pagos, una cookie funcional de idioma, logs técnicos de Vercel y el catálogo público en Supabase.",
      title: "Privacidad",
      intro:
        "Quiero Café no pide datos personales y no tiene cuentas, carrito, checkout ni pagos. Esta página explica qué información técnica se usa para que el sitio funcione.",
      sections: [
        {
          heading: "No pedimos datos personales",
          paragraphs: [
            "No hay registro, inicio de sesión, newsletter ni formularios de contacto. No solicitamos nombre, email, teléfono, dirección ni datos de pago.",
            "No vendemos café ni procesamos compras, así que no hay datos de transacciones que guardar.",
          ],
        },
        {
          heading: "Cookie funcional de idioma",
          paragraphs: [
            "Usamos una cookie llamada NEXT_LOCALE para recordar si elegiste español o inglés. Es funcional: sin ella el sitio volvería al idioma detectado por el navegador.",
            "No usamos cookies de publicidad, de analítica de terceros ni de seguimiento entre sitios.",
          ],
        },
        {
          heading: "Infraestructura y catálogo",
          paragraphs: [
            "El sitio se aloja en Vercel, que mantiene logs técnicos de las solicitudes (por ejemplo, dirección IP y user agent) por seguridad y diagnóstico.",
            "El catálogo público de productos se guarda en Supabase. Contiene información de productos y tiendas, no datos de usuarios.",
            "Las tiendas externas tienen sus propias políticas de privacidad. Cuando seguís un enlace de compra, se aplican las condiciones de ese sitio.",
          ],
        },
        {
          heading: "Sin publicidad ni tracking",
          paragraphs: [
            "No mostramos anuncios ni integramos píxeles de redes sociales. No compartimos datos con terceros con fines comerciales.",
          ],
        },
      ],
    },
    terms: {
      metaTitle: "Términos — Quiero Café",
      metaDescription:
        "Condiciones de uso de Quiero Café: precios informativos, sin venta ni intermediación, sin garantía de disponibilidad y verificación en la tienda.",
      title: "Términos",
      intro:
        "Estos términos explican qué información ofrece Quiero Café y cuáles son sus límites. Al usar el sitio, aceptás estas condiciones.",
      sections: [
        {
          heading: "Precios informativos y referenciales",
          paragraphs: [
            "Los precios que mostramos son informativos y referenciales. Provienen de páginas públicas de tiendas de terceros y pueden estar desactualizados, incompletos o cambiar sin aviso.",
            "El precio por kilo es un cálculo de normalización para comparar productos de distintos gramajes. No es una oferta ni el precio final que cobra la tienda.",
          ],
        },
        {
          heading: "No vendemos ni intermediamos",
          paragraphs: [
            "Quiero Café no vende café, no procesa pagos y no intermedia en ninguna compra. La relación comercial es siempre entre vos y la tienda del tostador.",
            "No garantizamos disponibilidad, stock, envíos, calidad ni exactitud de los datos. Antes de comprar, verificá el precio y las condiciones directamente en la tienda.",
          ],
        },
        {
          heading: "Marcas, imágenes y contenido",
          paragraphs: [
            "Las marcas, nombres comerciales, imágenes y descripciones pertenecen a sus respectivos dueños y se muestran solo con fines informativos y de comparación.",
            "Si sos titular de una tienda y querés corregir o dar de baja contenido, abrí un issue en GitHub y lo revisamos.",
          ],
        },
        {
          heading: "Cambios en el sitio",
          paragraphs: [
            "Podemos modificar, suspender o discontinuar el sitio, sus datos o estos términos en cualquier momento. La versión vigente es la publicada en esta página.",
          ],
        },
      ],
    },
  },
  catalog: {
    sectionAria: "Catálogo de cafés",
    searchPlaceholder: "Buscar café, origen o tostador…",
    searchAria: "Buscar productos",
    filters: "Filtros",
    productOne: "producto",
    productMany: "productos",
    sortLabel: "Ordenar por",
    sort: {
      "price_per_kg-desc": "Mayor precio por kg",
      "price_per_kg-asc": "Menor precio por kg",
      "grams-desc": "Mayor gramaje",
      "grams-asc": "Menor gramaje",
      "price-desc": "Mayor precio",
      "price-asc": "Menor precio",
      "name-asc": "Nombre (A-Z)",
      "roaster-asc": "Tostador (A-Z)",
    },
    categoryLabel: "Categoría",
    category: {
      all: "Todos los cafés",
      "single-origin": "Single origin",
      blend: "Blend",
      equipment: "Herramientas y accesorios",
    },
    originLabel: "País de origen",
    allCountries: "Todos los países",
    noWeight: "sin gramaje",
    emptyResults: "No encontramos cafés con esos filtros",
    clearFilters: "Limpiar filtros",
    loadMore: (count) => `Cargar más (${count})`,
  },
  productCard: {
    category: {
      "single-origin": "Single origin",
      blend: "Blend",
      equipment: "Equipo",
    },
    grind: {
      "whole-bean": "En grano",
      ground: "Molido",
    },
    freeShipping: "Envío gratis",
    viewOnStore: "Ver en la tienda",
    perKgRef: "por kg",
  },
  updatedBadge: {
    justUpdated: "Recién actualizado",
    updated: (relative) => `Actualizado ${relative}`,
  },
};
