# Prenotazioni tavoli — database

Il gestionale prenotazioni (`/prenotazioni/`, file `public/prenotazioni/index.html`) usa lo stesso
progetto Supabase della lista birre, ma i suoi dati stanno in uno **schema separato `prenotazioni`**,
non esposto alle API: le tabelle non si leggono né si scrivono direttamente.

| Tabella | Contenuto |
|---|---|
| `prenotazioni.staff` | colleghi: nome, PIN cifrato (bcrypt), ruolo `admin`/`staff`, blocco dopo 5 PIN errati |
| `prenotazioni.sessioni` | accessi attivi (token casuale, scadenza 60 giorni) |
| `prenotazioni.prenotazioni` | una riga per prenotazione: `data` + documento JSON `dati` |
| `prenotazioni.config` | `versione` (contatore modifiche, per la sincronizzazione) e `chiusure` |
| `prenotazioni.rubrica` | nomi e note private della rubrica clienti (solo admin) |
| `prenotazioni.blacklist` | clienti segnalati: chiave = telefono normalizzato (o `nome:<nome>`), elenco no show, note, bloccato |
| `prenotazioni.ricorrenti` | clienti abituali: giorni, fasce, tavoli; `skip` = date eliminate a mano |

L'app passa solo dalle funzioni `public.pren_*` (security definer), che controllano il token di sessione:

- accesso: `pren_stato`, `pren_setup` (crea il primo admin, solo se non esiste nessuno), `pren_login`, `pren_logout`, `pren_me`, `pren_cambia_pin`
- dati: `pren_carica`, `pren_versione`, `pren_salva` (rifiuta tavolo+fascia già occupati), `pren_elimina`, `pren_salva_chiusure`
- solo admin: `pren_rubrica`, `pren_rubrica_salva`, `pren_verifica_pin`, `pren_staff`, `pren_staff_aggiungi`, `pren_staff_rimuovi`

Le migrazioni applicate sono `prenotazioni_schema`, `prenotazioni_fix_login`, `prenotazioni_login_no_rollback`
(Supabase → Database → Migrations). Questi dati non sono compresi nei backup notturni della lista birre.

## Funzionamento senza internet

- `public/prenotazioni/sw.js` salva una copia della pagina: si apre anche senza rete (dopo la prima visita).
- La pagina tiene sul telefono l'ultima copia delle prenotazioni (`localStorage`: `pren_cache`) e una coda
  delle modifiche fatte offline (`pren_outbox`), che parte da sola al ritorno della rete. Se nel frattempo
  un collega ha occupato lo stesso tavolo, la modifica viene scartata e mostrata in "Modifiche non salvate".
- Menu ⋯ → "Stampa il servizio": copia di emergenza su carta della giornata.

## Clienti abituali

Ogni regola in `prenotazioni.ricorrenti` genera le prenotazioni delle prossime 8 settimane
(id `ric_<regola>_<data>_<servizio>`, campo `ric` nel documento). La generazione avviene in `pren_carica`
(quindi ogni volta che qualcuno apre o aggiorna l'app) e in `pren_ricorrente_salva`. Salta i giorni chiusi,
le date eliminate a mano (`skip`) e i tavoli già occupati (mostrati come conflitti in `pren_ricorrenti`).
Una data modificata a mano prende `ricMod: true` e non viene più toccata quando cambia la regola.
Migrazioni: `prenotazioni_ricorrenti_tabella`, `prenotazioni_ricorrenti_funzioni`.

## No show e black list

`pren_noshow(token, id, vero/falso)` segna il no show su una prenotazione (il tavolo torna libero: le
prenotazioni con `noshow: true` non contano nei controlli di sovrapposizione) e aggiorna la black list.
`pren_carica` restituisce anche `blacklist`. Tutti possono segnare no show e aggiungere a mano
(`pren_blacklist_salva`); solo l'amministratore può togliere qualcuno (`pren_blacklist_rimuovi`).
Nell'app: 1 no show = avviso giallo, 2 o più (o "bloccato") = avviso rosso quando si inserisce nome o telefono.
Migrazione: `prenotazioni_blacklist`.
