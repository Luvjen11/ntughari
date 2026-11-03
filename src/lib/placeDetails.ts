/**
 * Longer notes for each place on the Dialect Map, keyed by dialect_regions.slug.
 * Kept to well-established facts; each place links out for more. Review with
 * people from each place and extend freely.
 */
export interface PlaceDetails {
  overview: string;
  knownFor: string[];
  history?: string;
  /** Search phrase for "Read more" (a search link never breaks if a page is renamed). */
  readMore: string;
}

export const PLACE_DETAILS: Record<string, PlaceDetails> = {
  onitsha: {
    overview:
      "One of the great trading cities of West Africa, on the east bank of the River Niger. Its traditional ruler is the Obi of Onitsha, and its Ofala festival draws visitors from across Nigeria.",
    knownFor: ["Onitsha Main Market", "Ofala festival", "River Niger port", "Onitsha market literature"],
    history:
      "Tradition traces the city's founding to migrants from west of the Niger. In the mid-1900s its printers produced the famous Onitsha market pamphlets, cheap popular books sold in the market. The Niger Bridge, opened in 1965, links Onitsha to Asaba.",
    readMore: "Onitsha",
  },
  awka: {
    overview: "Capital of Anambra State since the state was created in 1991, and home to Nnamdi Azikiwe University.",
    knownFor: ["Blacksmithing tradition", "State capital", "Nnamdi Azikiwe University"],
    history:
      "Awka's blacksmiths were known across Igboland for centuries, travelling widely to make tools, weapons and ritual objects.",
    readMore: "Awka",
  },
  nnewi: {
    overview:
      "A busy commercial and industrial town in southern Anambra, often called the Japan of Africa for its motor-parts trade and manufacturing.",
    knownFor: ["Motor-parts trade", "Innoson vehicle factory", "Igwe of Nnewi"],
    readMore: "Nnewi",
  },
  owerri: {
    overview: "Capital of Imo State since 1976 and the commercial heart of the Owerri area.",
    knownFor: ["Mbari art tradition", "State capital", "Mbari Cultural Centre"],
    history:
      "The Owerri area is known for mbari, large clay houses of sculpted figures built as offerings to the earth goddess Ala.",
    readMore: "Owerri",
  },
  mbaise: {
    overview:
      "A group of communities in central Imo State, today split into three local government areas: Aboh Mbaise, Ahiazu Mbaise and Ezinihitte Mbaise.",
    knownFor: ["Densely populated farmland", "Strong church heritage"],
    readMore: "Mbaise",
  },
  orlu: {
    overview:
      "A market town in northern Imo State and centre of the Orlu zone, one of Imo's three senatorial districts.",
    knownFor: ["Orlu zone of Imo State", "Trading town", "Near the wartime Uli airstrip"],
    history:
      "During the Nigerian Civil War (1967–70) the Orlu area lay close to the Uli airstrip, which carried relief flights into Biafra, and it sheltered many people displaced by the fighting.",
    readMore: "Orlu, Imo State",
  },
  nsukka: {
    overview:
      "A hill-country town in northern Enugu State, home of the University of Nigeria, founded in 1960.",
    knownFor: ["University of Nigeria", "Ancient iron smelting", "Northern Igbo dialects"],
    history:
      "Sites near Nsukka, such as Lejja and Opi, hold some of the oldest evidence of iron smelting in West Africa.",
    readMore: "Nsukka",
  },
  udi: {
    overview: "A hilly area on the escarpment west of Enugu city.",
    knownFor: ["Udi hills", "Coal"],
    history: "Coal was found in the Udi area in the early 1900s, which led to the founding of Enugu as a mining town.",
    readMore: "Udi, Enugu",
  },
  enugu: {
    overview: "Capital of Enugu State, nicknamed the Coal City for the mines that built it.",
    knownFor: ["Coal City", "Former Eastern Region capital", "Iva Valley"],
    history:
      "Enugu was the capital of Nigeria's Eastern Region and the first capital of Biafra in 1967. In 1949 police shot striking coal miners at Iva Valley, a key moment in the push for independence.",
    readMore: "Enugu",
  },
  ngwa: {
    overview: "The Ngwa people live around the city of Aba in Abia State, one of Nigeria's busiest manufacturing and trading cities.",
    knownFor: ["Aba", "Ariaria market", "Tailoring and shoemaking"],
    history:
      "The 1929 Women's War began nearby at Oloko and spread to Aba, as women protested colonial taxation and warrant chiefs.",
    readMore: "Ngwa people",
  },
  bende: {
    overview: "An area in northern Abia State with a long history as a trading centre.",
    knownFor: ["Historic market town"],
    history: "Bende's market was an important stop on the Aro trade network in earlier centuries.",
    readMore: "Bende, Abia",
  },
  ohafia: {
    overview: "A group of communities in eastern Abia State with proud warrior traditions.",
    knownFor: ["Ohafia war dance (iri agha)", "Warrior heritage"],
    readMore: "Ohafia",
  },
  afikpo: {
    overview: "A town in southern Ebonyi State near the Cross River.",
    knownFor: ["Okumkpa masquerade plays", "Carved masks"],
    history:
      "Afikpo's masquerade plays, in which masked performers satirise community life, are among the best documented in Igboland.",
    readMore: "Afikpo",
  },
  izzi: {
    overview: "The Izzi people live in and around Abakaliki, capital of Ebonyi State since 1996.",
    knownFor: ["Abakaliki", "Rice farming"],
    readMore: "Izzi Ebonyi",
  },
  ezza: {
    overview: "The Ezza people live in central Ebonyi State and are known as hard-working farmers.",
    knownFor: ["Yam farming", "Northeastern Igbo dialects"],
    readMore: "Ezza Ebonyi",
  },
  ika: {
    overview: "Ika communities live around Agbor in Delta State, west of the River Niger. Agbor's traditional ruler is the Dein of Agbor.",
    knownFor: ["Agbor", "Dein of Agbor"],
    readMore: "Ika people",
  },
  enuani: {
    overview: "Communities around Asaba and Ogwashi-Uku on the western side of the Niger. Asaba has been the capital of Delta State since 1991.",
    knownFor: ["Asaba", "Ogwashi-Uku", "Niger Bridge"],
    history:
      "In October 1967, during the Nigerian Civil War, federal troops killed many civilians in Asaba.",
    readMore: "Enuani",
  },
  ndokwa: {
    overview: "Communities around Kwale in Delta State, where Ukwuani is spoken.",
    knownFor: ["Ukwuani language", "Oil and gas"],
    readMore: "Ukwuani",
  },
  ikwerre: {
    overview: "The Ikwerre live around Port Harcourt, which was built largely on Ikwerre land.",
    knownFor: ["Port Harcourt", "Ikwerre language"],
    readMore: "Ikwerre people",
  },
  ekpeye: {
    overview: "The Ekpeye people live around Ahoada in Rivers State.",
    knownFor: ["Ahoada", "Ekpeye language"],
    readMore: "Ekpeye people",
  },
};

export function readMoreUrl(details: PlaceDetails): string {
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(details.readMore)}`;
}
