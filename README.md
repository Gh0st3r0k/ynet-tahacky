# Ynet · Aktivity

Responzívna webová aplikácia na plánovanie a evidenciu práce na internátoch. Postavená na **Vue 3 a Vite**, kompletne v slovenčine. Funguje bez účtu a bez serverovej databázy: všetky aktivity a postup sa ukladajú do **localStorage** v aktuálnom prehliadači.

**Adresa po zapnutí GitHub Pages:** <https://gh0st3r0k.github.io/ynet-tahacky/>

## Čo aplikácia dokáže

- Vytvoriť aktivitu s názvom, dátumom a popisom.
- Vybrať viac internátov naraz: ŠD Mladosť, Jura Hronca, Nikosa Belojanisa, Dobrovička a Mladá Garda.
- Na Mladosti pracovať s blokmi A1–A4, B1–B4, C1–C4 a D1–D4.
- Vybrať celý blok, celé poschodie alebo konkrétne izby. Nechýba **Vybrať úplne všetko** a zrušenie výberu.
- Pre každý blok použiť 8 poschodí a samostatnú serverovňu.
- Na poschodí vybrať osem izieb podľa zadaného zoznamu: `x1/1`, `x1/2`, `x2/1`, `x2/2`, `x4/1`, `x4/2`, `x5/1`, `x5/2`. `x` je číslo poschodia, napríklad `11/1` alebo `85/2`.
- Na ostatných internátoch začať s pracovným blokom **Hlavná budova** a pridať vlastné pomenované bloky. Ich skutočné členenie nie je prednastavené; poschodia a číslovanie používajú rovnaký model ako Mladosť.
- Nastaviť samostatné šablóny úloh pre izby a pre serverovne a vlastný zoznam úloh pre konkrétnu izbu alebo serverovňu.
- Otvoriť rýchly výber **internát → blok → poschodie/serverovňa → izba**. Kroky s jedinou možnosťou sa preskakujú.
- V každej miestnosti samostatne odškrtávať úlohy, zapísať poznámku a nastaviť príznaky **Otvorené generálnym kľúčom** a **Presúvalo sa vybavenie**.
- Jedným tlačidlom sa vrátiť na výber ďalšej izby.
- Použiť vzory výberu pre dvojlôžkové a trojlôžkové izby, párne/nepárne poschodia alebo serverovne.
- Zobraziť postup aktivity, vyhľadávať a kombinovať filtre podľa vzoru miest a stavu vrátane rozpracovaných miest.
- Exportovať a obnoviť všetky dáta v JSON zálohe. Import aj mazanie vyžadujú potvrdenie.
- Vyskúšať ukážkovú aktivitu bez ručného vypĺňania. Ukážka vznikne až po kliknutí na príslušné tlačidlo.

## Tmavá a svetlá téma

Predvolená tmavá téma vychádza z referenčného vzhľadu Ynet portálu: takmer čierne pozadie, grafitové karty, jemné okraje, oranžový akcent a zelené stavové indikátory. Téma sa vzťahuje aj na výber miest, formuláre, poznámky a dialógy.

Tlačidlom so slnkom/mesiacom v hornej lište alebo **Zmeniť tému** v bočnom menu prepnete medzi tmavou a svetlou témou. Voľba sa ukladá osobitne pod kľúčom `ynet-theme` a načíta sa ešte pred vykreslením aplikácie. Prepnutie témy nemení aktivity ani postup práce.

## Ako začať

1. Kliknite na **Nová aktivita** a vyplňte názov. Dátum a popis sú nepovinné.
2. Vyberte internáty. Zaškrtnutie pri bloku vyberie všetkých 65 miest: 64 izieb a serverovňu. Kliknutím na názov bloku otvoríte podrobný výber.
3. Upravte spoločné úlohy pre izby a serverovne. Prázdne riadky sa neuložia. Šablóna môže byť aj bez úloh.
4. Vytvorte aktivitu a kliknite na **Vybrať izbu**. Rovnaký výber zahŕňa aj serverovne.
5. Splňte úlohy, prípadne pridajte príznaky a poznámku, a kliknite na **Označiť miesto ako hotové**. Bez splnenia všetkých úloh miesto nemožno dokončiť.
6. Tlačidlom **Späť na výber izby** pokračujte na ďalšie miesto. Ukladanie prebieha automaticky.

