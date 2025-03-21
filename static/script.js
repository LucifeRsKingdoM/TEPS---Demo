let recognition;
        let isListening = false;
        let isAssistantActive = false;
        let selectedVoice = null;


        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "en-US";

            recognition.onresult = function (event) {
                let transcript = event.results[0][0].transcript;
                addMessage("user", transcript);
                sendText(transcript);
            };

            recognition.onend = function () {
                isListening = false;
                document.querySelector(".mic-button").style.backgroundColor = "#4CAF50";
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
                document.querySelector(".mic-button").style.backgroundColor = "#4CAF50";
            }
        }

        function startListening() {
            if (isAssistantActive && recognition && !window.speechSynthesis.speaking) { 
                recognition.start();
            }
        }

        function addMessage(sender, text) {
            let msgDiv = document.createElement("div");
            msgDiv.className = "message " + sender;
            msgDiv.innerHTML = `<p>${text}</p>`;
            document.getElementById("conversation").appendChild(msgDiv);
        }

        function sendMessage() {
            let userInput = document.getElementById("userInput").value;
            if (!userInput) return;
            addMessage("user", userInput);
            document.getElementById("userInput").value = "";
            sendText(userInput);
        }

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
                speakResponse(responseText);
            })
            .catch(error => console.error("Error:", error));
        }

        // Speak Function (Ensures No Self-Listening)
        function speakResponse(responseText) {
            if (recognition) recognition.abort(); // Stop listening before speaking

            let utterance = new SpeechSynthesisUtterance(responseText);
            let voices = window.speechSynthesis.getVoices();
            selectedVoice = voices.find(v => v.name.toLowerCase().includes("female")) || voices[0];
            utterance.voice = selectedVoice;

            utterance.onstart = function () {
                if (recognition) recognition.abort(); // Stop recognition while speaking
            };

            utterance.onend = function () {
                setTimeout(() => { 
                    if (isAssistantActive) {
                        console.log("Restarting recognition after speaking...");
                        recognition.start(); // Ensuring recognition restarts after speaking
                    }
                }, 1000); // Small delay to prevent race conditions
            };

            window.speechSynthesis.speak(utterance);
        }


        window.speechSynthesis.onvoiceschanged = function () {
        let voices = window.speechSynthesis.getVoices();
        selectedVoice = voices.find(v => v.name.toLowerCase().includes("female")) || voices[0];
    };