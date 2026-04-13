# Sito pubblico – Moduli dinamici GREST

Interfaccia **solo compilazione** per l’utente finale: nessun login, nessun pannello amministrativo. I moduli si creano e si configurano nell’app **admin** (`apps/admin`); questo sito legge lo schema dal backend e invia le risposte con `POST` (payload invariato rispetto ai contratti del progetto).

---

## Requisiti

- Node.js 18+
- npm
- Backend API in esecuzione (vedi [`backend/README.md`](../../backend/README.md))

---

## Configurazione ambiente

Copia l’esempio e personalizza (`.env.local` non va committato):

```bash
cp apps/public/.env.example apps/public/.env.local
```

| Variabile | Obbligatorio | Descrizione |
|-----------|--------------|-------------|
| `NEXT_PUBLIC_API_URL` | **Sì** | Base URL del backend (es. `http://localhost:8000` o `https://api.tuodominio.it`). Senza questa variabile l’app non può chiamare l’API. |
| `NEXT_PUBLIC_PUBLIC_SITE_URL` | No | URL del **sito pubblico** così com’è servito agli utenti (es. `https://www.iscrizioni.grestcastelfranco.com` o in locale `http://localhost:3000`). Usato per costruire il link **«Modifica risposta»** dopo un invio riuscito (`/modifica?submission=<uuid>`). Slash finale opzionale (viene normalizzato). Se assente, dopo l’invio non viene mostrato il link (il salvataggio resta valido). |

**Nota:** non c’è modalità mock: il frontend parla sempre con il backend reale.

---

## Avvio

Dalla **root del monorepo**:

```bash
npm run dev
```

Oppure solo questa app:

```bash
cd apps/public && npm run dev
```

Porta predefinita Next.js: **http://localhost:3000**.

Dopo `npm run build`, **`npm start`** nella cartella `apps/public` serve la build statica in **`out/`** sulla porta 3000 (non è più `next start`, compatibile con GitHub Pages).

Build di produzione (genera la cartella statica `apps/public/out/`):

```bash
npm run build --workspace=apps/public
```

Serve `NEXT_PUBLIC_API_URL` in ambiente (es. `.env.local` in locale).

---

## Route

| Path | Comportamento |
|------|----------------|
| `/` | Reindirizza a `/in-arrivo`. |
| `/in-arrivo` | Messaggio temporaneo sulle iscrizioni in arrivo (stesso testo anche da 404 e da link modulo non valido). |
| `/form?guid=…` | Carica il modulo con `GET /api/modules/{guid}` e mostra il form multi-step. |
| `/modifica?submission=…` | Modifica una compilazione già inviata: `GET /api/public/submissions/{id}` + invio con `PATCH` (stesso body del submit). Richiede endpoint pubblici sul backend. |

Il valore di **`guid`** è lo slug pubblico del modulo (di solito il **GUID** configurato in admin).  
Il parametro **`submission`** è l’**UUID** della riga in `submissions.id` restituito al primo invio (`submissionId` / `submissionIds` nella risposta POST submit).  
I vecchi link **`/form/<guid>`** (path) su hosting statico vengono reindirizzati automaticamente dalla pagina `404.html` al formato con query.

### GitHub Pages (deploy automatico)

Nel repository è definito il workflow [`.github/workflows/deploy-github-pages.yml`](../../.github/workflows/deploy-github-pages.yml).

1. **Settings → Pages →** sorgente **GitHub Actions** (non “Deploy from branch”).
2. **Settings → Secrets and variables → Actions →** crea il secret **`NEXT_PUBLIC_API_URL`** con l’URL base del backend (es. `https://api.grestcastelfranco.com`).
3. Push su un branch che **attiva il workflow** (vedi `.github/workflows/deploy-github-pages.yml`: di solito `main`, `master`, `develop`, `production`). Se hai pushato su un altro branch, la pipeline **non** parte; unisci su `main` o lancia **Actions → Deploy public site… → Run workflow** (pulsante *workflow_dispatch*).
4. **DNS**: CNAME `www.iscrizioni.grestcastelfranco.com` → `<tuo-utente>.github.io` (come da [documentazione GitHub](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)); il file `public/CNAME` nel progetto pubblico allinea il dominio al deploy.
5. Sul backend, includi l’origine del sito in **CORS** (`API_ORIGINS` o equivalente).

