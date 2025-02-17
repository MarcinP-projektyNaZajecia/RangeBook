# Książka Pobytu na Strzelnicy

Aplikacja webowa służąca do rejestrowania pobytu na strzelnicy, zgodna z wymogami z "ROZPORZĄDZENIA MINISTRA SPRAW WEWNĘTRZNYCH I ADMINISTRACJI z dnia 15 marca 2000 r. (Dz. U. Nr 18, poz. 234) w sprawie wzorcowego regulaminu strzelnic".

## Opis

Aplikacja umożliwia użytkownikom przeglądanie listy wpisów, dodawanie nowych wpisów (wraz z odręcznym podpisem) oraz usuwanie istniejących wpisów (po uwierzytelnieniu). 
Wykorzystuje Firebase do autentykacji i przechowywania danych, Cloudinary do przechowywania i generowania podpisanych URLi do zdjęć podpisów, oraz Express.js po stronie serwera. 
Frontend został zbudowany przy użyciu Vanilla JavaScript z routingiem za pomocą biblioteki `page.js` i stylowaniem z użyciem frameworku Bootstrap.

## Technologie

*   **Frontend:** HTML, CSS, JavaScript (Vanilla JS), Bootstrap, page.js, signature\_pad
*   **Backend:** Node.js, Express.js,  Firebase Admin SDK
*   **Baza danych:** Firebase (Firestore)
*   **Przechowywanie zdjęć:** Cloudinary
*   **Autentykacja:** Firebase Authentication
*   **Inne:** Webpack

## Funkcjonalności

*   **Rejestracja i logowanie:**
    *   Użytkownicy mogą tworzyć konta i logować się za pomocą Firebase Authentication (email i hasło).
    *   Po zalogowaniu, użytkownik widzi swój email (lub nazwę wyświetlaną, jeśli została ustawiona).
    *   Wylogowanie jest możliwe za pomocą dedykowanego przycisku.
*   **Dodawanie wpisów:**
    *   Tylko zalogowani użytkownicy mogą dodawać nowe wpisy.
    *   Formularz dodawania wpisu zawiera pola na:
        *   Imię i nazwisko (pole wymagane).
        *   Adres zamieszkania / numer i organ wydający pozwolenie na broń (pole wymagane).
        *   Podpis odręczny - użytkownik składa podpis za pomocą biblioteki `signature_pad`.
    *   Po złożeniu podpisu, jest on konwertowany na format PNG i przesyłany do Cloudinary.
    *   Aplikacja generuje podpisany URL do podpisu, co zapewnia bezpieczeństwo dostępu.
    *   Dane wpisu (imię, adres, URL podpisu, data i czas dodania) są zapisywane w bazie danych Firestore.
    *   Po dodaniu wpisu, użytkownik jest przekierowywany do strony głównej.
*   **Przeglądanie wpisów:**
    *   Lista wpisów jest dostępna na stronie głównej aplikacji.
    *   Wpisy są posortowane chronologicznie (od najnowszych).
    *   Każdy wpis zawiera:
        *   Datę i godzinę dodania wpisu.
        *   Imię i nazwisko.
        *   Adres zamieszkania / numer pozwolenia.
        *   Miniaturę podpisu (PPM można otworzyć pełnowymiarowy podpis).
*   **Usuwanie wpisów:**
    *   Tylko zalogowani użytkownicy mogą usuwać wpisy. Weryfikacja tożsamości użytkownika odbywa się za pomocą tokenów JWT.
    *   Użytkownik może usunąć pojedynczy wpis, klikając przycisk "Usuń" przy danym wpisie.
    *   Użytkownik może usunąć wiele wpisów naraz, zaznaczając je checkboxami i klikając przycisk "Usuń zaznaczone".
    *   Po usunięciu wpisu/wpisów, lista wpisów jest odświeżana.
*   **Zgodność z rozporządzeniem:**
    *   Aplikacja zbiera i przechowuje dane zgodnie z wymogami rozporządzenia (imię i nazwisko, adres zamieszkania / numer pozwolenia, podpis).
    *   Podpisy są generowane i przechowywane w sposób bezpieczny (Cloudinary).
    *   Aplikacja umożliwia wgląd do danych (przeglądanie wpisów) oraz ich usuwanie.

## Instalacja

1.  Sklonuj repozytorium:

    git clone https://github.com/MarcinP-projektyNaZajecia/RangeBook.git

2.  Przejdź do katalogu projektu:

    cd RangeBook

3.  Zainstaluj zależności:

    npm install

4.  Skonfiguruj Firebase:

    *   Utwórz projekt w Firebase Console ([https://console.firebase.google.com/](https://console.firebase.google.com/)).
    *   Dodaj aplikację webową do projektu.
    *   Skopiuj konfigurację Firebase i wklej ją do pliku `firebase.js`.
    *   Dodaj klucz prywatny z Firebase Admin SDK (serviceAccountKey.json) do katalogu głównego projektu.

5.  Skonfiguruj Cloudinary:

    *   Utwórz konto w Cloudinary ([https://cloudinary.com/](https://cloudinary.com/)).
    *   Skopiuj `cloud_name`, `api_key` i `api_secret` i ustaw je jako zmienne środowiskowe (np. w pliku `.env`).

6.  Uruchom serwer deweloperski:

    npm run dev

7.  Uruchom serwer produkcyjny:

    npm run build

8. Uruchom serwer backendu:
   
    npm run start

Serwer backendowy będzie nasłuchiwał na porcie 3000.

## Użycie

1.  Otwórz aplikację w przeglądarce pod adresem `http://localhost:8080` (dla serwera deweloperskiego) lub adresem serwera produkcyjnego.
2.  Zarejestruj się lub zaloguj, aby uzyskać dostęp do pełnej funkcjonalności.
3.  Przeglądaj istniejące wpisy w książce pobytu.
4.  Dodawaj nowe wpisy, wypełniając formularz i składając podpis elektroniczny.
5.  Usuwaj wpisy (pojedyncze lub zaznaczone).

## Autor

Marcin P.

## Licencja

MIT License
