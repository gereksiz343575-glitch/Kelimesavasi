import { ulkeler } from './categories/ulke';
import { sehirler } from './categories/sehir';
import { hayvanlar } from './categories/hayvan';
import { bitkiler } from './categories/bitki';
import { esyalar } from './categories/esya';
import { isimler } from './categories/isim';
import { meslekler } from './categories/meslek';
import { renkler } from './categories/renk';
import { 
    yemekler, markalar, sporlar, filmler, meyveler, sebzeler, tasitlar, 
    kiyafetler, oyunlar 
} from './categories/ekstra';

export const WORD_DB: Record<string, string[]> = {
  "Ülke": ulkeler,
  "Şehir": sehirler,
  "Hayvan": hayvanlar,
  "Bitki": bitkiler,
  "Eşya": esyalar,
  "İsim": isimler,
  "Meslek": meslekler,
  "Renk": renkler,
  "Yemek": yemekler,
  "Marka": markalar,
  "Spor": sporlar,
  "Film": filmler,
  "Meyve": meyveler,
  "Sebze": sebzeler,
  "Taşıt": tasitlar,
  "Kıyafet": kiyafetler,
  "Oyun": oyunlar
};
