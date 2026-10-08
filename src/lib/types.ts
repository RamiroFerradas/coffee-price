export type StoreId =
  | "cafedelirante"
  | "flatnwhite"
  | "indigoroasters"
  | "momotostadores"
  | "bunatostadores"
  | "fuegotostadores"
  | "modobarista"
  | "kapselmaker"
  | "johnandjoe"
  | "indiosverdes"
  | "drupa";

export interface Product {
  id: string;
  store: StoreId;
  external_id: string;
  name: string;
  url: string;
  image_url: string | null;
  roaster: string;
  origin: string | null;
  variety: string | null;
  category: string | null;
  grind: string | null;
  grams: number | null;
  price: number;
  price_per_kg: number | null;
  in_stock: boolean;
  free_shipping: boolean | null;
  shipping_note: string | null;
  installments: string | null;
  tasting_notes: string | null;
  process: string | null;
  roast_level: string | null;
  altitude: string | null;
  score: number | null;
  fetched_at: string;
}

export interface RawProduct {
  store: StoreId;
  external_id: string;
  name: string;
  url: string;
  roaster: string;
  price: number;
  image_url?: string | null;
  origin?: string | null;
  variety?: string | null;
  category?: string | null;
  grind?: string | null;
  grams?: number | null;
  in_stock?: boolean;
  free_shipping?: boolean | null;
  shipping_note?: string | null;
  installments?: string | null;
  tasting_notes?: string | null;
  process?: string | null;
  roast_level?: string | null;
  altitude?: string | null;
  score?: number | null;
}
