import page from '/node_modules/page/page.mjs';
import { db, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, getDocs } from './firebase.js';
import SignaturePad from '/node_modules/signature_pad/dist/signature_pad.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../public/style.css';

let signaturePad;
const BACKEND_URL ='http://localhost:3000';

// Funkcja do pobierania wpisów z Firestore
async function getBookEntries() {
    const entries = [];
    const querySnapshot = await getDocs(collection(db, 'book_entries')); // Pobieramy wszystkie dokumenty z kolekcji 'book_entries'
    querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() }) // Dodajemy dane każdego dokumentu do tablicy (dodajemy id samego dokumentu i spreadujemy jego zawartość)
    });
    return entries;
}

// Funkcja do wyświetlania wpisów
async function renderEntries() {
    const entriesTable = document.getElementById('entriesTable');
    const entries = await getBookEntries();

    if (entries.length === 0) {
        entriesTable.innerHTML = "<tr><td colspan='6'>Brak wpisów w książce.</td></tr>";
        return;
    }

    entries.sort((a, b) => a.date_and_time.seconds - b.date_and_time.seconds);

    entriesTable.innerHTML = "";

    for (const entry of entries) {
        const row = document.createElement('tr');

        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.entryId = entry.id;
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        const dateCell = document.createElement('td');
        const date = new Date(entry.date_and_time.seconds * 1000);
        dateCell.textContent = date.toLocaleString();
        row.appendChild(dateCell);

        const nameCell = document.createElement('td');
        nameCell.textContent = entry.name;
        row.appendChild(nameCell);

        const addressCell = document.createElement('td');
        addressCell.textContent = entry.address_or_license;
        row.appendChild(addressCell);

        const signatureCell = document.createElement('td');
        try {
            const fetchURL = `${BACKEND_URL}/signed-url/${entry.signature_file_id}`;
            const response = await fetch(fetchURL);
            const responseText = await response.text();

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}, ${responseText}`);
                signatureCell.textContent = "Błąd pobierania podpisu: " + responseText;
            } else {
                try {
                    const data = JSON.parse(responseText);
                    const signedUrl = data.url;
                    const img = document.createElement('img');
                    img.src = signedUrl;
                    img.alt = "Podpis";
                    img.style.width = "100px";
                    img.style.height = "auto";
                    signatureCell.appendChild(img);
                } catch (jsonError) {
                    console.error("Błąd parsowania JSON:", jsonError, responseText);
                    signatureCell.textContent = "Błąd pobierania podpisu: Nieprawidłowy format danych";
                }
            }
        } catch (error) {
            console.error("Błąd pobierania podpisu:", error);
            signatureCell.textContent = "Błąd pobierania podpisu: " + error.message;
        }
        row.appendChild(signatureCell);

        const actionsCell = document.createElement('td');
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Usuń';
        deleteButton.dataset.entryId = entry.id;
        deleteButton.dataset.action = 'delete';
        deleteButton.addEventListener('click', () => {
            deleteEntry(entry.id);
        });
        actionsCell.appendChild(deleteButton);

        row.appendChild(actionsCell);
        entriesTable.appendChild(row);
    }

    // Sprawdzenie, czy przycisk "Usuń zaznaczone" już istnieje
    let deleteSelectedButton = document.getElementById('deleteSelectedButton'); // Pobieramy przycisk po ID

    if (!deleteSelectedButton) { // Jeśli przycisk nie istnieje, to go tworzymy i dodajemy
        deleteSelectedButton = document.createElement('button');
        deleteSelectedButton.id = 'deleteSelectedButton'; // Dodajemy ID do przycisku
        deleteSelectedButton.textContent = 'Usuń zaznaczone';
        deleteSelectedButton.addEventListener('click', () => {
            const checkedEntries = entriesTable.querySelectorAll('input[type="checkbox"]:checked');
            const entryIds = Array.from(checkedEntries).map(checkbox => checkbox.dataset.entryId);
            deleteSelectedEntries(entryIds);
        });
        entriesTable.parentNode.insertBefore(deleteSelectedButton, entriesTable.nextSibling);
    }
}

async function deleteEntry(entryId) {
    if (!auth.currentUser) {
        alert('Musisz być zalogowany, aby usunąć wpis.');
        return;
    }

    try {
        const token = await auth.currentUser.getIdToken(); // Pobierz token JWT

        const response = await fetch(`${BACKEND_URL}/delete-entry/${entryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}` // Dodaj token do nagłówka
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Błąd usuwania wpisu:', errorData);
            alert('Błąd usuwania wpisu: ' + errorData.error);
        } else {
            console.log('Wpis usunięty');
            renderEntries(); // Odśwież tabelę
        }
    } catch (error) {
        console.error('Błąd usuwania wpisu:', error);
        alert('Błąd usuwania wpisu: ' + error.message);
    }
}

async function deleteSelectedEntries(entryIds) {
    if (!auth.currentUser) {
        alert('Musisz być zalogowany, aby usunąć wpisy.');
        return;
    }

    try {
        const token = await auth.currentUser.getIdToken(); // Pobierz token JWT

        const response = await fetch(`${BACKEND_URL}/delete-selected`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Dodaj token do nagłówka
            },
            body: JSON.stringify({ entryIds })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Błąd usuwania wybranych wpisów:', errorData);
            alert('Błąd usuwania wybranych wpisów: ' + errorData.error);
        } else {
            console.log('Wybrane wpisy usunięte');
            renderEntries(); // Odśwież tabelę
        }
    } catch (error) {
        console.error('Błąd usuwania wybranych wpisów:', error);
        alert('Błąd usuwania wybranych wpisów: ' + error.message);
    }
}

// Widok główny
function createStartView() {
    return `
        <div id="start-view-container">
            <div id="start-view-content">
                <div id="start-view-header">
                    <div id="user-info"></div>
                    <div id="auth-buttons">
                        <button data-route="/login" id="loginButtonRoute">Zaloguj się</button>
                        <button data-route="/register" id="registerButtonRoute" style="display: none;">Zarejestruj użytkownika</button>
                        <button id="logout-button" style="display: none;">Wyloguj</button>
                    </div>
                </div>
                <h1>Książka pobytu na strzelnicy</h1>
                <div id="start-view-buttons">
                    <button data-route="/read-book">Przeglądaj książkę</button>
                    <button data-route="/new-entry">Nowy wpis do książki</button>
                </div>
            </div>
        </div>
    `;
}

// Wyświetlanie zalogowanego użytkownika
function updateUI(user) {
    const userInfoDiv = document.getElementById("user-info");
    const logoutButton = document.getElementById("logout-button");
    const registerButton = document.getElementById("registerButtonRoute");
    const loginButton = document.getElementById("loginButtonRoute");

    if (userInfoDiv) { 
        if (user) {
            const displayName = user.displayName || user.email;
            userInfoDiv.innerHTML = `Witaj, ${displayName}`;
            if (logoutButton) logoutButton.style.display = "block"; 
            if (registerButton) registerButton.style.display = "block"; 
            if (loginButton) loginButton.style.display = "none"; 
        } else {
            userInfoDiv.innerHTML = "Brak zalogowanego użytkownika.";
            if (logoutButton) logoutButton.style.display = "none"; 
            if (registerButton) registerButton.style.display = "none"; 
            if (loginButton) loginButton.style.display = "block"; 
        }
    }
}

// Odświeżanie informacji o zalogowaniu
onAuthStateChanged(auth, (user) => {
    updateUI(user); // Update UI
});

// Widok logowania
function createLoginView() {
    return `
        <div class="view-container">
            <div id="login-form-container">
                <h2>Logowanie</h2>
                <form id="loginForm">
                    <label for="loginEmail">Email:</label>
                    <input type="email" id="loginEmail" name="email"><br><br>
                    <label for="loginPassword">Hasło:</label>
                    <input type="password" id="loginPassword" name="password"><br><br>
                    <button type="button" id="loginButton">Zaloguj się</button>
                </form>
                <button data-route="/">Wróć</button>
            </div>
        </div>
    `;
}

// Widok rejestracji
function createRegisterView() {
    return `
        <div class="view-container">
            <div id="register-form-container">
                <h2>Rejestracja</h2>
                <form id="registerForm">
                    <label for="registerEmail">Email:</label>
                    <input type="email" id="registerEmail" name="email"><br><br>
                    <label for="registerPassword">Hasło:</label>
                    <input type="password" id="registerPassword" name="password"><br><br>
                    <button type="button" id="registerButton">Zarejestruj użytkownika</button>
                </form>
                <button data-route="/">Wróć</button>
            </div>
        </div>
    `;
}

async function uploadSignature(blob) {
    try {
        const token = await auth.currentUser.getIdToken(); // Pobierz token JWT

        const formData = new FormData();
        formData.append('file', blob, 'signature.png');
        formData.append('name', document.getElementById('name').value);
        formData.append('address', document.getElementById('address').value);

        const res = await fetch(`${BACKEND_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}` // Dodaj token do nagłówka
            }
        });

        const data = await res.json();
        console.log("Odpowiedź serwera:", data);
        return data.publicId;
    } catch (error) {
        console.error("Błąd przesyłania podpisu:", error);
        throw error;
    }
}
 
// Function to save entry to Firestore
async function saveCustomerEntry(name, address, signatureUrl) {
    console.log("Wywołano funkcję saveCustomerEntry z argumentami:", name, address, signatureUrl); // Dodajemy logowanie na początku funkcji

    if (!signatureUrl) {
        console.error("Signature URL is undefined. Cannot save to Firestore.");
        alert("Błąd: Nie można zapisać wpisu. Spróbuj ponownie.");
        return;
    }

    const entryData = {
        name: name,
        address_or_license: address,
        date_and_time: new Date(),
        signature_file_id: signatureUrl
    };

    try {
        alert("Entry saved successfully!");

        page('/');
    } catch (error) {
        console.error("Error saving entry to Firestore:", error);
        alert("Failed to save entry. Please try again.");
    }
}

async function initializeEntryForm() {
    console.log("initializeEntryForm() została wywołana"); // Dodajemy logowanie na początku funkcji
    const entryForm = document.getElementById('entryForm');
    if (entryForm) {
        entryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (signaturePad.isEmpty()) {
                alert("Proszę dostarczyć podpis.");
                return;
            }

            const blob = await new Promise(resolve => {
                const dataURL = signaturePad.toDataURL();
                fetch(dataURL).then(response => response.blob()).then(resolve);
            });

            console.log("Blob:", blob);
            console.log("Przed uploadSignature()"); // Dodajemy logowanie przed wywołaniem uploadSignature
            let signatureUrl = null;
            try {
                signatureUrl = await uploadSignature(blob);
                console.log("URL podpisu:", signatureUrl);
                console.log("Po uploadSignature(), signatureUrl:", signatureUrl); // Dodajemy logowanie po wywołaniu uploadSignature
            } catch (error) {
                alert("Błąd podczas przesyłania podpisu. Spróbuj ponownie.");
                return;
            }

            const name = document.getElementById('name').value;
            const address = document.getElementById('address').value;

            console.log("Przed saveCustomerEntry()"); // Dodajemy logowanie przed wywołaniem saveCustomerEntry
            await saveCustomerEntry(name, address, signatureUrl);
        });
    }
}


// Widok tworzenia wpisu
function createNewEntryView() {
    return `
        <div class="view-container">
            <div id="new-entry-container">
                <h2>Nowy wpis do książki</h2> 
                <button data-route="/" >Wróć</button>
                <form id="entryForm" enctype="multipart/form-data" method="post">
                    <label for="name">Imię i nazwisko:</label><br>
                    <input type="text" id="name" name="name" required><br><br>

                    <label for="address">Adres zamieszkania/numer i organ wydający pozwolenie:</label><br>
                    <input type="text" id="address" name="address" required><br><br>

                    <label for="signature">Potwierdzam własnoręcznym podpisem zapoznanie się z regulaminem:</label><br>
                    <canvas id="signaturePad" width="400" height="200"></canvas><br>
                    <button type="button" id="clearSignatureButton">Skasuj podpis</button><br><br>

                    <button type="submit">Zapisz do książki</button>
                </form>
            </div>
        </div>
    `;
}

function initializeSignaturePad() {
    const canvas = document.getElementById('signaturePad');
    signaturePad = new SignaturePad(canvas);

    document.getElementById('clearSignatureButton').addEventListener('click', () => {
        signaturePad.clear();
    });
}

// Widok książki
function createReadBookView() {
    return `
        <div class="table-background">
            <h2>Wpisy w książce</h2>
            <table id="entriesTable">
                <thead>
                    <tr>
                        <th>Data i godzina</th>
                        <th>Imię i nazwisko</th>
                        <th>Adres/Pozwolenie</th>
                        <th>Podpis</th>
                        <th>Akcje</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <button data-route="/">Wróć</button>
        </div>
    `;
}

// Logowanie
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert('Logowanie zakończone sukcesem!');
            page('/'); 
            updateUI(user); // Update UI
            page('/');
        })
        .catch((error) => {
            alert('Błąd logowania: ' + error.message);
        });
}

// Rejestracja
function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert('Rejestracja zakończona sukcesem!');
            page('/'); 
            updateUI(user);
        })
        .catch((error) => {
            alert('Błąd rejestracji: ' + error.message);
        });
}

// Logout
function logout() {
    signOut(auth).then(() => {
        alert('Wylogowano pomyślnie!');
        updateUI(null); // Update UI
        page('/'); 
    }).catch((error) => {
        alert('Błąd wylogowania: ' + error.message);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const userInfoDiv = document.getElementById("user-info");
    const logoutButton = document.getElementById("logout-button");
    const registerButton = document.getElementById("registerButton");
    const loginButton = document.getElementById("loginButton");

    function updateUI(user) {  // Funkcja updateUI wewnątrz DOMContentLoaded
        if (userInfoDiv) {
            if (user) {
                const displayName = user.displayName || user.email;
                userInfoDiv.innerHTML = `Witaj, ${displayName}`;
                if (logoutButton) logoutButton.style.display = "block";
                if (registerButton) registerButton.style.display = "block";
                if (loginButton) loginButton.style.display = "none";
            } else {
                userInfoDiv.innerHTML = "Brak zalogowanego użytkownika.";
                if (logoutButton) logoutButton.style.display = "none";
                if (registerButton) registerButton.style.display = "none";
                if (loginButton) loginButton.style.display = "block";
            }
        }
    }

    onAuthStateChanged(auth, (user) => {
        updateUI(user);
    });

});

// Routing
page('/', () => {
    document.getElementById('app').innerHTML = createStartView();
    updateUI(auth.currentUser  ); // Update UI z uwzględnieniem zalogowanego usera
});

page('/login', () => {
    document.getElementById('app').innerHTML = createLoginView();
});

page('/register', () => {
    document.getElementById('app').innerHTML = createRegisterView();
});

page('/new-entry', () => {
    console.log("page('/new-entry') została wywołana"); // Dodajemy logowanie na początku funkcji
    if (!auth.currentUser) {
        alert('Musisz być zalogowany, aby dodać wpis.');
        page('/');
        return;
    }
    document.getElementById('app').innerHTML = createNewEntryView();
    initializeSignaturePad(); // Inicjalizacja Signature Pad
    initializeEntryForm(); // Initialize the entry form event listener
});

page('/read-book', () => {
    document.getElementById('app').innerHTML = createReadBookView(); // Używamy funkcji createReadBookView()
    renderEntries(); // Uruchamiamy renderowanie po załadowaniu widoku
});

page(); // Inicjalizacja routingu

// Obsługa kliknięć w linki i przyciski
document.addEventListener('click', (e) => {
    const route = e.target.dataset.route;
    if (route) {
        e.preventDefault();
        page(route);
    } else if (e.target.id === 'loginButton') {
        login();
    } else if (e.target.id === 'registerButton') {
        register();
    } else if (e.target.id === 'logout-button') {
        logout();
    }
});