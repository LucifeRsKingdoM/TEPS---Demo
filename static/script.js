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
    console.log("🔹 toggleAssistant called. isAssistantActive:", isAssistantActive);

    if (!isAssistantActive) {
        isAssistantActive = true;
        updateMicButton(true);
        console.log("🔹 Fetching user data...");

        fetch('/get_user')
            .then(response => response.json())
            .then(data => {
                console.log("🔹 User data:", data);
                const userName = data.name || "User";
                let predefinedText = `Hi, how are you? My name is ${userName}`;

                if (localStorage.getItem("emergencyTriggered") === "true") {
                    predefinedText = ` HIi My name is ${userName} & I'm in danger. Please activate TEPS.`;
                    localStorage.removeItem("emergencyTriggered");
                }

                console.log("🔹 Sending message:", predefinedText);
                addMessage("user", predefinedText);

                return fetch('/process', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: predefinedText })
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log("🔹 Assistant response:", data);
                addMessage("assistant", data.response);
                speakResponse(data.response);
            })
            .catch(error => console.error("❌ Error in toggleAssistant:", error));
    } else {
        isAssistantActive = false;
        if (recognition) recognition.stop();
        window.speechSynthesis.cancel();
        updateMicButton(false);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem('emergencyTriggered') === 'true') {
        console.log("🚨 Emergency flag detected. Fetching user data...");
        
        fetch('/get_user')
            .then(response => response.json())
            .then(data => {
                console.log("🔹 User data:", data);
                const userName = data.name || "User"; // Get the registered username
                
                let emergencyText = `Hi, my name is ${userName} & I'm in danger. Please activate TEPS.`;
                
                localStorage.removeItem('emergencyTriggered'); // Remove flag to prevent re-triggering
                
                startEmergencyAssistant(emergencyText);
            })
            .catch(error => {
                console.error("❌ Error fetching user data:", error);
                localStorage.removeItem('emergencyTriggered'); // Ensure flag is removed even if error occurs
            });
    }
});

function startEmergencyAssistant(text) {
    isAssistantActive = true;
    updateMicButton(true);
    addMessage("user", text);

    fetch('/process', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
    })
    .then(response => response.json())
    .then(data => {
        console.log("🔹 Emergency Assistant response:", data);
        addMessage("assistant", data.response);
        speakResponse(data.response);
    })
    .catch(error => console.error("❌ Error in startEmergencyAssistant:", error));
}



function toggleVoiceMode() {
    isVoiceMode = !isVoiceMode;

    let voiceToggle = document.getElementById("voiceToggle");
    voiceToggle.classList.toggle("voice-on", isVoiceMode);
    voiceToggle.classList.toggle("voice-off", !isVoiceMode);
    voiceToggle.textContent = isVoiceMode ? "🔊" : "🔇";

    updateModeIndicator(isVoiceMode);

    if (!isVoiceMode) {
        if (recognition) recognition.stop();
        window.speechSynthesis.cancel();
    }
}

function updateModeIndicator(isVoiceMode) {
    let modeIndicator = document.getElementById("modeIndicator");
    modeIndicator.textContent = isVoiceMode ? "Voice Mode 🔊" : "Non-Voice Mode 🔇";
    modeIndicator.style.color = isVoiceMode ? "#4CAF50" : "#d9534f";
}

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

function updateMicButton(listening) {
    let micButton = document.querySelector(".mic-button");
    if (micButton) {
        micButton.classList.toggle("listening", listening);
    }
}

function addMessage(sender, text) {
    let conversation = document.getElementById("conversation");
    let msgDiv = document.createElement("div");
    msgDiv.className = "message " + sender;
    msgDiv.innerHTML = `<p>${text}</p>`;
    conversation.appendChild(msgDiv);
    conversation.scrollTop = conversation.scrollHeight;
}