Šablóny možno upraviť aj neskôr v prehľade aktivity. Zmeny sa použijú iba na miesta, ktoré nemajú vlastný zoznam. Existujúce úlohy si zachovajú svoje zaškrtnutia. Nová nesplnená úloha znovu otvorí predtým hotové miesto. Odstránenie úlohy zo šablóny ju odstráni zo všetkých miest používajúcich danú šablónu.

## Vlastné úlohy konkrétneho miesta

V izbe alebo serverovni kliknite na **Upraviť úlohy miesta**. Editor začne aktuálnym zoznamom; úlohy môžete doplniť, premenovať alebo odstrániť. Po uložení ide o **Vlastný zoznam**, ktorý platí iba pre dané miesto. Spoločné šablóny ani ostatné miestnosti sa nemenia. Neskoršie úpravy spoločnej šablóny vlastný zoznam neprepíšu.

Zaškrtnutia úloh, ktoré zostali v zozname, sa zachovajú. Pridaná nesplnená úloha znovu otvorí hotové miesto. Vlastný zoznam môže byť aj prázdny; miesto potom môžete dokončiť bez úloh. Tlačidlo **Obnoviť spoločnú šablónu** v editore odstráni vlastný zoznam a vráti miesto k aktuálnym spoločným úlohám.

Vlastné úlohy aj ich postup sa ukladajú do localStorage a JSON záloh. Staršie zálohy bez vlastných zoznamov naďalej fungujú; pôvodné aktivity sa nemusia vytvárať znova.

## Vzory výberu a filtre

Pri vytváraní aktivity nájdete pod blokmi sekciu **Rýchly výber podľa vzoru**:

- **Dvojlôžkové (/1)** vyberie izby končiace `/1`.
- **Trojlôžkové (/2)** vyberie izby končiace `/2`.
- **Izby · nepárne poschodia** alebo **Izby · párne poschodia** vyberie všetky izby na zodpovedajúcich poschodiach.
- **Všetky izby**, **Iba serverovne** a **Všetky miesta** umožňujú ďalšie hromadné výbery.

Zvoľte rozsah: aktuálny blok, označené bloky (bloky s aspoň jedným vybraným miestom), všetky bloky aktuálneho internátu alebo všetky zvolené internáty. Vzor môžete použiť na **nahradenie výberu v rozsahu**, **pridanie** alebo **odobratie**. Výber mimo rozsahu sa nemení. Pri nahradení vzorom izieb sa serverovne v danom rozsahu odznačia; na ich doplnenie použite **Iba serverovne → Pridať k výberu**.

V už vytvorenej aktivite sú rovnaké vzory dostupné vo filtri **Typ miesta**. Kombinujú sa s vyhľadávaním a filtrom **Stav miesta**:

- **Čaká · nezačaté**: zatiaľ žiadna splnená aktuálna úloha, príznak ani neprázdna poznámka.
- **Rozpracované · začaté**: aspoň jedna splnená aktuálna úloha, zapnutý príznak alebo neprázdna poznámka, ale miesto ešte nie je hotové.
- **Všetky nedokončené**: čakajúce aj rozpracované miesta.
- **Hotové**: všetky aktuálne úlohy sú splnené a miesto je označené ako hotové.

Samotné otvorenie miestnosti ani plánovanie vlastných úloh ju neoznačí ako rozpracovanú. Filtre nemenia dáta aktivity a tlačidlom **Zrušiť filtre** sa vrátite k celému zoznamu.

## Lokálne spustenie

Potrebujete **Node.js 24** a npm. Verzia Node je zapísaná aj v `.nvmrc`.

```bash
git clone https://github.com/Gh0st3r0k/ynet-tahacky.git
cd ynet-tahacky
npm ci
npm run dev
```

