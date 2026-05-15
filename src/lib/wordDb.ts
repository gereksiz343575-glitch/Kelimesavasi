import { WORD_DB } from "../data/words";
import { CATEGORIES, LETTERS } from "../data/categories";

export const toTrUpperCase = (str: string): string => {
  return str.replace(/i/g, 'İ').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR');
}

export const checkLocalDB = (word: string, category: string): boolean => {
  const normWord = toTrUpperCase(word.trim());
  const searchWord = normWord.replace(/\s+/g, '');
  
  const categories = category.split(',').map(c => c.trim());

  for (const cat of categories) {
    if (cat.startsWith("Son Harfi")) {
      const match = cat.match(/Son Harfi (.) Olan Kelime/);
      if (match && match[1]) {
         const requiredLetter = toTrUpperCase(match[1]);
         if (normWord.endsWith(requiredLetter) && normWord.length > 2) {
           return true; 
         }
      }
    }

    // Synonym mappings
    let targetCat = cat;
    if (cat === "Ada Ülkesi") targetCat = "Ülke";
    if (cat === "Kıyafet Markası") targetCat = "Marka";
    
    if (WORD_DB[targetCat]) {
      // Exact match
      if (WORD_DB[targetCat].some(w => w.replace(/\s+/g, '') === searchWord)) return true;
      
      // Some leniency for suffixes or slight typos (basic)
      const exactMatch = WORD_DB[targetCat].some(w => 
        searchWord.startsWith(w.replace(/\s+/g, '')) && (searchWord.length - w.replace(/\s+/g, '').length <= 3)
      );
      if (exactMatch) return true;
    }
  }
  
  return false;
}

export const getPossibleWords = (category: string, letter: string): string[] => {
  const categories = category.split(',').map(c => c.trim());
  let possible: string[] = [];

  for (const cat of categories) {
    let targetCat = cat;
    if (cat === "Ada Ülkesi") targetCat = "Ülke";
    if (cat === "Kıyafet Markası") targetCat = "Marka";
    
    if (cat.startsWith("Son Harfi") && WORD_DB["İsim"]) { 
      const match = cat.match(/Son Harfi (.) Olan Kelime/);
      if (match && match[1]) {
         const requiredLetter = toTrUpperCase(match[1]);
         const allWords = Object.values(WORD_DB).flat();
         const matches = Array.from(new Set(allWords.filter(w => w.startsWith(letter) && w.endsWith(requiredLetter))));
         possible = possible.concat(matches);
      }
    } else {
       possible = possible.concat((WORD_DB[targetCat] || []).filter(w => w.startsWith(letter)));
    }
  }
  
  return Array.from(new Set(possible));
}

export { CATEGORIES, LETTERS, WORD_DB };