In locale, dopo la build statica, puoi aprire `apps/public/out/index.html` tramite un server statico (non `file://` per le policy del browser).

#### Se vedi ancora il README del repository (o una pagina sbagliata)

Succede quando **GitHub Pages non sta usando il deploy da Actions**, ma ancora **“Deploy from a branch”** (es. branch `main` e cartella `/ (root)`): in quel caso GitHub mostra i file del repo (README, ecc.), **non** la cartella `out/` generata in CI.

Oppure stai aprendo **`github.com/…/…`** (pagina del repository): lì il README è **normale**. Il sito pubblico è solo l’URL sotto **Pages** o il **dominio custom** (es. `https://www.iscrizioni.grestcastelfranco.com`), non l’interfaccia GitHub. In **Settings → Pages** controlla l’URL indicato e “Visit site”.

1. Vai in **Settings → Pages → Build and deployment**.
2. **Source** deve essere solo **GitHub Actions**, non *Deploy from a branch*. Se vedi un branch selezionato, cambia in **GitHub Actions** e salva.
3. Controlla **Actions** nel repo: il workflow **“Deploy public site to GitHub Pages”** deve essere **verde** dopo ogni push. Se è rosso, apri il log (spesso manca il secret `NEXT_PUBLIC_API_URL`).
4. Apri il sito dall’URL indicato in Pages (**“Visit site”** o il dominio custom), **non** la pagina principale del repository `github.com/…/…` (quella è sempre codice + README).

#### “Next.js by GitHub Actions” nelle impostazioni Pages

È solo un **preset / suggerimento** dell’interfaccia GitHub. Non devi per forza usarlo: il deploy reale è il file **`.github/workflows/deploy-github-pages.yml`** in questo repo. L’importante è che la sorgente sia **GitHub Actions** e che quella workflow sia quella che gira. Se in passato hai aggiunto **un’altra** workflow “Next.js” dal wizard di GitHub, può essere in conflitto: tieni solo questa o assicurati che non ci siano due deploy diversi.

#### Sito su `https://<utente>.github.io/<nome-repo>/` (senza dominio custom)

Next genera asset in `/_next/…`. Su **project site** il sito è servito sotto `/<nome-repo>/`, quindi servono `basePath` e `assetPrefix`. Finché usi solo il **dominio custom** puntato a Pages, resti sulla root e **non** serve `basePath`. Se testi solo l’URL `github.io/repo/`, chiedi o aggiungi configurazione `basePath` (vedi issue / documentazione avanzata).

---

## Comportamento del form (implementazione attuale)

- **Multi-step**: navigazione Avanti / Indietro; validazione solo sui campi visibili dello step corrente.
- **Invio**: solo sull’ultimo step (bottone **Invia** e tastiera **Invio** non inviano prima del tempo).
- **Campi condizionali**: `showIf` e `requiredIf` con operatori scalari (`eq`, `neq`, `in`, `notIn`, `empty`, `notEmpty`) e, per valori multipli (es. **checkbox-group**), anche `contains`, `notContains`, `intersects`, `notIntersects`. Per `in` / `notIn` con **select** o **radio**, il valore nel modulo è confrontato anche se arriva come numero (stringhe in `value` nel JSON).
- **Tipi campo** supportati in UI: testo, email, numero, textarea, select, radio, checkbox, **checkbox-group** (array di stringhe selezionate), switch, data.
- **Validazione**: registry lato client (es. `nome_it`, `codice_fiscale`, `email`, …) allineato alle specifiche del progetto.
- **Submit**: il payload **non è stato modificato** rispetto al contratto:

```json
{
  "moduleId": "id-modulo",
  "submittedAt": "2026-03-01T12:00:00.000Z",
  "responses": { "id_campo": "valore o numero o booleano o array di stringhe" }
}
```

- **Pagina di ringraziamento**: dopo invio riuscito, testi da `meta.thankYou` (titolo, corpo, note).

### Step ripetuti (`repeatFromField`)

Se uno **step** nello schema include `repeatFromField: { countFieldId, minCount?, maxCount? }`:

