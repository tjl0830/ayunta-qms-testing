// Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRwTJjwKbDwIz34soPCTTzWoFy1GFBGAE",
  authDomain: "ayuntamiento-qms.firebaseapp.com",
  databaseURL: "https://ayuntamiento-qms-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ayuntamiento-qms",
  storageBucket: "ayuntamiento-qms.firebasestorage.app",
  messagingSenderId: "597457203650",
  appId: "1:597457203650:web:42827992402576319fe65b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Reference to the Realtime Database
const database = firebase.database();

// Reference to the queue counter in the Realtime Database
const queueCounterRef = firebase.database().ref('queueCounter');

function generateQueueNumber(counterNumber) {
  return new Promise((resolve) => {
    queueCounterRef.transaction((currentCounter) => {
      if (currentCounter === null) {
        currentCounter = 0;
      }
      const newCounter = currentCounter + 1;
      return newCounter;
    }, (error, committed, snapshot) => {
      if (error) {
        console.error('Transaction failed unexpectedly!', error);
      } else if (committed) {
        const queueNumber = `${counterNumber}-${snapshot.val().toString().padStart(4, '0')}`;
        resolve(queueNumber);
      }
    });
  });
}

// Function to generate a random alphanumeric unique identifier (trackingId)
function generateUniqueId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let uniqueId = '';
  for (let i = 0; i < 6; i++) {
    uniqueId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return uniqueId;
}

// Function to add a queue entry
function addToQueue(counterNumber) {
  const queueRef = database.ref(`counters/${counterNumber}/queue`);

  generateQueueNumber(counterNumber)
    .then((queueNumber) => {
      const trackingId = generateUniqueId(); // Generate the unique identifier for tracking

      console.log('Adding to queue:', queueNumber); // Debugging log

      // Use Firebase's push to automatically generate a unique key for the queue entry
      queueRef.push({
        queueNumber: queueNumber,
        trackingId: trackingId // Store the tracking ID here
      }, (error) => {
        if (error) {
          console.error('Failed to add queue entry:', error);
        } else {
          console.log('Queue entry added successfully');
        }
      });
    })
    .catch((error) => {
      console.error('Error generating queue number:', error);
    });
}

// Function to remove the first queue number (serve the next person)
function nextInQueue(counterNumber) {
  const queueRef = database.ref(`counters/${counterNumber}/queue`);
  queueRef.once('value', (snapshot) => {
    const queueData = snapshot.val();

    if (queueData) {
      const firstQueueKey = Object.keys(queueData)[0]; // Get the first queue entry's key
      queueRef.child(firstQueueKey).remove();
    }
  });
}

// Function to update the queue display and show the current transaction (first in queue)
function updateQueueDisplay(counterNumber, queueDisplayElement, currentTransactionElement) {
  const queueRef = database.ref(`counters/${counterNumber}/queue`);

  queueRef.on('value', (snapshot) => {
    const queueData = snapshot.val();

    if (queueData) {
      const queueKeys = Object.keys(queueData); // Get queue entry keys (unique auto-generated IDs)
      const queueEntries = Object.values(queueData); // Get queue entries (queue numbers and tracking IDs)

      if (queueKeys.length >= 0) {
        // Set the current transaction to the first item in the queue
        const currentQueueEntry = queueEntries[0];
        const currentQueueNumber = currentQueueEntry.queueNumber;
        const currentTrackingId = currentQueueEntry.trackingId;
        currentTransactionElement.textContent = `${currentQueueNumber} (ID: ${currentTrackingId})`;

        // Update the rest of the queue
        if (queueKeys.length > 1) {
          const remainingQueue = queueEntries.slice(1);
          queueDisplayElement.innerHTML = remainingQueue
            .map(entry => `<li>${entry.queueNumber}</li>`)
            .join('');
        } else {
          queueDisplayElement.innerHTML = '<p></p>';
        }
      } else {
        currentTransactionElement.textContent = 'No current transaction';
        queueDisplayElement.innerHTML = '<p>Queue is empty</p>';
      }
    } else {
      currentTransactionElement.textContent = 'No current transaction';
      queueDisplayElement.innerHTML = '<p>Queue is empty</p>';
    }
  });
}

// Event listeners for buttons
const addToQueueButton = document.getElementById('addToQueue');
const nextInQueueButton = document.getElementById('nextInQueue');
const counterSelect = document.getElementById('counterSelect');
const queueDisplay = document.getElementById('queueDisplay');
const currentTransaction = document.getElementById('currentTransaction');

addToQueueButton.addEventListener('click', () => {
  const selectedCounter = counterSelect.value;
  addToQueue(selectedCounter);
});

nextInQueueButton.addEventListener('click', () => {
  const selectedCounter = counterSelect.value;
  nextInQueue(selectedCounter);
});

// Update the queue display for the initial counter
updateQueueDisplay(counterSelect.value, queueDisplay, currentTransaction);

// Update the queue display when the counter selection changes
counterSelect.addEventListener('change', () => {
  updateQueueDisplay(counterSelect.value, queueDisplay, currentTransaction);
});
