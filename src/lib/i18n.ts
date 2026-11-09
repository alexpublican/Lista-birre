import { useSyncExternalStore } from "react";

export type Lang = "it" | "en" | "de" | "fr" | "es";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "it", label: "IT" },
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
  { code: "fr", label: "FR" },
  { code: "es", label: "ES" },
];

const LOCALES: Record<Lang, string> = { it: "it-IT", en: "en-GB", de: "de-DE", fr: "fr-FR", es: "es-ES" };

const DICT = {
  tagline: { it: "Le birre di oggi, alla spina, in frigo e in cantina", en: "Today's beers — on tap, in the fridge and in the cellar", de: "Die Biere von heute — vom Fass, im Kühlschrank und im Keller", fr: "Les bières du jour — pression, frigo et cave", es: "Las cervezas de hoy: de barril, en la nevera y en la bodega" },
  since: { it: "Birreria storica", en: "Historic beer hall", de: "Historische Bierstube", fr: "Brasserie historique", es: "Cervecería histórica" },
  spina: { it: "Alla Spina", en: "On Tap", de: "Vom Fass", fr: "À la Pression", es: "De barril" },
  frigo: { it: "In Frigo", en: "In the Fridge", de: "Im Kühlschrank", fr: "Au Frigo", es: "En la nevera" },
  cantina: { it: "In Cantina", en: "In the Cellar", de: "Im Keller", fr: "En Cave", es: "En la bodega" },
  all: { it: "Tutte", en: "All", de: "Alle", fr: "Toutes", es: "Todas" },
  available_only: { it: "Solo disponibili", en: "Available only", de: "Nur verfügbar", fr: "Disponibles uniquement", es: "Solo disponibles" },
  search_placeholder: { it: "Cerca birra, birrificio o stile…", en: "Search beer, brewery or style…", de: "Bier, Brauerei oder Stil suchen…", fr: "Rechercher bière, brasserie ou style…", es: "Buscar cerveza, cervecería o estilo…" },
  available: { it: "Disponibile", en: "Available", de: "Verfügbar", fr: "Disponible", es: "Disponible" },
  sold_out: { it: "Esaurita", en: "Sold out", de: "Ausverkauft", fr: "Épuisée", es: "Agotada" },
  on_tap_now: { it: "spine attive", en: "taps pouring", de: "Zapfhähne aktiv", fr: "pressions actives", es: "grifos abiertos" },
  beers_available: { it: "birre disponibili", en: "beers available", de: "Biere verfügbar", fr: "bières disponibles", es: "cervezas disponibles" },
  no_results: { it: "Nessuna birra trovata.", en: "No beers found.", de: "Keine Biere gefunden.", fr: "Aucune bière trouvée.", es: "No se han encontrado cervezas." },
  load_error: { it: "Menu momentaneamente non disponibile. Chiedi al banco!", en: "Menu temporarily unavailable. Ask at the bar!", de: "Karte momentan nicht verfügbar. Frag an der Theke!", fr: "Menu momentanément indisponible. Demandez au comptoir !", es: "Menú no disponible temporalmente. ¡Pregunta en la barra!" },
  staff: { it: "Area gestore", en: "Staff area", de: "Personalbereich", fr: "Espace gérant", es: "Área de gestión" },
  pin_title: { it: "Accesso Gestore", en: "Staff Login", de: "Personal-Login", fr: "Accès Gérant", es: "Acceso de gestión" },
  pin_prompt: { it: "Inserisci il PIN per gestire il menu", en: "Enter the PIN to manage the menu", de: "PIN eingeben, um die Karte zu verwalten", fr: "Entrez le PIN pour gérer le menu", es: "Introduce el PIN para gestionar el menú" },
  pin_wrong: { it: "PIN non corretto", en: "Wrong PIN", de: "Falsche PIN", fr: "PIN incorrect", es: "PIN incorrecto" },
  pin_locked: { it: "Troppi tentativi, riprova tra qualche minuto", en: "Too many attempts, try again in a few minutes", de: "Zu viele Versuche, bitte später erneut", fr: "Trop de tentatives, réessayez plus tard", es: "Demasiados intentos, inténtalo de nuevo en unos minutos" },
  enter: { it: "Entra", en: "Enter", de: "Anmelden", fr: "Entrer", es: "Entrar" },
  back_menu: { it: "Torna al menu", en: "Back to menu", de: "Zurück zur Karte", fr: "Retour au menu", es: "Volver al menú" },
  dashboard: { it: "Gestione Birre", en: "Manage Beers", de: "Biere verwalten", fr: "Gérer les bières", es: "Gestión de cervezas" },
  refresh: { it: "Aggiorna", en: "Refresh", de: "Aktualisieren", fr: "Actualiser", es: "Actualizar" },
  logout: { it: "Esci", en: "Log out", de: "Abmelden", fr: "Déconnexion", es: "Cerrar sesión" },
  add_beer: { it: "Aggiungi birra", en: "Add beer", de: "Bier hinzufügen", fr: "Ajouter une bière", es: "Añadir cerveza" },
  edit_beer: { it: "Modifica birra", en: "Edit beer", de: "Bier bearbeiten", fr: "Modifier la bière", es: "Editar cerveza" },
  save: { it: "Salva", en: "Save", de: "Speichern", fr: "Enregistrer", es: "Guardar" },
  cancel: { it: "Annulla", en: "Cancel", de: "Abbrechen", fr: "Annuler", es: "Cancelar" },
  delete: { it: "Elimina", en: "Delete", de: "Löschen", fr: "Supprimer", es: "Eliminar" },
  confirm_delete: { it: "Eliminare definitivamente questa birra?", en: "Delete this beer permanently?", de: "Dieses Bier endgültig löschen?", fr: "Supprimer définitivement cette bière ?", es: "¿Eliminar definitivamente esta cerveza?" },
  name: { it: "Nome", en: "Name", de: "Name", fr: "Nom", es: "Nombre" },
  brewery: { it: "Birrificio", en: "Brewery", de: "Brauerei", fr: "Brasserie", es: "Cervecería" },
  style: { it: "Stile", en: "Style", de: "Stil", fr: "Style", es: "Estilo" },
  abv: { it: "Gradazione (% vol)", en: "ABV (%)", de: "Alkohol (% vol)", fr: "Degré (% vol)", es: "Graduación (% vol)" },
  price: { it: "Prezzo (€)", en: "Price (€)", de: "Preis (€)", fr: "Prix (€)", es: "Precio (€)" },
  description: { it: "Descrizione", en: "Description", de: "Beschreibung", fr: "Description", es: "Descripción" },
  location: { it: "Posizione", en: "Location", de: "Ort", fr: "Emplacement", es: "Ubicación" },
  status: { it: "Stato", en: "Status", de: "Status", fr: "Statut", es: "Estado" },
  actions: { it: "Azioni", en: "Actions", de: "Aktionen", fr: "Actions", es: "Acciones" },
  saved: { it: "Birra salvata", en: "Beer saved", de: "Bier gespeichert", fr: "Bière enregistrée", es: "Cerveza guardada" },
  deleted: { it: "Birra eliminata", en: "Beer deleted", de: "Bier gelöscht", fr: "Bière supprimée", es: "Cerveza eliminada" },
  error: { it: "Qualcosa è andato storto", en: "Something went wrong", de: "Etwas ist schiefgelaufen", fr: "Une erreur est survenue", es: "Algo ha salido mal" },
  required: { it: "Nome, gradazione e prezzo sono obbligatori", en: "Name, ABV and price are required", de: "Name, Alkohol und Preis sind Pflicht", fr: "Nom, degré et prix sont obligatoires", es: "Nombre, graduación y precio son obligatorios" },
  total: { it: "Totale", en: "Total", de: "Gesamt", fr: "Total", es: "Total" },
  featured: { it: "Birre del giorno", en: "Beers of the day", de: "Biere des Tages", fr: "Bières du jour", es: "Cervezas del día" },
  featured_one: { it: "Birra del giorno", en: "Beer of the day", de: "Bier des Tages", fr: "Bière du jour", es: "Cerveza del día" },
  toggle_featured: { it: "Metti/togli tra le birre del giorno", en: "Toggle beer of the day", de: "Bier des Tages umschalten", fr: "Basculer bière du jour", es: "Añadir/quitar de las cervezas del día" },
  sizes: { it: "Formati e prezzi", en: "Sizes & prices", de: "Größen & Preise", fr: "Formats et prix", es: "Formatos y precios" },
  sizes_hint: { it: "Se aggiungi dei formati, il menu mostra questi al posto del prezzo base.", en: "If you add sizes, the menu shows them instead of the base price.", de: "Mit Größen zeigt die Karte diese statt des Grundpreises.", fr: "Si vous ajoutez des formats, le menu les affiche à la place du prix de base.", es: "Si añades formatos, el menú los mostrará en lugar del precio base." },
  size_name: { it: "Formato (es. Media 0,4 l)", en: "Size (e.g. Pint)", de: "Größe (z. B. 0,4 l)", fr: "Format (ex. Pinte)", es: "Formato (p. ej. Pinta)" },
  add_size: { it: "Aggiungi formato", en: "Add size", de: "Größe hinzufügen", fr: "Ajouter un format", es: "Añadir formato" },
  remove_size: { it: "Rimuovi formato", en: "Remove size", de: "Größe entfernen", fr: "Retirer le format", es: "Eliminar formato" },
  sizes_pack: { it: "Formati: bottiglia o lattina", en: "Bottle or can sizes", de: "Flasche oder Dose", fr: "Bouteille ou canette", es: "Formatos: botella o lata" },
  sizes_pack_hint: { it: "Scegli bottiglia o lattina, scrivi la quantità e il prezzo. Il menu li mostra al posto del prezzo base.", en: "Pick bottle or can, enter quantity and price. The menu shows them instead of the base price.", de: "Flasche oder Dose wählen, Menge und Preis eingeben. Die Karte zeigt sie statt des Grundpreises.", fr: "Choisissez bouteille ou canette, la quantité et le prix. Le menu les affiche à la place du prix de base.", es: "Elige botella o lata, escribe la cantidad y el precio. El menú los mostrará en lugar del precio base." },
  qty_name: { it: "Quantità (es. 33 cl)", en: "Quantity (e.g. 33 cl)", de: "Menge (z. B. 33 cl)", fr: "Quantité (ex. 33 cl)", es: "Cantidad (p. ej. 33 cl)" },
  bottiglia: { it: "Bottiglia", en: "Bottle", de: "Flasche", fr: "Bouteille", es: "Botella" },
  lattina: { it: "Lattina", en: "Can", de: "Dose", fr: "Canette", es: "Lata" },
  last_bottle: { it: "Ultima bottiglia", en: "Last bottle", de: "Letzte Flasche", fr: "Dernière bouteille", es: "Última botella" },
  stock: { it: "Bottiglie in cantina", en: "Bottles in stock", de: "Flaschen auf Lager", fr: "Bouteilles en stock", es: "Botellas en stock" },
  stock_hint: { it: "Lo vedete solo voi. A 1 i clienti vedono \"Ultima bottiglia\", a 0 diventa esaurita. Vuoto = non contare.", en: "Only staff see this. At 1 guests see \"Last bottle\", at 0 it is sold out. Empty = don't count.", de: "Nur für das Team. Bei 1 sehen Gäste \"Letzte Flasche\", bei 0 ausverkauft. Leer = nicht zählen.", fr: "Visible seulement par l'équipe. À 1 les clients voient \"Dernière bouteille\", à 0 épuisée. Vide = ne pas compter.", es: "Solo lo ve el personal. Con 1 los clientes ven \"Última botella\", con 0 se agota. Vacío = no contar." },
  bottles_short: { it: "bt", en: "btl", de: "Fl.", fr: "btl", es: "bot" },
  sold_one: { it: "Venduta una bottiglia", en: "One bottle sold", de: "Eine Flasche verkauft", fr: "Une bouteille vendue", es: "Una botella vendida" },
  vintage: { it: "Annata", en: "Vintage", de: "Jahrgang", fr: "Millésime", es: "Añada" },
  vintage_hint: { it: "Anno di produzione della bottiglia (vuoto = nessuna)", en: "Bottling year (empty = none)", de: "Abfülljahr (leer = keins)", fr: "Année de mise en bouteille (vide = aucune)", es: "Año de producción de la botella (vacío = ninguno)" },
  vintage_invalid: { it: "Annata non valida (es. 2018)", en: "Invalid vintage (e.g. 2018)", de: "Ungültiger Jahrgang (z. B. 2018)", fr: "Millésime invalide (ex. 2018)", es: "Añada no válida (p. ej. 2018)" },
  diet_filter: { it: "Esigenze", en: "Dietary", de: "Ernährung", fr: "Régime", es: "Preferencias" },
  handpump: { it: "Handpump", en: "Handpump", de: "Handpump", fr: "Handpump", es: "Handpump" },
  cask: { it: "Cask", en: "Cask", de: "Cask", fr: "Cask", es: "Cask" },
  handpump_taps: { it: "Spine Handpump", en: "Handpump taps", de: "Handpump-Zapfhähne", fr: "Tireuses à pompe", es: "Grifos handpump" },
  handpump_hint: { it: "Tocca le spine servite a pompa manuale: menu, TV e pannello le segnano HANDPUMP.", en: "Tap the hand-pulled taps: menu, TV and dashboard mark them HANDPUMP.", de: "Handgezapfte Hähne antippen: Karte, TV und Dashboard zeigen HANDPUMP.", fr: "Touchez les tireuses à pompe manuelle : menu, TV et tableau affichent HANDPUMP.", es: "Toca los grifos de bombeo manual: menú, TV y panel los marcan HANDPUMP." },
  door_spina_sub: { it: "Le spine di oggi, numerate", en: "Today's taps, numbered", de: "Die Zapfhähne von heute", fr: "Les pressions du jour", es: "Los grifos de hoy" },
  door_frigo_sub: { it: "Bottiglie e lattine fresche", en: "Cold bottles and cans", de: "Kühle Flaschen und Dosen", fr: "Bouteilles et canettes fraîches", es: "Botellas y latas frías" },
  door_cantina_sub: { it: "Annate e rarità della cantina", en: "Vintages and cellar rarities", de: "Jahrgänge und Raritäten", fr: "Millésimes et raretés", es: "Añadas y rarezas de la bodega" },
  open_door: { it: "Entra", en: "Enter", de: "Öffnen", fr: "Entrer", es: "Entrar" },
  all_sectors: { it: "Settori", en: "Sections", de: "Bereiche", fr: "Rubriques", es: "Secciones" },
  open_card: { it: "Scheda", en: "Details", de: "Details", fr: "Fiche", es: "Ficha" },
  door_empty: { it: "Nessuna birra al momento", en: "No beers right now", de: "Gerade keine Biere", fr: "Aucune bière pour le moment", es: "Ninguna cerveza por ahora" },
  preview_layout: { it: "Prova: nuova impostazione a settori", en: "Preview: new section layout", de: "Vorschau: neues Layout", fr: "Aperçu : nouvelle mise en page", es: "Prueba: nuevo diseño por secciones" },
  gluten_free: { it: "Senza glutine", en: "Gluten free", de: "Glutenfrei", fr: "Sans gluten", es: "Sin gluten" },
  alcohol_free: { it: "Analcolica", en: "Alcohol free", de: "Alkoholfrei", fr: "Sans alcool", es: "Sin alcohol" },
  size_invalid: { it: "Ogni formato deve avere nome e prezzo", en: "Each size needs a name and price", de: "Jede Größe braucht Name und Preis", fr: "Chaque format doit avoir un nom et un prix", es: "Cada formato debe tener nombre y precio" },
  translate_all: { it: "Traduci tutte", en: "Translate all", de: "Alle übersetzen", fr: "Tout traduire", es: "Traducir todas" },
  translate_all_title: { it: "Traduci tutte le birre", en: "Translate every beer", de: "Alle Biere übersetzen", fr: "Traduire toutes les bières", es: "Traducir todas las cervezas" },
  translate_all_body: { it: "Rifaccio inglese, tedesco, francese e spagnolo di descrizioni e abbinamenti di tutte le birre (anche dello storico) partendo dall'italiano. Le traduzioni scritte a mano verranno sostituite. Ci vuole circa un minuto.", en: "English, German, French and Spanish descriptions and pairings of every beer (history included) are rewritten from the Italian. Hand-written translations will be replaced. It takes about a minute.", de: "Englisch, Deutsch, Französisch und Spanisch aller Biere (auch Verlauf) werden aus dem Italienischen neu erstellt. Manuelle Übersetzungen werden ersetzt. Dauert etwa eine Minute.", fr: "Les versions anglaise, allemande, française et espagnole de toutes les bières (historique inclus) sont refaites depuis l'italien. Les traductions manuelles seront remplacées. Environ une minute.", es: "Se rehacen inglés, alemán, francés y español de todas las cervezas (también el historial) a partir del italiano. Las traducciones manuales se sustituirán. Tarda alrededor de un minuto." },
  translate_all_go: { it: "Traduci ora", en: "Translate now", de: "Jetzt übersetzen", fr: "Traduire maintenant", es: "Traducir ahora" },
  translate_all_running: { it: "Traduzione in corso…", en: "Translating…", de: "Übersetze…", fr: "Traduction en cours…", es: "Traduciendo…" },
  translate_all_done: { it: "Birre tradotte", en: "Beers translated", de: "Biere übersetzt", fr: "Bières traduites", es: "Cervezas traducidas" },
  translate_all_failed: { it: "non riuscite, riprova", en: "failed, try again", de: "fehlgeschlagen, erneut versuchen", fr: "échouées, réessayez", es: "fallidas, inténtalo de nuevo" },
  ai_keywords: { it: "Scrivi con AI: stile + 3 parole chiave", en: "Write with AI: style + 3 keywords", de: "Mit KI schreiben: Stil + 3 Stichwörter", fr: "Écrire avec l'IA : style + 3 mots-clés", es: "Escribir con IA: estilo + 3 palabras clave" },
  ai_pairing: { it: "Suggerisci abbinamento", en: "Suggest pairing", de: "Kombination vorschlagen", fr: "Suggérer un accord", es: "Sugerir maridaje" },
  ai_pairing_done: { it: "Abbinamento suggerito: controllalo e salva", en: "Pairing suggested: check it and save", de: "Kombination vorgeschlagen: prüfen und speichern", fr: "Accord suggéré : vérifiez et enregistrez", es: "Maridaje sugerido: revísalo y guarda" },
  ai_need_style: { it: "Scrivi almeno lo stile della birra", en: "Enter at least the beer style", de: "Mindestens den Bierstil eingeben", fr: "Saisissez au moins le style", es: "Escribe al menos el estilo de la cerveza" },
  ai_keywords_placeholder: { it: "es. agrumi, amara, secca", en: "e.g. citrus, bitter, dry", de: "z. B. Zitrus, herb, trocken", fr: "ex. agrumes, amère, sèche", es: "p. ej. cítricos, amarga, seca" },
  ai_write: { it: "Scrivi descrizione", en: "Write description", de: "Beschreibung schreiben", fr: "Écrire la description", es: "Escribir descripción" },
  ai_need_keywords: { it: "Scrivi almeno una parola chiave", en: "Enter at least one keyword", de: "Mindestens ein Stichwort eingeben", fr: "Saisissez au moins un mot-clé", es: "Escribe al menos una palabra clave" },
  ai_done: { it: "Descrizione scritta: controllala e salva", en: "Description written: check it and save", de: "Beschreibung erstellt: prüfen und speichern", fr: "Description rédigée : vérifiez et enregistrez", es: "Descripción escrita: revísala y guarda" },
  ai_failed: { it: "AI non disponibile, riprova tra poco", en: "AI unavailable, try again shortly", de: "KI nicht verfügbar, bitte gleich erneut", fr: "IA indisponible, réessayez", es: "IA no disponible, inténtalo en un momento" },
  desc_hint: { it: "Al salvataggio, se cambi il testo italiano, inglese, tedesco, francese e spagnolo vengono ritradotti in automatico.", en: "On save, if the Italian text changed, English, German, French and Spanish are re-translated automatically.", de: "Beim Speichern werden Englisch, Deutsch, Französisch und Spanisch automatisch neu übersetzt, wenn sich der italienische Text geändert hat.", fr: "À l'enregistrement, si le texte italien a changé, l'anglais, l'allemand, le français et l'espagnol sont retraduits automatiquement.", es: "Al guardar, si el texto italiano ha cambiado, inglés, alemán, francés y español se vuelven a traducir automáticamente." },
  coming_soon: { it: "Prossimamente", en: "Coming soon", de: "Demnächst", fr: "Bientôt", es: "Próximamente" },
  coming_soon_hint: { it: "Fusti e bottiglie in arrivo", en: "Kegs and bottles on their way", de: "Fässer und Flaschen unterwegs", fr: "Fûts et bouteilles en route", es: "Barriles y botellas en camino" },
  arriving: { it: "In arrivo", en: "Coming soon", de: "Kommt bald", fr: "Bientôt", es: "En camino" },
  mark_arrived: { it: "Segna come arrivata", en: "Mark as arrived", de: "Als angekommen markieren", fr: "Marquer comme arrivée", es: "Marcar como recibida" },
  pairing: { it: "Abbinamento", en: "Pairs with", de: "Passt zu", fr: "Accord", es: "Maridaje" },
  pairing_label: { it: "Abbinamento cibo", en: "Food pairing", de: "Speiseempfehlung", fr: "Accord mets", es: "Maridaje con comida" },
  all_styles: { it: "Tutti gli stili", en: "All styles", de: "Alle Stile", fr: "Tous les styles", es: "Todos los estilos" },
  settings: { it: "Info locale", en: "Venue info", de: "Lokal-Infos", fr: "Infos du lieu", es: "Info del local" },
  settings_saved: { it: "Informazioni salvate", en: "Info saved", de: "Infos gespeichert", fr: "Infos enregistrées", es: "Información guardada" },
  hours: { it: "Orari", en: "Opening hours", de: "Öffnungszeiten", fr: "Horaires", es: "Horario" },
  address: { it: "Indirizzo", en: "Address", de: "Adresse", fr: "Adresse", es: "Dirección" },
  phone: { it: "Telefono", en: "Phone", de: "Telefon", fr: "Téléphone", es: "Teléfono" },
  style_filters: { it: "Filtri per stile", en: "Style filters", de: "Stilfilter", fr: "Filtres de style", es: "Filtros por estilo" },
  style_filters_hint: { it: "Un filtro trova tutte le birre il cui stile contiene quella parola (es. 'IPA' trova 'American IPA').", en: "A filter matches every beer whose style contains that word.", de: "Ein Filter findet alle Biere, deren Stil das Wort enthält.", fr: "Un filtre trouve toutes les bières dont le style contient ce mot.", es: "Un filtro encuentra todas las cervezas cuyo estilo contenga esa palabra (p. ej. 'IPA' encuentra 'American IPA')." },
  add_style: { it: "Aggiungi", en: "Add", de: "Hinzufügen", fr: "Ajouter", es: "Añadir" },
  new_style: { it: "Nuovo stile (es. Sour)", en: "New style (e.g. Sour)", de: "Neuer Stil (z. B. Sour)", fr: "Nouveau style (ex. Sour)", es: "Nuevo estilo (p. ej. Sour)" },
  hours_hint: { it: "Se lasci vuota una lingua, si vedono gli orari in italiano.", en: "Leave empty to show the Italian hours.", de: "Leer lassen, um die italienischen Zeiten zu zeigen.", fr: "Laissez vide pour afficher les horaires en italien.", es: "Si dejas un idioma vacío, se verá el horario en italiano." },
  tap_n: { it: "Spina", en: "Tap", de: "Hahn", fr: "Pression", es: "Grifo" },
  tap_none: { it: "Nessun numero", en: "No number", de: "Keine Nummer", fr: "Aucun numéro", es: "Sin número" },
  tap_board: { it: "Le spine", en: "The taps", de: "Die Zapfhähne", fr: "Les pressions", es: "Los grifos" },
  gravity: { it: "Botte a caduta", en: "Gravity cask", de: "Fass (Schwerkraft)", fr: "Fût par gravité", es: "Barril por gravedad" },
  change_pin: { it: "Cambia PIN", en: "Change PIN", de: "PIN ändern", fr: "Changer le PIN", es: "Cambiar PIN" },
  current_pin: { it: "PIN attuale", en: "Current PIN", de: "Aktuelle PIN", fr: "PIN actuel", es: "PIN actual" },
  new_pin: { it: "Nuovo PIN (4–12 cifre)", en: "New PIN (4–12 digits)", de: "Neue PIN (4–12 Ziffern)", fr: "Nouveau PIN (4–12 chiffres)", es: "Nuevo PIN (4–12 dígitos)" },
  confirm_pin: { it: "Ripeti nuovo PIN", en: "Repeat new PIN", de: "Neue PIN wiederholen", fr: "Répéter le nouveau PIN", es: "Repetir nuevo PIN" },
  pin_changed: { it: "PIN aggiornato. Gli altri dispositivi dovranno rientrare.", en: "PIN updated. Other devices must log in again.", de: "PIN geändert. Andere Geräte müssen sich neu anmelden.", fr: "PIN modifié. Les autres appareils devront se reconnecter.", es: "PIN actualizado. Otros dispositivos deberán volver a entrar." },
  pin_mismatch: { it: "I due PIN non coincidono", en: "PINs don't match", de: "PINs stimmen nicht überein", fr: "Les PIN ne correspondent pas", es: "Los dos PIN no coinciden" },
  pin_format: { it: "Il PIN deve avere da 4 a 12 cifre", en: "PIN must be 4–12 digits", de: "PIN muss 4–12 Ziffern haben", fr: "Le PIN doit comporter 4 à 12 chiffres", es: "El PIN debe tener entre 4 y 12 dígitos" },
  pin_current_wrong: { it: "PIN attuale non corretto", en: "Current PIN is wrong", de: "Aktuelle PIN falsch", fr: "PIN actuel incorrect", es: "PIN actual incorrecto" },
  logo: { it: "Logo del locale", en: "Venue logo", de: "Logo des Lokals", fr: "Logo du lieu", es: "Logo del local" },
  logo_hint: { it: "PNG, JPG o WEBP, max 5 MB. Meglio quadrato o con sfondo trasparente.", en: "PNG, JPG or WEBP, max 5 MB. Square or transparent works best.", de: "PNG, JPG oder WEBP, max. 5 MB. Am besten quadratisch oder transparent.", fr: "PNG, JPG ou WEBP, 5 Mo max. Carré ou transparent de préférence.", es: "PNG, JPG o WEBP, máx. 5 MB. Mejor cuadrado o con fondo transparente." },
  logo_upload: { it: "Carica logo", en: "Upload logo", de: "Logo hochladen", fr: "Importer le logo", es: "Subir logo" },
  logo_replace: { it: "Sostituisci", en: "Replace", de: "Ersetzen", fr: "Remplacer", es: "Sustituir" },
  logo_remove: { it: "Rimuovi logo", en: "Remove logo", de: "Logo entfernen", fr: "Supprimer le logo", es: "Eliminar logo" },
  logo_saved: { it: "Logo aggiornato", en: "Logo updated", de: "Logo aktualisiert", fr: "Logo mis à jour", es: "Logo actualizado" },
  logo_removed: { it: "Logo rimosso", en: "Logo removed", de: "Logo entfernt", fr: "Logo supprimé", es: "Logo eliminado" },
  photo: { it: "Foto (bicchiere o etichetta)", en: "Photo (glass or label)", de: "Foto (Glas oder Etikett)", fr: "Photo (verre ou étiquette)", es: "Foto (copa o etiqueta)" },
  photo_choose: { it: "Scegli foto", en: "Choose photo", de: "Foto wählen", fr: "Choisir une photo", es: "Elegir foto" },
  photo_replace: { it: "Cambia foto", en: "Change photo", de: "Foto ändern", fr: "Changer la photo", es: "Cambiar foto" },
  photo_remove: { it: "Togli foto", en: "Remove photo", de: "Foto entfernen", fr: "Retirer la photo", es: "Quitar foto" },
  photo_hint: { it: "PNG, JPG o WEBP, max 5 MB. Puoi scattarla dal telefono.", en: "PNG, JPG or WEBP, max 5 MB. You can take it with your phone.", de: "PNG, JPG oder WEBP, max. 5 MB. Auch direkt mit dem Handy.", fr: "PNG, JPG ou WEBP, 5 Mo max. Vous pouvez la prendre avec le téléphone.", es: "PNG, JPG o WEBP, máx. 5 MB. Puedes hacerla con el móvil." },
  photo_failed: { it: "Birra salvata, ma la foto non è stata caricata", en: "Beer saved, but the photo was not uploaded", de: "Bier gespeichert, Foto aber nicht hochgeladen", fr: "Bière enregistrée, mais la photo n'a pas été importée", es: "Cerveza guardada, pero la foto no se ha podido subir" },
  install: { it: "Aggiungi alla schermata Home", en: "Add to Home Screen", de: "Zum Home-Bildschirm", fr: "Ajouter à l'écran d'accueil", es: "Añadir a la pantalla de inicio" },
  install_ios: { it: "Tocca il pulsante Condividi in basso, poi «Aggiungi alla schermata Home».", en: "Tap the Share button, then 'Add to Home Screen'.", de: "Tippe auf Teilen und dann „Zum Home-Bildschirm“.", fr: "Touchez Partager puis « Sur l'écran d'accueil ».", es: "Toca el botón Compartir abajo y luego «Añadir a la pantalla de inicio»." },
  install_other: { it: "Apri il menu del browser (⋮) e scegli «Installa app» o «Aggiungi a schermata Home».", en: "Open the browser menu (⋮) and choose 'Install app' or 'Add to Home screen'.", de: "Browsermenü (⋮) öffnen und „App installieren“ wählen.", fr: "Ouvrez le menu du navigateur (⋮) et choisissez « Installer l'application ».", es: "Abre el menú del navegador (⋮) y elige «Instalar aplicación» o «Añadir a pantalla de inicio»." },
  export_file: { it: "Esporta tutto (file)", en: "Export all (file)", de: "Alles exportieren", fr: "Tout exporter", es: "Exportar todo (archivo)" },
  import_file: { it: "Importa da file", en: "Import from file", de: "Aus Datei importieren", fr: "Importer un fichier", es: "Importar desde archivo" },
  import_hint: { it: "Per portare i dati su un'altra versione dell'app (es. quella online): esporta qui, poi importa là. Include birre, foto, logo, info locale e voti.", en: "To move data to another copy of the app (e.g. the live one): export here, import there.", de: "Daten übertragen: hier exportieren, dort importieren.", fr: "Pour transférer les données : exportez ici, importez là-bas.", es: "Para llevar los datos a otra versión de la app (p. ej. la online): exporta aquí e importa allá. Incluye cervezas, fotos, logo, info del local y valoraciones." },
  import_confirm: { it: "Sostituire birre, info locale e voti con quelli del file? (Prima salvo una copia di adesso.)", en: "Replace beers, venue info and ratings with the file's? (A copy of now is saved first.)", de: "Mit den Daten der Datei ersetzen? (Vorher wird gesichert.)", fr: "Remplacer par les données du fichier ? (Une copie est faite avant.)", es: "¿Sustituir cervezas, info del local y valoraciones con los del archivo? (Antes guardaré una copia actual)." },
  import_done: { it: "Importazione completata", en: "Import completed", de: "Import abgeschlossen", fr: "Importation terminée", es: "Importación completada" },
  tap_waiting: { it: "In attesa", en: "Waiting", de: "Wartet", fr: "En attente", es: "En espera" },
  tap_pouring: { it: "in spina", en: "pouring", de: "am Hahn", fr: "en service", es: "en grifo" },
  will_replace: { it: "la sostituirà all'arrivo", en: "will replace it on arrival", de: "ersetzt es bei Ankunft", fr: "la remplacera à l'arrivée", es: "la sustituirá al llegar" },
  already_waiting: { it: "già in attesa", en: "already waiting", de: "wartet bereits", fr: "déjà en attente", es: "ya en espera" },
  moved_to_history: { it: "spostata nello storico", en: "moved to history", de: "in den Verlauf verschoben", fr: "déplacée dans l'historique", es: "movida al histórico" },
  queue: { it: "Metti in arrivo", en: "Mark as coming", de: "Als kommend markieren", fr: "Mettre en attente", es: "Poner en camino" },
  queue_hint: { it: "Esce dallo storico e va in «Prossimamente», senza andare ancora in menu. Scegli la spina su cui arriverà (può essere occupata).", en: "Leaves the history and goes to 'Coming soon' without going on the menu yet. Pick its future tap (may be occupied).", de: "Verlässt den Verlauf und erscheint unter „Demnächst“. Zukünftigen Hahn wählen.", fr: "Quitte l'historique et passe en « Bientôt ». Choisissez sa future pression.", es: "Sale del histórico y va a «Próximamente», sin entrar aún en el menú. Elige el grifo al que llegará (puede estar ocupado)." },
  tv_screen: { it: "Schermo TV", en: "TV screen", de: "TV-Bildschirm", fr: "Écran TV", es: "Pantalla TV" },
  tv_fullscreen: { it: "Schermo intero", en: "Full screen", de: "Vollbild", fr: "Plein écran", es: "Pantalla completa" },
  tv_next: { it: "In arrivo sulla", en: "Next on", de: "Als Nächstes an", fr: "Bientôt sur", es: "Próximamente en el" },
  tv_tap: { it: "spina", en: "tap", de: "Zapfhahn", fr: "tireuse", es: "grifo" },
  tv_empty: { it: "Nessuna birra alla spina", en: "No beers on tap", de: "Keine Biere vom Fass", fr: "Aucune bière à la pression", es: "No hay cervezas de barril" },
  tap_free: { it: "Libera", en: "Free", de: "Frei", fr: "Libre", es: "Libre" },
  tap_occupied_by: { it: "occupata da", en: "taken by", de: "belegt von", fr: "occupée par", es: "ocupado por" },
  rate_this: { it: "Il tuo voto", en: "Your rating", de: "Deine Bewertung", fr: "Votre note", es: "Tu valoración" },
  rated_thanks: { it: "Grazie per il voto!", en: "Thanks for rating!", de: "Danke für die Bewertung!", fr: "Merci pour votre note !", es: "¡Gracias por tu valoración!" },
  rating_updated: { it: "Voto aggiornato!", en: "Rating updated!", de: "Bewertung geändert!", fr: "Note modifiée !", es: "¡Valoración actualizada!" },
  rating_removed: { it: "Voto cancellato", en: "Rating removed", de: "Bewertung gelöscht", fr: "Note supprimée", es: "Valoración eliminada" },
  rating_remove: { it: "Cancella voto", en: "Remove rating", de: "Bewertung löschen", fr: "Supprimer la note", es: "Borrar valoración" },
  rating: { it: "Voto",en: "Rating", de: "Bewertung", fr: "Note", es: "Valoración" },
  votes: { it: "voti", en: "votes", de: "Stimmen", fr: "votes", es: "votos" },
  notify_me: { it: "Avvisami quando arriva", en: "Notify me when it arrives", de: "Benachrichtige mich", fr: "Prévenez-moi", es: "Avísame cuando llegue" },
  notify_placeholder: { it: "La tua email", en: "Your email", de: "Deine E-Mail", fr: "Votre e-mail", es: "Tu correo electrónico" },
  notify_send: { it: "Avvisami", en: "Notify me", de: "Benachrichtigen", fr: "Prévenez-moi", es: "Avísame" },
  notify_ok: { it: "Fatto! Ti scriveremo appena è alla spina.", en: "Done! We'll email you as soon as it's on.", de: "Erledigt! Wir schreiben dir, sobald es da ist.", fr: "C'est noté ! Nous vous écrirons dès son arrivée.", es: "¡Hecho! Te escribiremos en cuanto esté pinchada." },
  notify_privacy: { it: "Una sola email, solo per questa birra.", en: "Just one email, only for this beer.", de: "Nur eine E-Mail, nur für dieses Bier.", fr: "Un seul e-mail, uniquement pour cette bière.", es: "Un solo correo, solo para esta cerveza." },
  invalid_email: { it: "Email non valida", en: "Invalid email", de: "Ungültige E-Mail", fr: "E-mail invalide", es: "Correo electrónico no válido" },
  subscribers: { it: "iscritti all'avviso", en: "waiting for notice", de: "warten auf Nachricht", fr: "en attente d'alerte", es: "suscritos al aviso" },
  notified: { it: "Avviso in invio agli iscritti", en: "Sending notice to subscribers", de: "Benachrichtigung wird gesendet", fr: "Envoi de l'alerte aux inscrits", es: "Aviso enviándose a los suscritos" },
  take_off_tap: { it: "Togli dal menu (va nello storico)", en: "Remove from menu (to history)", de: "Von der Karte nehmen (Verlauf)", fr: "Retirer du menu (historique)", es: "Quitar del menú (va al histórico)" },
  history: { it: "Storico", en: "History", de: "Verlauf", fr: "Historique", es: "Histórico" },
  history_hint: { it: "Birre già passate da noi: rimettile nel menu con un tocco, tornano dove erano.", en: "Beers we've had before: bring them back with one tap, to where they were.", de: "Frühere Biere: mit einem Tipp zurück an ihren Platz.", fr: "Bières déjà servies : remettez-les en un geste, à leur place.", es: "Cervezas que ya han pasado por aquí: añádelas de nuevo con un toque, volverán a donde estaban." },
  history_empty: { it: "Ancora nessuna birra nello storico.", en: "No beers in the history yet.", de: "Noch keine Biere im Verlauf.", fr: "Aucune bière dans l'historique.", es: "Aún no hay cervezas en el histórico." },
  restore: { it: "Rimetti nel menu", en: "Put back", de: "Zurückholen", fr: "Remettre", es: "Volver a poner en el menú" },
  restored: { it: "Birra rimessa nel menu", en: "Beer back on the menu", de: "Bier wieder auf der Karte", fr: "Bière remise au menu", es: "Cerveza devuelta al menú" },
  backups: { it: "Backup", en: "Backups", de: "Backups", fr: "Sauvegardes", es: "Copias de seguridad" },
  backups_hint: { it: "Ogni notte alle 4:00 salvo una copia completa di birre, info locale e voti (si tengono 30 giorni). Ripristinando, torna tutto com'era in quel momento; prima faccio comunque una copia di com'è adesso.", en: "Every night at 4:00 a full copy of beers, venue info and ratings is saved (kept 30 days). Restoring brings everything back to that moment; a copy of the current state is taken first.", de: "Jede Nacht um 4:00 wird eine Kopie gespeichert (30 Tage). Beim Wiederherstellen wird vorher der aktuelle Stand gesichert.", fr: "Chaque nuit à 4h00 une copie complète est enregistrée (30 jours). Avant une restauration, l'état actuel est sauvegardé.", es: "Cada noche a las 4:00 se guarda una copia completa (se mantienen 30 días). Al restaurar, todo vuelve a como estaba entonces; antes se hará una copia actual." },
  backup_now: { it: "Fai un backup adesso", en: "Back up now", de: "Jetzt sichern", fr: "Sauvegarder maintenant", es: "Hacer copia de seguridad ahora" },
  backup_done: { it: "Backup creato", en: "Backup created", de: "Backup erstellt", fr: "Sauvegarde créée", es: "Copia de seguridad creada" },
  backup_restore: { it: "Ripristina", en: "Restore", de: "Wiederherstellen", fr: "Restaurer", es: "Restaurar" },
  backup_confirm: { it: "Riportare birre, info locale e voti a com'erano in questo backup? Le modifiche fatte dopo verranno annullate (ma salvo prima una copia di adesso).", en: "Bring beers, venue info and ratings back to this backup? Later changes will be undone (a copy of now is saved first).", de: "Auf diesen Stand zurücksetzen? Spätere Änderungen gehen verloren (vorher wird gesichert).", fr: "Revenir à cette sauvegarde ? Les changements ultérieurs seront annulés (une copie est faite avant).", es: "¿Restaurar cervezas, info del local y valoraciones a este punto? Los cambios posteriores se anularán (se guardará una copia actual)." },
  backup_restored: { it: "Ripristinato! Se ti sei sbagliato, ripristina la copia «Prima del ripristino».", en: "Restored! If that was a mistake, restore the 'Before restore' copy.", de: "Wiederhergestellt! Bei Irrtum die Kopie „Vor Wiederherstellung“ zurückholen.", fr: "Restauré ! En cas d'erreur, restaurez la copie « Avant restauration ».", es: "¡Restaurado! Si te has equivocado, restaura la copia «Antes de restaurar»." },
  backup_empty: { it: "Ancora nessun backup: il primo arriva stanotte, oppure crealo ora.", en: "No backups yet: the first one comes tonight, or create one now.", de: "Noch keine Backups.", fr: "Aucune sauvegarde pour l'instant.", es: "Aún no hay copias: la primera se hará esta noche, o créala ahora." },
  kind_daily: { it: "Automatico", en: "Automatic", de: "Automatisch", fr: "Automatique", es: "Automático" },
  kind_manual: { it: "Manuale", en: "Manual", de: "Manuell", fr: "Manuel", es: "Manual" },
  "kind_pre-restore": { it: "Prima del ripristino", en: "Before restore", de: "Vor Wiederherstellung", fr: "Avant restauration", es: "Antes de restaurar" },
  beer_word_one: { it: "birra", en: "beer", de: "Bier", fr: "bière", es: "cerveza" },
  beers_word: { it: "birre", en: "beers", de: "Biere", fr: "bières", es: "cervezas" },
  archived: { it: "Spostata nello storico", en: "Moved to history", de: "In den Verlauf verschoben", fr: "Déplacée dans l'historique", es: "Movida al histórico" },
  no_free_tap: { it: "Nessuna spina libera: assegna il numero a mano", en: "No free tap: set the number manually", de: "Kein Hahn frei: Nummer manuell setzen", fr: "Aucune pression libre : attribuez le numéro", es: "Ningún grifo libre: asigna el número manualmente" },
  last_on_tap: { it: "Ultima volta", en: "Last on tap", de: "Zuletzt", fr: "Dernière fois", es: "Última vez" },
  unsub_title: { it: "Avviso annullato", en: "Notification cancelled", de: "Benachrichtigung abbestellt", fr: "Alerte annulée", es: "Aviso cancelado" },
  unsub_body: { it: "Non riceverai più email per questa birra.", en: "You won't receive more emails for this beer.", de: "Du erhältst keine E-Mails mehr zu diesem Bier.", fr: "Vous ne recevrez plus d'e-mails pour cette bière.", es: "Ya no recibirás correos para esta cerveza." },
  unsub_done_already: { it: "Questo avviso era già stato annullato o inviato.", en: "This notice was already cancelled or sent.", de: "Diese Benachrichtigung wurde bereits abbestellt oder gesendet.", fr: "Cette alerte a déjà été annulée ou envoyée.", es: "Este aviso ya se había cancelado o enviado." },
  poster: { it: "Poster QR", en: "QR poster", de: "QR-Poster", fr: "Affiche QR", es: "Póster QR" },
  print: { it: "Stampa", en: "Print", de: "Drucken", fr: "Imprimer", es: "Imprimir" },
  scan_title: { it: "Inquadra e scopri le birre di oggi", en: "Scan to see today's beers", de: "Scannen und die Biere von heute entdecken", fr: "Scannez pour découvrir les bières du jour", es: "Escanea y descubre las cervezas de hoy" },
  admin_search: { it: "Cerca nome, birrificio, stile o annata…", en: "Search name, brewery, style or vintage…", de: "Name, Brauerei, Stil oder Jahrgang suchen…", fr: "Rechercher nom, brasserie, style ou millésime…", es: "Buscar nombre, cervecería, estilo o añada…" },
  f_available: { it: "Disponibili", en: "Available", de: "Verfügbar", fr: "Disponibles", es: "Disponibles" },
  f_last: { it: "Ultime bottiglie", en: "Last bottles", de: "Letzte Flaschen", fr: "Dernières bouteilles", es: "Últimas botellas" },
  f_sold_out: { it: "Esaurite", en: "Sold out", de: "Ausverkauft", fr: "Épuisées", es: "Agotadas" },
  f_arriving: { it: "In arrivo", en: "Coming", de: "Kommt bald", fr: "Bientôt", es: "Próximamente" },
  f_no_photo: { it: "Senza foto", en: "No photo", de: "Ohne Foto", fr: "Sans photo", es: "Sin foto" },
  f_no_abv: { it: "Senza gradazione", en: "No ABV", de: "Ohne Alkoholangabe", fr: "Sans degré", es: "Sin graduación" },
  to_fix: { it: "Da sistemare", en: "To fix", de: "Zu erledigen", fr: "À compléter", es: "Por completar" },
  show_label: { it: "Mostra", en: "Show", de: "Zeigen", fr: "Afficher", es: "Mostrar" },
  expand_all: { it: "Apri tutti", en: "Expand all", de: "Alle öffnen", fr: "Tout ouvrir", es: "Abrir todos" },
  collapse_all: { it: "Chiudi tutti", en: "Collapse all", de: "Alle schließen", fr: "Tout fermer", es: "Cerrar todos" },
  tools: { it: "Strumenti", en: "Tools", de: "Werkzeuge", fr: "Outils", es: "Herramientas" },
  added_one: { it: "Aggiunta una bottiglia", en: "One bottle added", de: "Eine Flasche hinzugefügt", fr: "Une bouteille ajoutée", es: "Una botella añadida" },
  abv_missing: { it: "% ?", en: "% ?", de: "% ?", fr: "% ?", es: "% ?" },
  history_show: { it: "Mostra storico", en: "Show history", de: "Verlauf zeigen", fr: "Afficher l'historique", es: "Mostrar histórico" },
  history_hide: { it: "Nascondi storico", en: "Hide history", de: "Verlauf ausblenden", fr: "Masquer l'historique", es: "Ocultar histórico" },
  breweries_word: { it: "birrifici", en: "breweries", de: "Brauereien", fr: "brasseries", es: "cervecerías" },
} satisfies Record<string, Record<Lang, string>>;

