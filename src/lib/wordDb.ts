import { WORD_DB } from "../data/words";
import { CATEGORIES, LETTERS } from "../data/categories";

export const toTrUpperCase = (str: string): string => {
  return str.replace(/i/g, 'İ').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR');
}

export const checkLocalDB = (word: string, category: string): boolean => {
  const normWord = toTrUpperCase(word.trim());
  const searchWord = normWord.replace(/\s+/g, '');
  
  if (category.startsWith("Son Harfi")) {
    const match = category.match(/Son Harfi (.) Olan Kelime/);
    if (match && match[1]) {
       const requiredLetter = toTrUpperCase(match[1]);
       if (normWord.endsWith(requiredLetter) && normWord.length > 2) {
         return true; // We accept any word longer than 2 that ends with the letter
       }
       return false;
    }
  }

  // Synonym mappings
  let targetCat = category;
  if (category === "Ada Ülkesi") targetCat = "Ülke";
  if (category === "Kıyafet Markası") targetCat = "Marka";
  
  if (WORD_DB[targetCat]) {
    // Exact match
    if (WORD_DB[targetCat].some(w => w.replace(/\s+/g, '') === searchWord)) return true;
    
    // Some leniency for suffixes or slight typos (basic)
    const exactMatch = WORD_DB[targetCat].some(w => 
      searchWord.startsWith(w.replace(/\s+/g, '')) && (searchWord.length - w.replace(/\s+/g, '').length <= 3)
    );
    if (exactMatch) return true;
  }
  
  return false;
}

export const getPossibleWords = (category: string, letter: string): string[] => {
  let targetCat = category;
  if (category === "Ada Ülkesi") targetCat = "Ülke";
  if (category === "Kıyafet Markası") targetCat = "Marka";
  
  if (category.startsWith("Son Harfi") && WORD_DB["İsim"]) { // Just fallback to isim or something, or scan all
    const match = category.match(/Son Harfi (.) Olan Kelime/);
    if (match && match[1]) {
       const requiredLetter = toTrUpperCase(match[1]);
       // scan all words
       const allWords = Object.values(WORD_DB).flat();
       // return unique matches
       return Array.from(new Set(allWords.filter(w => w.startsWith(letter) && w.endsWith(requiredLetter))));
    }
  }
  
  return (WORD_DB[targetCat] || []).filter(w => w.startsWith(letter));
}

export { CATEGORIES, LETTERS, WORD_DB };
