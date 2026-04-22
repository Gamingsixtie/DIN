// Cito BV organogram — alle functies die inzetbaar zijn in programma-interne-uren.
// Bron: user-aangeleverde organogram-tabel (alle schalen + fte-breakdown).
// Wordt gebruikt als AI-context bij stap 7 (interne uren) zodat Claude passende
// rollen kan kiezen per domein en programma-activiteit.

export type CitoAfdeling =
  | "Directie"
  | "Klantcontact"
  | "Staf BV"
  | "Data & Technologie"
  | "Ondersteuning & Productie"
  | "Sector PO"
  | "Sector VO"
  | "Sector Professionals";

export type CitoFunctie = {
  id: string;          // snake_case, uniek — bv. "sectormanager_po"
  naam: string;        // Functienaam zoals in organogram
  schaal: number;      // CAO-schaal (6-16)
  afdeling: CitoAfdeling;
  indicatieFte?: number; // Aanwezige fte in huidige organisatie (voor context)
  inspanningRelevantie?: Array<"cultuur" | "mens" | "data_systemen" | "processen">;
};

export const CITO_FUNCTIES: CitoFunctie[] = [
  // === DIRECTIE ===
  { id: "directeur_bv", naam: "Directeur BV", schaal: 16, afdeling: "Directie", indicatieFte: 1, inspanningRelevantie: ["cultuur"] },

  // === KLANTCONTACT ===
  { id: "manager_klantcontact", naam: "Manager Klantcontact", schaal: 14, afdeling: "Klantcontact", indicatieFte: 1, inspanningRelevantie: ["cultuur", "mens"] },
  { id: "accountmanager_a", naam: "Accountmanager A", schaal: 10, afdeling: "Klantcontact", indicatieFte: 1, inspanningRelevantie: ["mens", "processen"] },
  { id: "accountmanager_b", naam: "Accountmanager B", schaal: 11, afdeling: "Klantcontact", indicatieFte: 2, inspanningRelevantie: ["mens", "processen"] },
  { id: "accountmanager_c", naam: "Accountmanager C", schaal: 12, afdeling: "Klantcontact", indicatieFte: 2.78, inspanningRelevantie: ["mens", "processen"] },
  { id: "mdw_binnendienst_a", naam: "Medewerker binnendienst A", schaal: 8, afdeling: "Klantcontact", indicatieFte: 2.89, inspanningRelevantie: ["processen"] },
  { id: "mdw_binnendienst_b", naam: "Medewerker binnendienst B", schaal: 9, afdeling: "Klantcontact", indicatieFte: 2.33, inspanningRelevantie: ["processen"] },
  { id: "adm_mdw_b", naam: "Administratief medewerker B", schaal: 6, afdeling: "Klantcontact", indicatieFte: 0.83, inspanningRelevantie: ["processen"] },
  { id: "teamleider_klantenservice", naam: "Teamleider klantenservice", schaal: 12, afdeling: "Klantcontact", indicatieFte: 1, inspanningRelevantie: ["mens", "processen"] },
  { id: "klantenservice_a", naam: "Klantenservice medewerker A", schaal: 6, afdeling: "Klantcontact", indicatieFte: 14.78, inspanningRelevantie: ["processen"] },
  { id: "klantenservice_b", naam: "Klantenservice medewerker B", schaal: 7, afdeling: "Klantcontact", indicatieFte: 6.56, inspanningRelevantie: ["processen"] },
  { id: "klantenservice_c", naam: "Klantenservice medewerker C", schaal: 8, afdeling: "Klantcontact", indicatieFte: 2, inspanningRelevantie: ["processen"] },

  // === STAF BV ===
  { id: "projectmanager_c", naam: "Projectmanager C", schaal: 11, afdeling: "Staf BV", indicatieFte: 1.19, inspanningRelevantie: ["cultuur", "mens", "data_systemen", "processen"] },
  { id: "projectmanager_d", naam: "Projectmanager D", schaal: 12, afdeling: "Staf BV", indicatieFte: 1.67, inspanningRelevantie: ["cultuur", "mens", "data_systemen", "processen"] },
  { id: "kwaliteitsmanager", naam: "Kwaliteitsmanager", schaal: 13, afdeling: "Staf BV", indicatieFte: 0.6, inspanningRelevantie: ["processen"] },
  { id: "mgmt_assistent_c", naam: "Managementassistent C", schaal: 8, afdeling: "Staf BV", indicatieFte: 0.8, inspanningRelevantie: ["processen"] },

  // === DATA & TECHNOLOGIE ===
  { id: "manager_dt", naam: "Manager Data & Technologie", schaal: 14, afdeling: "Data & Technologie", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "productowner_b_producten", naam: "Productowner B producten", schaal: 12, afdeling: "Data & Technologie", indicatieFte: 1.89, inspanningRelevantie: ["data_systemen"] },
  { id: "productowner_a_website", naam: "Productowner A website", schaal: 11, afdeling: "Data & Technologie", indicatieFte: 1, inspanningRelevantie: ["data_systemen"] },
  { id: "business_info_analist_c", naam: "Business informatieanalist C", schaal: 11, afdeling: "Data & Technologie", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "procesmanager_data", naam: "Procesmanager / Data-analist Klant & Markt", schaal: 11, afdeling: "Data & Technologie", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },

  // === ONDERSTEUNING & PRODUCTIE ===
  { id: "teamleider_ps", naam: "Teamleider Proces Support", schaal: 10, afdeling: "Ondersteuning & Productie", indicatieFte: 1, inspanningRelevantie: ["processen"] },
  { id: "inkoper_b", naam: "Inkoper B", schaal: 9, afdeling: "Ondersteuning & Productie", indicatieFte: 1, inspanningRelevantie: ["processen", "data_systemen"] },
  { id: "mdw_ps_a", naam: "Medewerker Proces Support A", schaal: 4, afdeling: "Ondersteuning & Productie", indicatieFte: 1, inspanningRelevantie: ["processen"] },
  { id: "mdw_ps_b", naam: "Medewerker Proces Support B", schaal: 5, afdeling: "Ondersteuning & Productie", indicatieFte: 1.78, inspanningRelevantie: ["processen"] },
  { id: "mdw_ps_c", naam: "Medewerker Proces Support C", schaal: 6, afdeling: "Ondersteuning & Productie", indicatieFte: 5.12, inspanningRelevantie: ["processen"] },
  { id: "mdw_ps_d", naam: "Medewerker Proces Support D", schaal: 7, afdeling: "Ondersteuning & Productie", indicatieFte: 1, inspanningRelevantie: ["processen"] },
  { id: "mdw_ps_e", naam: "Medewerker Proces Support E", schaal: 8, afdeling: "Ondersteuning & Productie", indicatieFte: 1.89, inspanningRelevantie: ["processen"] },
  { id: "teamleider_ms", naam: "Teamleider Media Support", schaal: 10, afdeling: "Ondersteuning & Productie", indicatieFte: 0.89, inspanningRelevantie: ["processen", "mens"] },
  { id: "mdw_ms_a", naam: "Medewerker Media Support A", schaal: 6, afdeling: "Ondersteuning & Productie", indicatieFte: 4.39, inspanningRelevantie: ["processen"] },
  { id: "mdw_ms_b", naam: "Medewerker Media Support B", schaal: 7, afdeling: "Ondersteuning & Productie", indicatieFte: 2.94, inspanningRelevantie: ["processen"] },
  { id: "mdw_ms_c", naam: "Medewerker Media Support C", schaal: 8, afdeling: "Ondersteuning & Productie", indicatieFte: 3, inspanningRelevantie: ["processen"] },
  { id: "bureauredacteur", naam: "Bureauredacteur / documentalist", schaal: 9, afdeling: "Ondersteuning & Productie", indicatieFte: 0.89, inspanningRelevantie: ["processen"] },
  { id: "content_specialist", naam: "Content Specialist", schaal: 10, afdeling: "Ondersteuning & Productie", indicatieFte: 1.78, inspanningRelevantie: ["mens", "processen"] },
  // Trainers zijn voor klantcontact-training, NIET voor programma-interne-begeleiding —
  // standaard niet in default-relevantie. Gebruiker kan ze handmatig selecteren indien relevant.
  { id: "teamleider_trainingen", naam: "Teamleider Trainingen", schaal: 10, afdeling: "Ondersteuning & Productie", indicatieFte: 1, inspanningRelevantie: [] },
  { id: "trainer_adviseur_a", naam: "Trainer/Adviseur A", schaal: 11, afdeling: "Ondersteuning & Productie", indicatieFte: 2, inspanningRelevantie: [] },
  { id: "trainer_adviseur_b", naam: "Trainer/Adviseur B", schaal: 12, afdeling: "Ondersteuning & Productie", indicatieFte: 5.84, inspanningRelevantie: [] },

  // === SECTOR PO ===
  { id: "sectormanager_po", naam: "Sectormanager PO", schaal: 14, afdeling: "Sector PO", indicatieFte: 1, inspanningRelevantie: ["cultuur", "mens", "data_systemen", "processen"] },
  { id: "productmanager_kib", naam: "Productmanager A (KiB)", schaal: 12, afdeling: "Sector PO", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "productmanager_lib", naam: "Productmanager B (LiB)", schaal: 13, afdeling: "Sector PO", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "productmanager_dst", naam: "Productmanager B (DST)", schaal: 13, afdeling: "Sector PO", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "campagne_marketeer_a", naam: "Campagne Marketeer A", schaal: 11, afdeling: "Sector PO", indicatieFte: 1, inspanningRelevantie: ["cultuur", "mens"] },
  { id: "toetsdeskundige_a_po", naam: "Toetsdeskundige A (PO)", schaal: 10, afdeling: "Sector PO", indicatieFte: 2.78, inspanningRelevantie: ["mens", "processen"] },
  { id: "toetsdeskundige_b_po", naam: "Toetsdeskundige B (PO)", schaal: 11, afdeling: "Sector PO", indicatieFte: 6.44, inspanningRelevantie: ["mens", "processen"] },
  { id: "toetsdeskundige_c_po", naam: "Toetsdeskundige C (PO)", schaal: 12, afdeling: "Sector PO", indicatieFte: 2.47, inspanningRelevantie: ["mens", "processen"] },
  { id: "toetsondersteunend_c_po", naam: "Toetsondersteunend medewerker C (PO)", schaal: 7, afdeling: "Sector PO", indicatieFte: 0.78, inspanningRelevantie: ["processen"] },
  { id: "procesondersteuner_po", naam: "Procesondersteuner C (PO)", schaal: 9, afdeling: "Sector PO", indicatieFte: 1, inspanningRelevantie: ["processen"] },

  // === SECTOR VO ===
  { id: "sectormanager_vo", naam: "Sectormanager VO", schaal: 14, afdeling: "Sector VO", indicatieFte: 1, inspanningRelevantie: ["cultuur", "mens", "data_systemen", "processen"] },
  { id: "productmanager_cvvo", naam: "Productmanager B (CvVO)", schaal: 13, afdeling: "Sector VO", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "productmanager_klt", naam: "Productmanager B (KLT)", schaal: 13, afdeling: "Sector VO", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "campagne_marketeer_b", naam: "Campagne Marketeer B", schaal: 12, afdeling: "Sector VO", indicatieFte: 0.89, inspanningRelevantie: ["cultuur", "mens"] },
  { id: "toetsdeskundige_b_vo", naam: "Toetsdeskundige B (VO)", schaal: 11, afdeling: "Sector VO", indicatieFte: 4.75, inspanningRelevantie: ["mens", "processen"] },
  { id: "toetsdeskundige_c_vo", naam: "Toetsdeskundige C (VO)", schaal: 12, afdeling: "Sector VO", indicatieFte: 0.89, inspanningRelevantie: ["mens", "processen"] },
  { id: "procesondersteuner_vo", naam: "Procesondersteuner C (VO)", schaal: 9, afdeling: "Sector VO", indicatieFte: 0.89, inspanningRelevantie: ["processen"] },

  // === SECTOR PROFESSIONALS ===
  { id: "sectormanager_prof", naam: "Sectormanager Professionals", schaal: 14, afdeling: "Sector Professionals", indicatieFte: 1, inspanningRelevantie: ["cultuur", "mens", "data_systemen", "processen"] },
  { id: "accountmanager_c_prof", naam: "Accountmanager C (Professionals)", schaal: 12, afdeling: "Sector Professionals", indicatieFte: 1, inspanningRelevantie: ["mens", "processen"] },
  { id: "mdw_binnendienst_a_prof", naam: "Medewerker binnendienst A (Professionals)", schaal: 8, afdeling: "Sector Professionals", indicatieFte: 0.78, inspanningRelevantie: ["processen"] },
  { id: "productmanager_int_zak", naam: "Productmanager A (Internationaal & Zakelijk)", schaal: 12, afdeling: "Sector Professionals", indicatieFte: 2, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "productmanager_nt2", naam: "Productmanager B (NT2 overheid)", schaal: 13, afdeling: "Sector Professionals", indicatieFte: 2, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "junior_marketeer_prof", naam: "Junior Marketeer (Professionals)", schaal: 8, afdeling: "Sector Professionals", indicatieFte: 1, inspanningRelevantie: ["cultuur", "mens"] },
  { id: "toetsdeskundige_a_prof", naam: "Toetsdeskundige A (Professionals)", schaal: 10, afdeling: "Sector Professionals", indicatieFte: 2, inspanningRelevantie: ["mens", "processen"] },
  { id: "toetsdeskundige_b_prof", naam: "Toetsdeskundige B (Professionals)", schaal: 11, afdeling: "Sector Professionals", indicatieFte: 3.4, inspanningRelevantie: ["mens", "processen"] },
  { id: "toetsdeskundige_c_prof", naam: "Toetsdeskundige C (Professionals)", schaal: 12, afdeling: "Sector Professionals", indicatieFte: 3.78, inspanningRelevantie: ["mens", "processen"] },
  { id: "ok_onderzoeker_c", naam: "Onderwijskundig onderzoeker C", schaal: 12, afdeling: "Sector Professionals", indicatieFte: 1, inspanningRelevantie: ["data_systemen", "processen"] },
  { id: "mdw_toetsing", naam: "Medewerker toetsing", schaal: 9, afdeling: "Sector Professionals", indicatieFte: 0.67, inspanningRelevantie: ["processen"] },
  { id: "toetsondersteunend_prof", naam: "Toetsondersteunend medewerker (Professionals)", schaal: 7, afdeling: "Sector Professionals", indicatieFte: 0.75, inspanningRelevantie: ["processen"] },
];

export function citoFunctiesPerDomein(domein: "cultuur" | "mens" | "data_systemen" | "processen"): CitoFunctie[] {
  return CITO_FUNCTIES.filter((f) => f.inspanningRelevantie?.includes(domein));
}

export function citoFunctieById(id: string): CitoFunctie | undefined {
  return CITO_FUNCTIES.find((f) => f.id === id);
}

/** Compact tekstoverzicht voor AI-prompt — groepeert per afdeling met schaal. */
export function citoFunctiesAlsPromptBlok(): string {
  const perAfdeling = new Map<string, CitoFunctie[]>();
  for (const f of CITO_FUNCTIES) {
    const list = perAfdeling.get(f.afdeling) ?? [];
    list.push(f);
    perAfdeling.set(f.afdeling, list);
  }
  const regels: string[] = [];
  for (const [afdeling, functies] of perAfdeling) {
    regels.push(`${afdeling}:`);
    for (const f of functies) {
      const rel = f.inspanningRelevantie?.join("/") ?? "";
      regels.push(`  - ${f.naam} (schaal ${f.schaal}) [${rel}]`);
    }
  }
  return regels.join("\n");
}
