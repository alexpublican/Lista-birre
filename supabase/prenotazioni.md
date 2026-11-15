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

L'app passa solo dalle funzioni `public.pren_*` (security definer), che controllano il token di sessione:

- accesso: `pren_stato`, `pren_setup` (crea il primo admin, solo se non esiste nessuno), `pren_login`, `pren_logout`, `pren_me`, `pren_cambia_pin`
- dati: `pren_carica`, `pren_versione`, `pren_salva` (rifiuta tavolo+fascia già occupati), `pren_elimina`, `pren_salva_chiusure`
- solo admin: `pren_rubrica`, `pren_rubrica_salva`, `pren_verifica_pin`, `pren_staff`, `pren_staff_aggiungi`, `pren_staff_rimuovi`

Le migrazioni applicate sono `prenotazioni_schema`, `prenotazioni_fix_login`, `prenotazioni_login_no_rollback`
(Supabase → Database → Migrations). Questi dati non sono compresi nei backup notturni della lista birre.
