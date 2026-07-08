/**
 * Destination hero photos — bundled same-origin (so the strict CSP holds and
 * the app works offline), sourced from Wikimedia Commons under open licenses.
 *
 * Each entry records the credit needed for attribution; PHOTO_CREDITS drives
 * the footer/attribution list. photoFor() returns null when a destination has
 * no bundled photo, and the UI falls back to a gradient name block.
 *
 * @typedef {{file: string, alt: string, author: string, license: string,
 *   source: string}} PhotoCredit
 */

const BASE = 'assets/dest/';

/** @type {Record<string, PhotoCredit>} keyed by destination id. */
export const PHOTOS = {
  jaipur: { file: 'jaipur.webp', alt: 'The pink sandstone facade of Hawa Mahal, Jaipur', author: 'Chainwit.', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:East_facade_Hawa_Mahal_Jaipur_from_ground_level_(July_2022)_-_img_01.jpg' },
  varanasi: { file: 'varanasi.webp', alt: 'Evening Ganga Aarti fire ritual at Dashashwamedh Ghat, Varanasi', author: 'Goutam1962', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Ganga_Aarti_at_Dashashwamedh_Ghat_Varanasi_30.jpg' },
  amritsar: { file: 'amritsar.webp', alt: 'The Golden Temple (Harmandir Sahib) reflected in its sacred pool, Amritsar', author: 'Diego Delso', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Templo_dorado-Amritsar-India062.JPG' },
  ahmedabad: { file: 'ahmedabad.webp', alt: 'Carved sandstone galleries inside the Adalaj Stepwell near Ahmedabad', author: 'Shivajidesai29', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Adalaj_Stepwell-Adalaj_Ahmedabad-Gujarat-O0A0201.jpg' },
  bhuj: { file: 'bhuj.webp', alt: 'Sunset over the white salt flats of the Great Rann of Kutch near Bhuj', author: 'Mekshaa', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Rann_utsav_01.jpg' },
  orchha: { file: 'orchha.webp', alt: 'Royal chhatri cenotaphs along the Betwa river, Orchha', author: 'Juan Antonio Segal from Madrid, Spain', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Chhatris_cenotaphs._Orchha,_India_(23582299235).jpg' },
  madurai: { file: 'madurai.webp', alt: 'The vividly painted sculptures of a Meenakshi Amman Temple gopuram, Madurai', author: 'Francisco Anzola', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:Detail_Of_Southern_Gopuram_(242955849).jpeg' },
  kochi: { file: 'kochi.webp', alt: 'Chinese fishing nets silhouetted against the sunset at Fort Kochi', author: 'Rangan Datta Wiki', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Sunset_with_Chinese_Fishing_Nets,_Fort_Kochi_1.jpg' },
  hampi: { file: 'hampi.webp', alt: 'The towering gopuram of Virupaksha Temple over the Hampi ruins', author: 'iMahesh', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Wide_angle_of_Galigopuram_of_Virupaksha_Temple,_Hampi_(01).jpg' },
  kolkata: { file: 'kolkata.webp', alt: 'The white-marble Victoria Memorial, Kolkata', author: 'Vyacheslav Argenberg', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Victoria_Memorial,_Visitors_2,_Kolkata,_India.jpg' },
  puri: { file: 'puri.webp', alt: 'The 13th-century Konark Sun Temple near Puri, Odisha', author: 'Joydeep Chakraborty', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Konark_Sun_Temple_Puri_district,_Odisha,_India_3.jpg' },
  majuli: { file: 'majuli.webp', alt: 'The Brahmaputra river island of Majuli, Assam', author: 'Zanzi bars', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Majestic_Majuli,_the_Largest_inhabited_river_island_in_the_world.jpg' },
};

/**
 * @param {string} id destination id
 * @returns {{src: string, alt: string} | null}
 */
export function photoFor(id) {
  const p = PHOTOS[id];
  return p ? { src: BASE + p.file, alt: p.alt } : null;
}

/** All bundled photo credits, for the attribution footer. */
export const PHOTO_CREDITS = Object.entries(PHOTOS).map(([id, p]) => ({ id, ...p }));