function sendMessage() {
    let userInput = document.getElementById("userInput").value.trim();
    if (userInput === "") return;

    addMessage("user", userInput);
    document.getElementById("userInput").value = "";

    document.getElementById("loadingIndicator").style.display = "block";
    sendText(userInput);
}

function receiveMessage(text) {
    let conversation = document.getElementById("conversation");

    document.getElementById("loadingIndicator").style.display = "none";

    let aiMessage = document.createElement("div");
    aiMessage.className = "message assistant";
    aiMessage.innerHTML = `<p>${text}</p>`;
    conversation.appendChild(aiMessage);

    conversation.scrollTop = conversation.scrollHeight;

    if (isVoiceMode) speakResponse(text);
}

document.addEventListener("DOMContentLoaded", function () {
    let inputField = document.getElementById("userInput");
    let sendButton = document.getElementById("sendButton");

    inputField.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendButton.click();
        }
    });
});

function sendText(text) {
    window.speechSynthesis.cancel(); // Stop any ongoing speech when user sends a new input

    if (recognition) recognition.stop(); // ✅ Stop listening once input is taken (at "Thinking...")

    let conversation = document.getElementById("conversation");

    let tempMessage = document.createElement("div");
    tempMessage.className = "message assistant temp-thinking";
    tempMessage.innerHTML = `<p>Thinking...</p>`;
    conversation.appendChild(tempMessage);
    conversation.scrollTop = conversation.scrollHeight;

    fetch("/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
    })
    .then(response => response.json())
    .then(data => {
        let responseText = data.response;

        if (typeof responseText !== "string") {
            console.error("Error: responseText is not a string", responseText);
            responseText = String(responseText);
        }

        tempMessage.innerHTML = `<p>${responseText}</p>`;
        tempMessage.classList.remove("temp-thinking");

        conversation.scrollTop = conversation.scrollHeight;

        if (isVoiceMode) speakResponse(responseText); // ✅ Start speaking after displaying response
    })
    .catch(error => {
        console.error("Error:", error);
        tempMessage.innerHTML = `<p>Oops! Something went wrong.</p>`;
    });
}


function speakResponse(responseText) {
    // Do not cancel speech here; it was causing issues with long responses

    let cleanText = responseText
        .replace(/\*/g, "")
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
        .replace(/\.\s*/g, ", ");

    let utterance = new SpeechSynthesisUtterance(cleanText);
    let voices = window.speechSynthesis.getVoices();
    selectedVoice = voices.find(v => v.name.toLowerCase().includes("female")) || voices[0];
    utterance.voice = selectedVoice;

    utterance.onstart = function () {
        if (recognition) recognition.abort(); // ✅ Stop recognition when speaking starts
    };

    utterance.onend = function () {
        setTimeout(() => {
            if (isAssistantActive && isVoiceMode) {
                recognition.start();  // ✅ Restart listening after speaking completes
            }
        }, 500);
    };

    window.speechSynthesis.speak(utterance);
}


function restartRecognition() {
    if (isAssistantActive && isVoiceMode) {
        recognition.stop();
        setTimeout(() => {
            if (!window.speechSynthesis.speaking) {
                console.log("Restarting recognition...");
                recognition.start();
            }
        }, 1000);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    window.speechSynthesis.cancel(); // Stop any ongoing speech when the page loads
});


window.speechSynthesis.onvoiceschanged = function () {
    let voices = window.speechSynthesis.getVoices();
    selectedVoice = voices.find(v => v.name.toLowerCase().includes("female")) || voices[0];
};

function logout() {
    localStorage.clear(); // Clear local storage
    window.location.href = "/logout"; // Redirect to register.html
}

fetch('/get_user')
    .then(response => response.json())
    .then(data => {
        console.log("📝 User Data Fetched:", data); // Debugging
        if (data.name) {
            document.getElementById("userName").innerText = data.name;
        } else {
            console.error("❌ No user data found");
        }
    })
    .catch(error => console.error("❌ Fetch Error:", error));