- **N** viene letto dal campo `countFieldId` (tipicamente `number`, definito in uno **step precedente**), convertito in intero e limitato con `minCount` / `maxCount` se presenti; il risultato è almeno 0.
- Lo step viene mostrato **N volte** in sequenza (o una sola schermata informativa se N = 0).
- Le risposte di ogni istanza sono salvate in `responses` con **convenzione stabile a chiavi piatte**: `idCampo_0`, `idCampo_1`, … (es. `cognome_0`, `cognome_1`).
- `showIf` / `requiredIf` sui campi **di quello step ripetuto** usano automaticamente i valori suffissati per l’istanza corrente; i riferimenti a campi di **altri** step o a **countFieldId** usano i nomi così come in `responses` (senza suffisso, per i campi non ripetuti).
- Per condizioni che devono puntare a un’istanza specifica, si può usare il campo `field` con la chiave già suffissata (es. `nome_0`) nello schema JSON.

Moduli **senza** `repeatFromField` non cambiano comportamento: un solo campo `id` per campo come prima.

### Dipendenze tra step e valori “globali”

Lo stato del form è un unico oggetto `responses` piatto: le condizioni (`evaluateCondition`) vedono **tutte** le chiavi già registrate (step precedenti, istanze ripetute, ecc.). Non serve duplicare la logica: i campi di step successivi possono leggere ad esempio `classe_frequentata` se quel `id` è stato compilato prima.

### Email dopo invio (solo messaggio UX)

L’invio email è gestito **interamente dal backend** su `POST /api/forms/{moduleId}/submit` (stesso endpoint di sempre).

Se nello **schema del modulo** (già caricato per il form) è presente `emailOnSubmit.enabled === true`, il sito pubblico mostra un **breve avviso informativo** anche **sopra il form** (oltre al messaggio sulla pagina di ringraziamento), senza promettere il contenuto dell’email. Testo orientativo:

> Dopo l’invio potresti ricevere una copia o una notifica per email (gestione lato server).

Dopo l’invio riuscito compare un messaggio analogo nella thank-you page. Dettagli su backend e template: [`docs/email-submission-templates.md`](../../docs/email-submission-templates.md).

---

## API usate dal frontend pubblico

- `GET {NEXT_PUBLIC_API_URL}/api/modules/{guid}` — schema JSON del modulo.
- `POST {NEXT_PUBLIC_API_URL}/api/forms/{moduleId}/submit` — invio compilazione.

Contratti completi: [`contratti_e_convenzioni.md`](../../contratti_e_convenzioni.md) nella root del repo.

---

## Collegamento con l’app admin (`apps/admin`)

L’**admin** è un’app separata (tipicamente porta **3001**): serve a creare utenti (login), elenco moduli, builder visuale dello schema JSON, opzioni modulo (meta, ringraziamento, **emailOnSubmit**, GUID pubblico, ecc.).

### Guida rapida (per chi prepara i moduli)

1. Avvia backend + admin come da [`apps/admin/README.md`](../admin/README.md).
2. **Login** → crea o apri un modulo → **Salva** lo schema sul server.
3. Imposta il **GUID** (o slug) usato nel link pubblico: `https://tuosito.it/form?guid=<slug>` (l’admin mostra l’URL completo se è configurato `NEXT_PUBLIC_PUBLIC_SITE_URL`).
4. Opzionale: in **Opzioni modulo** configura `emailOnSubmit` se vuoi l’invio email lato server; sul pubblico comparirà solo il messaggio informativo se `enabled === true`.
5. Assicurati che nel backend **`API_ORIGINS`** includa l’origine del sito pubblico (es. `http://localhost:3000` in sviluppo), altrimenti il browser bloccherà le chiamate CORS.

Per il dettaglio su builder, drag-and-drop, condizioni per tipo di campo, export JSON e troubleshooting: **leggi [`apps/admin/README.md`](../admin/README.md)**.

---

## Riferimenti utili

| Percorso | Contenuto |
|----------|-----------|
| [`apps/admin/README.md`](../admin/README.md) | Uso dell’admin, variabili, route, email dopo invio |
| [`backend/README.md`](../../backend/README.md) | Avvio API, env, test rapidi |
| [`docs/email-submission-templates.md`](../../docs/email-submission-templates.md) | SMTP, template Word, `emailOnSubmit` |
| [`specifiche_moduli_e_architettura.md`](../../specifiche_moduli_e_architettura.md) | Schema moduli e validazione |
| [`packages/shared`](../../packages/shared) | Tipi TypeScript condivisi (allineamento schema) |
