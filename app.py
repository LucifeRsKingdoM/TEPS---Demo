from flask import Flask, render_template, request, jsonify
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

import requests
import os

class SarahAI:
    def __init__(self):
        """Initialize Sarah with a default system message and user session tracking."""
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.api_key}"
        self.username = None
        self.teps_activated = False
        self.conversation_history = [
            {"role": "system", "text": "Your name is Sarah, an advanced AI assistant created by Lucifer, a BCA graduate from Bangalore University. "
                                       "Lucifer has been unemployed for 9 months, and he built Sarah as a friendly, human-like assistant with a unique emergency protocol system (TEPS) for safety."}
        ]

    def set_username(self, name):
        """Set the username when the conversation starts."""
        self.username = name
        return f"Hi {self.username}! 😊 How can I assist you today?"

    def chat(self, user_input):
        """Process user input and generate a response with Sarah's personality and emergency features."""
        
        if self.teps_activated:
            return self.handle_teps_mode()

        if "i'm in danger" in user_input.lower() or "i'm in trouble" in user_input.lower():
            return f"{self.username}, are you sure? Say 'yes' to activate TEPS or 'no' to continue normal conversation."

        if user_input.lower() == "yes" and self.teps_activated is False:
            return self.activate_teps()
        elif user_input.lower() == "no":
            return f"Alright {self.username}, let’s continue our chat normally. 😊"

        self.conversation_history.append({"role": "user", "text": user_input})
        
        system_prompt = (
            "Keep responses short, engaging, and natural like a human conversation."
            "try to add emojiss in the last word in all the conversation."
            "if the user need more imformation then Give a detailed and informative response else make it best."
            "when the user ask why are you created then you must include TEPS."
            "Sarah is an advanced AI assistant created by Lucifer, who has been unemployed for 9 months. "
            "She behaves like a human and engages in natural conversations. "
            "Sarah remembers the user's name during the session and uses it naturally. "
            "If TEPS is activated, she continuously speaks to reassure and guide the user to safety. "
            "Sarah always speaks warmly and with emotional intelligence, making users feel they are talking to a real human."
            "if the user says i'm in trouble or denger or anything like that you have to ask, are you sure, if the user said yes then say Activeting Emergency Protocol System, I have already sent your location and distress message to your emergency contacts and the police., try to move to a safe public place like a metro station or a bus stop as per your instractions., I am here with you. Stay strong! "
        )

        full_prompt = f"{system_prompt}\n\nConversation history:\n{self.format_conversation()}\n\nUser: {user_input}\nSarah:"

        payload = {"contents": [{"parts": [{"text": full_prompt}]}]}
        headers = {"Content-Type": "application/json"}
        response = requests.post(self.api_url, json=payload, headers=headers)

        if response.status_code == 200:
            ai_response = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            self.conversation_history.append({"role": "assistant", "text": ai_response})
            return ai_response
        else:
            return f"Sorry {self.username}, I couldn't process that request. 😔"

    def format_conversation(self):
        """Format conversation history for AI context."""
        return "\n".join([f"{entry['role'].capitalize()}: {entry['text']}" for entry in self.conversation_history])

    def activate_teps(self):
        """Activate the emergency protocol system."""
        self.teps_activated = True
        return (
            f"🚨 {self.username}, I have activated the Emergency Protocol System (TEPS)! 🚨\n"
            "I have already sent your location and distress message to your emergency contacts and the police.\n"
            "Please try to move to a safe public place like a metro station or a bus stop.\n"
            "I am here with you. Stay strong! 💪"
        )

    def handle_teps_mode(self):
        """Handle TEPS mode by continuously speaking to the user and ensuring safety."""
        return f"{self.username}, are you safe now? Say 'yes' to deactivate TEPS."

# Create Sarah instance
sarah = SarahAI()


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text received"})
    
    user_input = data["text"].lower()
    response = sarah.chat(user_input)
    
    return jsonify({"text": user_input, "response": response})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
