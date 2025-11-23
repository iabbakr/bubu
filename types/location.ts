// types/location.ts

export interface Location {
  state: string;
  city: string;
}

// Nigerian States and their major cities
export const NIGERIAN_STATES: Record<string, string[]> = {
  "Abia": ["Umuahia", "Aba", "Arochukwu", "Ohafia", "Bende"],
  "Adamawa": ["Yola", "Mubi", "Jimeta", "Numan", "Ganye"],
  "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene", "Oron", "Abak"],
  "Anambra": ["Awka", "Onitsha", "Nnewi", "Ekwulobia", "Ihiala"],
  "Bauchi": ["Bauchi", "Azare", "Misau", "Jama'are", "Ningi"],
  "Bayelsa": ["Yenagoa", "Brass", "Sagbama", "Ogbia", "Ekeremor"],
  "Benue": ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala", "Vandeikya"],
  "Borno": ["Maiduguri", "Bama", "Biu", "Dikwa", "Gubio"],
  "Cross River": ["Calabar", "Ikom", "Ogoja", "Obudu", "Ugep"],
  "Delta": ["Asaba", "Warri", "Sapele", "Ughelli", "Agbor"],
  "Ebonyi": ["Abakaliki", "Afikpo", "Onueke", "Ezza", "Ishielu"],
  "Edo": ["Benin City", "Auchi", "Ekpoma", "Uromi", "Igarra"],
  "Ekiti": ["Ado-Ekiti", "Ikere", "Efon-Alaaye", "Ijero", "Ikole"],
  "Enugu": ["Enugu", "Nsukka", "Oji River", "Agbani", "Udi"],
  "FCT": ["Abuja", "Gwagwalada", "Kuje", "Bwari", "Kwali"],
  "Gombe": ["Gombe", "Kumo", "Deba", "Billiri", "Kaltungo"],
  "Imo": ["Owerri", "Orlu", "Okigwe", "Mbaise", "Nkwerre"],
  "Jigawa": ["Dutse", "Hadejia", "Gumel", "Kazaure", "Ringim"],
  "Kaduna": ["Kaduna", "Zaria", "Kafanchan", "Kagoro", "Kachia"],
  "Kano": ["Kano", "Wudil", "Gwarzo", "Bichi", "Rano"],
  "Katsina": ["Katsina", "Daura", "Funtua", "Malumfashi", "Kankia"],
  "Kebbi": ["Birnin Kebbi", "Argungu", "Yauri", "Zuru", "Kalgo"],
  "Kogi": ["Lokoja", "Okene", "Kabba", "Idah", "Ankpa"],
  "Kwara": ["Ilorin", "Offa", "Jebba", "Lafiagi", "Pategi"],
  "Lagos": ["Ikeja", "Lagos Island", "Lekki", "Ikorodu", "Epe", "Badagry", "Surulere", "Yaba"],
  "Nasarawa": ["Lafia", "Keffi", "Akwanga", "Nasarawa", "Doma"],
  "Niger": ["Minna", "Bida", "Kontagora", "Suleja", "Lapai"],
  "Ogun": ["Abeokuta", "Ijebu Ode", "Sagamu", "Ota", "Ilaro"],
  "Ondo": ["Akure", "Ondo", "Owo", "Ikare", "Ore"],
  "Osun": ["Osogbo", "Ile-Ife", "Ilesa", "Ede", "Iwo"],
  "Oyo": ["Ibadan", "Ogbomoso", "Oyo", "Iseyin", "Saki"],
  "Plateau": ["Jos", "Bukuru", "Pankshin", "Shendam", "Langtang"],
  "Rivers": ["Port Harcourt", "Obio-Akpor", "Eleme", "Okrika", "Bonny"],
  "Sokoto": ["Sokoto", "Gwadabawa", "Bodinga", "Wurno", "Goronyo"],
  "Taraba": ["Jalingo", "Wukari", "Ibi", "Bali", "Gembu"],
  "Yobe": ["Damaturu", "Potiskum", "Gashua", "Nguru", "Geidam"],
  "Zamfara": ["Gusau", "Kaura Namoda", "Talata Mafara", "Anka", "Bungudu"]
};

export const getAllStates = (): string[] => {
  return Object.keys(NIGERIAN_STATES).sort();
};

export const getCitiesByState = (state: string): string[] => {
  return NIGERIAN_STATES[state] || [];
};