Otvorte adresu vypísanú Vite, obvykle `http://localhost:5173`. Telefón v rovnakej sieti môže použiť sieťovú adresu vypísanú serverom; port musí byť dostupný cez firewall. Vývojový server nie je určený na verejné nasadenie.

```bash
npm run build     # Produkčné súbory do dist/
npm run preview   # Lokálna kontrola produkčnej zostavy
npm test          # Jednotkové testy modelu a záloh
```

Fonty aj ikony sú súčasťou zostavy. Aplikácia pri používaní nenačítava externé fonty, analytiku ani API. Ilustrácia je vlastné SVG. Tmavá téma je vizuálne inšpirovaná dodanou snímkou Ynet portálu; nejde o prevzatý zdrojový kód portal.ynet.sk.

## Zverejnenie cez GitHub Pages

Repozitár už obsahuje workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Pred publikovaním najprv overí nastavenie GitHub Pages, potom overí testy, zostaví stránku a pri zmene vetvy `main` nasadí `dist/`. Pull requesty overujú aplikáciu bez prístupu k Pages a bez nasadenia.

### Prvé zapnutie

1. Otvorte [nastavenia Pages](https://github.com/Gh0st3r0k/ynet-tahacky/settings/pages).
2. V **Build and deployment → Source** zvoľte **GitHub Actions**. Nenastavujte publikovanie priamo z vetvy, pretože Vue zdrojové súbory sa musia najprv zostaviť.
3. Otvorte [Actions](https://github.com/Gh0st3r0k/ynet-tahacky/actions), vyberte **Overenie a nasadenie na GitHub Pages** a spustite **Run workflow → main**. Ak už po poslednom pushi prebieha úspešný beh, ďalší netreba.
4. Počkajte na úspešné dokončenie úloh **Testy a zostavenie** a **Zverejnenie stránky**.
5. Stránka bude dostupná na **<https://gh0st3r0k.github.io/ynet-tahacky/>**. GitHub môže potrebovať ešte krátky čas na jej sprístupnenie.

Ak GitHub Pages nie je dostupný pri súkromnom repozitári, skontrolujte podporu vo svojom GitHub pláne a nastaveniach organizácie. Ak nasadenie čaká na schválenie prostredia `github-pages`, skontrolujte ochranné pravidlá v nastaveniach repozitára.

### Chyba 404 pri nasadení

Ak `actions/deploy-pages` vypíše **Failed to create deployment (status: 404)** a **Ensure GitHub Pages has been enabled**, artefakt môže byť v poriadku, ale cieľové Pages ešte nie je pripravené. Hlásenie `punycode module is deprecated` je iba upozornenie a nie je príčinou tejto chyby.

1. Otvorte [Settings → Pages](https://github.com/Gh0st3r0k/ynet-tahacky/settings/pages) ako správca repozitára.
2. V **Build and deployment → Source** vyberte **GitHub Actions**. Povolené spúšťanie workflowov v **Settings → Actions** samo osebe Pages nezapína.
3. V karte **Actions** otvorte **Overenie a nasadenie na GitHub Pages** a cez **Run workflow → main** spustite nový beh s aktuálnym workflowom.
4. Ak už je zdroj nastavený správne, skontrolujte dostupnosť Pages pre daný repozitár/plán a prípadné pravidlá organizácie.

Workflow používa oficiálny `actions/configure-pages@v5` ešte pred inštaláciou závislostí. Pri nedostupnom Pages sa zastaví s odkazom na nastavenia a návodom v súhrne behu. Prvé zapnutie musí urobiť správca: podľa [dokumentácie configure-pages](https://github.com/actions/configure-pages/blob/v5/action.yml) ho bežný `GITHUB_TOKEN` nedokáže vykonať. Na bežné nasadenia po zapnutí nie je potrebný ďalší token ani tajomstvo.

### Ďalšie aktualizácie

```bash
npm ci
npm test
npm run build
git add .
git commit -m "Aktualizovať aplikáciu"
git push origin main
```

Každý push do `main` spustí nové overenie a nasadenie. Prípadné chyby nájdete v karte **Actions**. Priečinok `dist/` ani `node_modules/` sa necommitujú.

Aplikácia používa relatívnu cestu k súborom (`base: './'`) a navigáciu pomocou `#`. Funguje preto aj pod cestou `/ynet-tahacky/` a obnovenie otvorenej izby nepotrebuje serverové presmerovania ani vlastnú stránku `404.html`.

## Testy v prehliadači

Playwright overuje rovnaké scenáre v počítačovom aj mobilnom rozlíšení:

```bash
npx playwright install chromium
npm run test:e2e
```

Na Linuxe môže byť potrebné doinštalovať systémové knižnice cez `npx playwright install --with-deps chromium`. Pri už nainštalovanom Chromiu možno použiť:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Testy pokrývajú vytvorenie aktivity, hromadný výber a jeho zrušenie, vlastné bloky a viac internátov, preskakovanie krokov, izby aj serverovne, samostatné šablóny, príznaky, poznámky, uchovanie po obnovení stránky, úpravy šablón, import/export, potvrdenie mazania a ochranu poškodených dát.

## Ukladanie, zálohy a obmedzenia

- Kľúč v localStorage je `ynet-aktivity-v1`. Formát obsahuje `version: 1`, aktivity, vybrané miesta, šablóny, voliteľné `taskOverrides` pre vlastné zoznamy a postup každého miesta.
- Dáta sú viazané na konkrétny prehliadač a origin stránky. Lokálny server a GitHub Pages nemajú spoločné dáta. Na prenos použite **Správa dát → Exportovať všetky dáta**, potom **Obnoviť zo zálohy** na druhom zariadení.
- **Obnova nahradí všetky aktuálne aktivity.** Import nie je zlúčenie dát. Pred importom si uložte aktuálnu zálohu.
- Neexistuje serverová synchronizácia, spolupráca v reálnom čase, používateľské účty ani riadenie oprávnení. Ktokoľvek s prístupom k prehliadaču môže vidieť miestne údaje.
- Vymazanie údajov stránky alebo ukončenie súkromného režimu môže odstrániť rozpracovanú prácu. Pravidelne exportujte zálohy a nezapisujte citlivé osobné údaje.
- Pri chybe ukladania sa zobrazí upozornenie. Rozpracované dáta si stiahnite skôr, než stránku zatvoríte. Pri nečitateľnej zálohe aplikácia pôvodný obsah neprepisuje a ponúkne jeho stiahnutie.
- Pri zmene dát v inej karte sa ďalšie automatické zapisovanie pozastaví, aby sa údaje neprepisovali. Obnovte stránku; prípadné neuložené zmeny z aktuálnej karty môžete najprv exportovať.
- Aplikácia je statická stránka, nie inštalovateľná offline PWA. Na prvé otvorenie alebo opätovné načítanie je potrebné dostupné webové hostovanie; samotné uloženie údajov nevyžaduje server.

## Štruktúra projektu

```text
src/
  App.vue                     Navigácia, aktivity, práca v miestnosti a správa dát
  model.js                    Model miest, výpočty postupu a validácia záloh
  style.css                   Responzívne rozhranie
  dark-theme.css              Tmavá téma podľa referencie Ynet portálu
  components/
    CreateActivity.vue        Trojkrokové vytvorenie aktivity a výber miest
    RoomPicker.vue            Hierarchický výber s preskakovaním krokov
    TaskEditor.vue            Samostatné šablóny pre izby a serverovne
    TaskListEditor.vue        Editor spoločných aj vlastných zoznamov úloh
    Modal.vue                 Dialóg s ovládaním klávesnicou a zameraním
    Icon.vue                  Ikony Lucide
    BuildingArt.vue           Ilustrácia internátu
public/favicon.svg
tests/model.test.js           Testy dátového modelu
tests/e2e/activity.spec.js     Testy v prehliadači
tests/e2e/place-tools.spec.js  Vlastné úlohy, vzory výberu a stavové filtre
.github/workflows/pages.yml   Overenie a nasadenie
```
