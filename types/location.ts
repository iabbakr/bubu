// types/location.ts

export interface Location {
  state: string;
  city: string;
  area?: string;
}

// Nigerian States → Cities → Areas
export const NIGERIAN_LOCATIONS: Record<string, Record<string, string[]>> = {
  "Abia": {
    "Umuahia": ["Isi Gate", "Amuzukwu", "Afara", "Ohiya", "World Bank"],
    "Aba": ["Ariaria", "Osusu", "Ogbor Hill", "Eziukwu", "Asa"],
    "Arochukwu": ["Amasu", "Amangwu", "Isu", "Ututu", "Amuvi"],
    "Ohafia": ["Ebem", "Okon", "Amaekpu", "Asaga", "Isiama"],
    "Bende": ["Igbere", "Uzuakoli", "Item", "Ezeukwu", "Ozuitem"]
  },

  "Adamawa": {
    "Yola": ["Jimeta", "Doubeli", "Makama", "Nasarawo", "Bole"],
    "Mubi": ["Lokuwa", "Digil", "Sabon Gari", "Burha", "Lamorde"],
    "Jimeta": ["Jambutu", "Police Roundabout", "Damilu", "Doubeli"],
    "Numan": ["Nasarawo", "Sabon Pegi", "Bare", "Gweda"],
    "Ganye": ["Sugu", "Gamu", "Yebbi"]
  },

  "Akwa Ibom": {
    "Uyo": ["Itam", "Ewet Housing", "Shelter Afrique", "Ikot Ekpene Road", "Oron Road"],
    "Eket": ["Abuja Road", "Ikot Ekpene", "Idua", "Afaha", "Okon"],
    "Ikot Ekpene": ["Nsasak", "Ikot Inyang", "Itam", "Ikot Osurua"],
    "Oron": ["Eyo Abasi", "Iquita", "Oron Beach"],
    "Abak": ["Midim", "Atai", "Abak Road"]
  },

  "Anambra": {
    "Awka": ["Aroma", "Amawbia", "Okpuno", "Nibo", "Nnamdi Azikiwe Road"],
    "Onitsha": ["Woliwo", "Fegge", "Odoakpu", "Omoba", "Awada"],
    "Nnewi": ["Nnewi North", "Nnewi South", "Otolo", "Uruagu", "Umudim"],
    "Ekwulobia": ["Ula", "Okpo", "Agba", "Amesi"],
    "Ihiala": ["Mbosi", "Orlu Road", "Uli"]
  },

  "Bauchi": {
    "Bauchi": ["Ibrahim Bako", "Kofar Ran", "Gwallaga"],
    "Azare": ["Idi", "Nasarawa", "Katagum"],
    "Misau": ["Hardawa", "Akuyam"],
    "Jama'are": ["Hadejia Road", "Gumel"],
    "Ningi": ["Burra", "Kafin Madaki"]
  },

  "Bayelsa": {
    "Yenagoa": ["Opolo", "Akenfa", "Okaka", "Ovom", "Kpansia"],
    "Brass": ["Twon", "Okpoama"],
    "Sagbama": ["Osekwenike", "Agbere"],
    "Ogbia": ["Otuoke", "Kolo", "Anyama"],
    "Ekeremor": ["Aleibiri", "Oporoma"]
  },

  "Benue": {
    "Makurdi": ["High Level", "Wurukum", "North Bank", "Modern Market"],
    "Gboko": ["Tom Anyo", "Adekaa"],
    "Otukpo": ["Ogobia", "Upu"],
    "Katsina-Ala": ["Abaji", "Gbajimba"],
    "Vandeikya": ["Mbadede", "Tse Mker"]
  },

  "Borno": {
    "Maiduguri": ["Baga Road", "Giwa Barracks", "Custom", "GRA"],
    "Bama": ["Kasugula", "Shehuri"],
    "Biu": ["Dutsen", "Galtimari"],
    "Dikwa": ["Central", "Fadagui"],
    "Gubio": ["Shuwari", "Gubio Central"]
  },

  "Cross River": {
    "Calabar": ["Mariaba", "Ika Ika Oqua", "Goldie", "Summit Hills"],
    "Ikom": ["Four Corners", "Nkarasi"],
    "Ogoja": ["Ishibori", "Igoli"],
    "Obudu": ["Utugwang", "Beggi"],
    "Ugep": ["Ikpakapit", "Ibom"]
  },

  "Delta": {
    "Asaba": ["Okpanam Road", "GRA", "Ibusa Road", "Summit Junction"],
    "Warri": ["Ekpan", "Jakpa", "Airport Road", "Enerhen"],
    "Sapele": ["Amukpe", "Okirighwre"],
    "Ughelli": ["Otovwodo", "Eruemukohwarien"],
    "Agbor": ["Owa", "Ika South"]
  },

  "Ebonyi": {
    "Abakaliki": ["Presco", "Onuebonyi", "Spera-In-Deo"],
    "Afikpo": ["Ndibe", "Ezera"],
    "Onueke": ["Ezza North", "Ezza South"],
    "Ezza": ["Umuezeoka", "Ezzagu"],
    "Ishielu": ["Ezillo", "Ntezi"]
  },

  "Edo": {
    "Benin City": ["GRA", "Ugbowo", "Sapele Road", "Uselu", "Ikpoba Hill"],
    "Auchi": ["Jattu", "Ughiole"],
    "Ekpoma": ["Uke", "Iruekpen"],
    "Uromi": ["Evia", "Amedokhian"],
    "Igarra": ["Akoko Road", "Etuno"]
  },

  "Ekiti": {
    "Ado-Ekiti": ["Oke-Ila", "Oke-Iyinmi", "Fajuyi", "Igbole"],
    "Ikere": ["Odo", "Uro"],
    "Efon-Alaaye": ["Efon Central"],
    "Ijero": ["Ikoro", "Epe"],
    "Ikole": ["Egbe", "Ara"]
  },

  "Enugu": {
    "Enugu": ["Independence Layout", "New Haven", "Uwani", "GRA"],
    "Nsukka": ["Orba", "Opi"],
    "Oji River": ["Achi", "Inyi"],
    "Agbani": ["Ugwuaji", "Obe"],
    "Udi": ["Amokwe", "Eke"]
  },

  "FCT": {
    "Abuja": ["Gwarinpa", "Wuse", "Garki", "Maitama", "Asokoro"],
    "Gwagwalada": ["Kutunku", "Angwan Dodo"],
    "Kuje": ["Chibiri", "Gaube"],
    "Bwari": ["Kawu", "Kogo"],
    "Kwali": ["Yangoji", "Kilankwa"]
  },

  "Gombe": {
    "Gombe": ["Nasarawo", "Pantami", "Federal Low Cost"],
    "Kumo": ["Liji", "Kalshingi"],
    "Deba": ["Kunji", "Lano"],
    "Billiri": ["Bare", "Tudu"],
    "Kaltungo": ["Awachie", "Boji"]
  },

  "Imo": {
    "Owerri": ["Ikenegbu", "World Bank", "Orji", "Amakohia"],
    "Orlu": ["Umuowa", "Okporo"],
    "Okigwe": ["Ubah", "Anara"],
    "Mbaise": ["Ahiara", "Eke Nguru"],
    "Nkwerre": ["Amaigbo", "Umudi"]
  },

  "Jigawa": {
    "Dutse": ["Sabon Gari", "Danfodio"],
    "Hadejia": ["Kofar Arewa", "Yamma"],
    "Gumel": ["Central", "Garin Alhaji"],
    "Kazaure": ["Badawa", "Kofar Kudu"],
    "Ringim": ["Chai-Chai", "Sankara"]
  },

  "Kaduna": {
    "Kaduna": ["Barnawa", "Ungwan Rimi", "Kaduna South", "Kakuri"],
    "Zaria": ["Sabon Gari", "Samuru"],
    "Kafanchan": ["Kagoro", "Fadan Kaje"],
    "Kagoro": ["Gidan Waya", "Kaura"],
    "Kachia": ["Sabon Sarki", "Awon"]
  },

  "Kano": {
    "Kano": ["Fagge", "Tarauni", "Gwale", "Nassarawa", "Dala"],
    "Wudil": ["Lajawa", "Dankaza"],
    "Gwarzo": ["Kutama", "Sabon Gari"],
    "Bichi": ["Dawaki", "Bagwai"],
    "Rano": ["Zango", "Lausu"]
  },

  "Katsina": {
    "Katsina": ["Kofar Soro", "Kofar Kaura", "GRA"],
    "Daura": ["Kanti", "Dungu"],
    "Funtua": ["Sabon Gari", "Galadima"],
    "Malumfashi": ["Dagura", "Galadanci"],
    "Kankia": ["Kofar Yandaka", "Kuraye"]
  },

  "Kebbi": {
    "Birnin Kebbi": ["Makera", "GRA", "Kola"],
    "Argungu": ["Tudun Wada", "Lailaba"],
    "Yauri": ["Shanga", "Ungu"],
    "Zuru": ["Isgogo", "Rafin Zuru"],
    "Kalgo": ["Sirdi", "Danko"]
  },

  "Kogi": {
    "Lokoja": ["Ganaja", "Adankolo", "Zone 8"],
    "Okene": ["Iruvucheba", "Otutu"],
    "Kabba": ["Gbeleko", "Zango"],
    "Idah": ["Sabon Gari", "Ukwokolo"],
    "Ankpa": ["Enjema", "Angwa"]
  },

  "Kwara": {
    "Ilorin": ["Geri Alimi", "Tanke", "Challenge", "Sabo Oke"],
    "Offa": ["Ijesha", "Owode"],
    "Jebba": ["Kainji Road", "Moshalashi"],
    "Lafiagi": ["Shonga", "Gwasoro"],
    "Pategi": ["Kpada", "Lade"]
  },

  "Lagos": {
    "Ikeja": ["Alausa", "Opebi", "Allen", "Maryland", "GRA"],
    "Lagos Island": ["Obalende", "CMS", "Idumota", "Isale Eko"],
    "Lekki": ["Phase 1", "Chevron", "Jakande", "Ikate", "VGC"],
    "Ikorodu": ["Igbogbo", "Ebute", "Imota", "Ijede"],
    "Epe": ["Ita Opo", "Popo Oba"],
    "Badagry": ["Ajara", "Ibereko"],
    "Surulere": ["Aguda", "Ijesha", "Bode Thomas", "Lawanson"],
    "Yaba": ["Sabo", "Tejuosho", "Alagomeji"]
  },

  "Nasarawa": {
    "Lafia": ["Kwandere", "Agyaragu"],
    "Keffi": ["Angwan Lambu", "Angwan Tiv"],
    "Akwanga": ["Nunkai", "Andaha"],
    "Nasarawa": ["Loko", "Udeni"],
    "Doma": ["Alagye", "Rutu"]
  },

  "Niger": {
    "Minna": ["Chanchaga", "Tunga", "Bosso"],
    "Bida": ["Bariki", "Masaba"],
    "Kontagora": ["Maikujeri", "Tunga"],
    "Suleja": ["Madalla", "Maje"],
    "Lapai": ["Evuti", "Gulu"]
  },

  "Ogun": {
    "Abeokuta": ["Asero", "Adigbe", "Oke-Ilewo"],
    "Ijebu Ode": ["Molipa", "Itantebo"],
    "Sagamu": ["Makun", "Ode Lemo"],
    "Ota": ["Sango", "Owode"],
    "Ilaro": ["Oke Odan", "Sabo"]
  },

  "Ondo": {
    "Akure": ["Alagbaka", "Ijapo", "Oke Aro"],
    "Ondo": ["Yaba", "Enuowa"],
    "Owo": ["Isuada", "Ipele"],
    "Ikare": ["Okoja", "Okorun"],
    "Ore": ["Odunwo", "Mobolorunduro"]
  },

  "Osun": {
    "Osogbo": ["Oke Fia", "Oke Baale", "Testing Ground"],
    "Ile-Ife": ["Lagere", "Oduduwa College"],
    "Ilesa": ["Owa Obokun", "Imo"],
    "Ede": ["Sekona", "Oke Gada"],
    "Iwo": ["Oke-Adan", "Agbowo"]
  },

  "Oyo": {
    "Ibadan": ["Bodija", "Challenge", "Jericho", "Dugbe", "Molete"],
    "Ogbomoso": ["Takie", "Aroje"],
    "Oyo": ["Akesan", "Fasola"],
    "Iseyin": ["Oke Ola", "Oja Oba"],
    "Saki": ["Irekere", "Okere"]
  },

  "Plateau": {
    "Jos": ["Rayfield", "Tudun Wada", "Terminus"],
    "Bukuru": ["Kuru", "Gyel"],
    "Pankshin": ["Chip", "Bwall"],
    "Shendam": ["Poeship", "Kalong"],
    "Langtang": ["Gazum", "Kuffen"]
  },

  "Rivers": {
    "Port Harcourt": ["GRA", "D-Line", "Rumuokoro", "Rumuola"],
    "Obio-Akpor": ["Rukpokwu", "Rumuobiakani"],
    "Eleme": ["Alesa", "Aleto"],
    "Okrika": ["Ogoloma", "Ibaka"],
    "Bonny": ["Finima", "Iwoama"]
  },

  "Sokoto": {
    "Sokoto": ["Gawon Nama", "Runjin Sambo"],
    "Gwadabawa": ["Gidanje", "Illela Road"],
    "Bodinga": ["Dingyadi", "Sifawa"],
    "Wurno": ["Achida", "Magarya"],
    "Goronyo": ["Takakume", "Shinaka"]
  },

  "Taraba": {
    "Jalingo": ["Sabon Gari", "Mile Six"],
    "Wukari": ["Hospital Road", "Avyi"],
    "Ibi": ["Ibi Central", "Sabon Pegi"],
    "Bali": ["Maihula", "Tikari"],
    "Gembu": ["Kabri", "Gembu Town"]
  },

  "Yobe": {
    "Damaturu": ["Nayinawa", "Maisandari"],
    "Potiskum": ["Mamudo", "NPN"],
    "Gashua": ["Garun Gawa", "Abuja Quarters"],
    "Nguru": ["Bulabulin", "Bajoga"],
    "Geidam": ["Hausari", "Shekau"]
  },

  "Zamfara": {
    "Gusau": ["Sabon Gari", "Tudun Wada"],
    "Kaura Namoda": ["Galadima", "Kura"],
    "Talata Mafara": ["Bata", "Birnin Magaji"],
    "Anka": ["Dan Galadima", "Sabon Gari"],
    "Bungudu": ["Kwatar Kwashi", "Sakkida"]
  }
};

// ======== HELPER FUNCTIONS ========

// Get all states
export const getAllStates = (): string[] => {
  return Object.keys(NIGERIAN_LOCATIONS).sort();
};

// Get cities by state
export const getCitiesByState = (state: string): string[] => {
  return state && NIGERIAN_LOCATIONS[state]
    ? Object.keys(NIGERIAN_LOCATIONS[state]).sort()
    : [];
};

// Get areas by state & city
export const getAreasByCity = (state: string, city: string): string[] => {
  if (!state || !city) return [];
  return NIGERIAN_LOCATIONS[state]?.[city] || [];
};
