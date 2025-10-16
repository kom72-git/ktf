# Nápověda k GitHub účtu / GitHub Account Help

## ⚠️ Důležité upozornění

Tento dokument poskytuje základní informace o správě GitHub účtů. **Tento repositář je aplikace pro katalogizaci známek a nemůže přímo vyřešit problémy s GitHub účtem.**

Pro oficiální podporu kontaktujte: https://support.github.com/

---

## Jak zrušit GitHub účet

### Krok 1: Přihlášení
Ujistěte se, že jste přihlášeni pod účtem, který chcete zrušit.

### Krok 2: Nastavení účtu
1. Klikněte na svůj profilový obrázek v pravém horním rohu
2. Vyberte **Settings** (Nastavení)
3. Přejděte dolů na **Account** (Účet) v levé nabídce
4. Najděte sekci **Delete your account** (Smazat váš účet)

### Krok 3: Potvrzení
GitHub vás vyzve k potvrzení smazání zadáním vašeho uživatelského jména a hesla.

**⚠️ Varování:** Smazání účtu je trvalé a nelze ho vrátit zpět!

### Důležité informace před smazáním účtu:
- Všechny vaše repozitáře budou smazány
- Všechny vaše příspěvky v repozitářích ostatních zůstanou, ale budou spojeny s anonymním uživatelem
- Forky vašich repozitářů zůstanou existovat

Více informací: https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-your-personal-account/deleting-your-personal-account

---

## Jak zrušit předplatné (GitHub Pro, Team, atd.)

### Downgrade na Free účet

1. Přejděte na https://github.com/settings/billing
2. Klikněte na **Change plan** nebo **Edit** vedle vašeho aktuálního plánu
3. Vyberte **Free** plán
4. Potvrďte změnu

**Poznámka:** Změna se projeví na konci aktuálního fakturačního období.

Více informací: https://docs.github.com/en/billing/managing-billing-for-your-github-account/downgrading-your-github-subscription

---

## Proč vidím starý účet spravující můj nový repozitář?

### Možné příčiny:

#### 1. Přihlášení pod více účty
GitHub v prohlížeči může mít uloženo více přihlášení. Zkuste:
- Odhlásit se ze všech účtů (Sign out)
- Vymazat cookies pro github.com
- Přihlásit se znovu pod správným účtem

#### 2. Repozitář je součástí organizace
Pokud je repozitář součástí organizace:
- Organizace může být spojena s vaším starým účtem
- Zkontrolujte nastavení organizace: https://github.com/settings/organizations
- Možná budete muset přenést vlastnictví repozitáře

#### 3. Přístupové tokeny nebo SSH klíče
Starý účet může mít stále aktivní přístupové tokeny:
- Zkontrolujte: https://github.com/settings/tokens
- Zkontrolujte SSH klíče: https://github.com/settings/keys
- Odeberte tokeny a klíče, které již nepoužíváte

#### 4. Git konfigurace na vašem počítači
Váš lokální git může mít uloženy přihlašovací údaje starého účtu:

```bash
# Zkontrolujte aktuální git konfiguraci
git config --list

# Změňte uživatelské jméno
git config --global user.name "VašeNovéJméno"

# Změňte email
git config --global user.email "vas@novy-email.com"

# Odeberte uložené přihlašovací údaje
git config --global --unset credential.helper
```

#### 5. Správa více účtů
Pokud potřebujete používat více GitHub účtů:
- Zvažte použití různých prohlížečů nebo profilů
- Použijte režim "Incognito/Private" pro druhý účet
- Nastavte různé SSH klíče pro různé účty

---

## Jak přenést repozitář na jiný účet

Pokud chcete přenést vlastnictví repozitáře:

1. Přejděte do nastavení repozitáře: `https://github.com/[username]/[repo]/settings`
2. Přejděte dolů na **Danger Zone**
3. Klikněte na **Transfer ownership**
4. Zadejte název repozitáře a nový účet/organizaci
5. Potvrďte transfer

**⚠️ Varování:** Transfer nelze vrátit zpět!

Více informací: https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository

---

## Užitečné odkazy

- GitHub Support: https://support.github.com/
- GitHub Dokumentace (English): https://docs.github.com/
- Nastavení účtu: https://github.com/settings
- Nastavení fakturace: https://github.com/settings/billing
- Nastavení bezpečnosti: https://github.com/settings/security
- GitHub Status (kontrola výpadků): https://www.githubstatus.com/

---

## Kontakt na GitHub Support

Pokud žádné z výše uvedených řešení nepomohlo:

1. Navštivte https://support.github.com/
2. Klikněte na **Contact us**
3. Popište váš problém (můžete psát anglicky nebo použít překladač)
4. GitHub Support vám odpoví obvykle do 24-48 hodin

---

*Tento dokument je pouze informativní a nepředstavuje oficiální dokumentaci GitHub.*
