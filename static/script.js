let recognition;
let isListening = false;
let isAssistantActive = false;
let isVoiceMode = true; // Default to voice mode
let selectedVoice = null;

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = function (event) {
        let transcript = event.results[0][0].transcript;
        addMessage("user", transcript);
        sendText(transcript);
    };

    recognition.onend = function () {
        isListening = false;
        updateMicButton(false);
    };
}

function toggleAssistant() {
    if (!isAssistantActive) {
        isAssistantActive = true;
        addMessage("assistant", "Hi, I am Sarah. How can I help you?");
        speakResponse("Hi, I am Sarah. How can I help you?");
    } else {
        isAssistantActive = false;
        if (recognition) recognition.stop();
        window.speechSynthesis.cancel();
    }
    updateMicButton(isAssistantActive);
}

function toggleVoiceMode() {
    isVoiceMode = !isVoiceMode;

    // Update button icon and color
    let voiceToggle = document.getElementById("voiceToggle");
    voiceToggle.classList.toggle("voice-on", isVoiceMode);
    voiceToggle.classList.toggle("voice-off", !isVoiceMode);
    voiceToggle.textContent = isVoiceMode ? "🔊" : "🔇";

    // Update header text (Mode Indicator)
    updateModeIndicator(isVoiceMode);

    // Stop speech and recognition if switching to non-voice mode
    if (!isVoiceMode) {
        if (recognition) recognition.stop();
        window.speechSynthesis.cancel();
    }
}

// Ensure mode indicator updates
function updateModeIndicator(isVoiceMode) {
    let modeIndicator = document.getElementById("modeIndicator");
    if (isVoiceMode) {
        modeIndicator.textContent = "Voice Mode 🔊";
        modeIndicator.style.color = "#4CAF50"; // Green for voice mode
    } else {
        modeIndicator.textContent = "Non-Voice Mode 🔇";
        modeIndicator.style.color = "#d9534f"; // Red for non-voice mode
    }
}

// Call updateModeIndicator() on page load to ensure it shows the correct mode
document.addEventListener("DOMContentLoaded", () => {
    updateModeIndicator(isVoiceMode);
});


function startListening() {
    if (isAssistantActive && recognition && !window.speechSynthesis.speaking) {
        recognition.start();
        updateMicButton(true);
    }
}

recognition.onstart = function () {
    updateMicButton(true);
};

recognition.onend = function () {
    updateMicButton(false);
    isListening = false;
};

function updateMicButton(listening) {
    let micButton = document.querySelector(".mic-button");
    if (listening) {
        micButton.classList.add("listening");
    } else {
        micButton.classList.remove("listening");
    }
}

function addMessage(sender, text) {
    let msgDiv = document.createElement("div");
    msgDiv.className = "message " + sender;
    msgDiv.innerHTML = `<p>${text}</p>`;
    document.getElementById("conversation").appendChild(msgDiv);
    document.getElementById("conversation").scrollTop = document.getElementById("conversation").scrollHeight;
}

function sendMessage() {
    let userInput = document.getElementById("userInput").value;
    if (!userInput) return;
    addMessage("user", userInput);
    document.getElementById("userInput").value = "";
    sendText(userInput);
}

document.addEventListener("DOMContentLoaded", function () {
    let inputField = document.getElementById("userInput");
    let sendButton = document.getElementById("sendButton");

    inputField.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevents new line in input
            sendButton.click(); // Simulates clicking the send button
        }
    });
});


function sendText(text) {
    fetch("/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
    })
    .then(response => response.json())
    .then(data => {
        let responseText = data.response;
        addMessage("assistant", responseText);
        if (isVoiceMode) speakResponse(responseText);
    })
    .catch(error => console.error("Error:", error));
}

function speakResponse(responseText) {
    if (recognition) recognition.abort();  // Stop recognition before speaking

    let utterance = new SpeechSynthesisUtterance(responseText);
    let voices = window.speechSynthesis.getVoices();
    selectedVoice = voices.find(v => v.name.toLowerCase().includes("female")) || voices[0];
    utterance.voice = selectedVoice;

    utterance.onstart = function () {
        if (recognition) recognition.abort();  // Stop listening while speaking
    };

    utterance.onend = function () {
        setTimeout(() => { 
            if (isAssistantActive && isVoiceMode) {
                console.log("Speech finished, restarting recognition...");
                restartRecognition();  // Ensures recognition starts only after speaking
            }
        }, 1000);  // Delay prevents race conditions
    };

    window.speechSynthesis.speak(utterance);
}


function restartRecognition() {
    if (isAssistantActive && isVoiceMode) {
        recognition.stop();  // Ensure previous session is fully stopped
        setTimeout(() => {
            if (!window.speechSynthesis.speaking) {  // Only start if speech is done
                console.log("Restarting recognition...");
                recognition.start();  
            }
        }, 1000);  // Short delay for stability
    }
}

window.speechSynthesis.onvoiceschanged = function () {
    let voices = window.speechSynthesis.getVoices();
    selectedVoice = voices.find(v => v.name.toLowerCase().includes("female")) || voices[0];
};