export type TKey = keyof typeof DICT;

const STORAGE_KEY = "cassina_lang";
const listeners = new Set<() => void>();

const isLang = (v: string | null | undefined): v is Lang => LANGS.some((l) => l.code === v);

// A language the customer picked wins; otherwise follow the phone's language if we have it, else Italian.
function readLang(): Lang {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (isLang(saved)) return saved;
  const phone = typeof navigator !== "undefined" ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  for (const tag of phone) {
    const code = tag?.toLowerCase().split("-")[0];
    if (isLang(code)) return code;
  }
  return "it";
}

let current: Lang = readLang();
if (typeof document !== "undefined") document.documentElement.lang = current;

export function setLang(lang: Lang): void {
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, () => current);
  const t = (key: TKey) => DICT[key][lang];
  const price = (v: number) =>
    new Intl.NumberFormat(LOCALES[lang], { style: "currency", currency: "EUR" }).format(v);
  const abv = (v: number) =>
    `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 }).format(v)}%`;
  // Gradazione per i clienti: 0 = "non nota" (non mostrata), tranne per le analcoliche.
  const abvOf = (b: { abv: number; analcolica: boolean }) => (b.abv > 0 || b.analcolica ? abv(b.abv) : "");
  return { lang, t, price, abv, abvOf };
}
