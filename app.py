from flask import Flask, render_template, request, jsonify
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Predefined responses for specific questions
PREDEFINED_RESPONSES = {
    "what is your name": "I am Sarah, your virtual assistant.",
    "who created you": "I was created by Lucifer, a recent BCA graduate from Bangalore University.",
    "what is your purpose": "My purpose is to assist and communicate with you.",
    "who are you": "I am Sarah, a conversational AI assistant.",
    "how are you": "I'm doing great! Thanks for asking."
}

# Function to communicate with Gemini API and limit response length
def ask_gemini(question):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": question}]}]
    }
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        full_response = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "I am not sure about that.")
        
        # If user asks for more details, return full response
        if any(word in question for word in ["explain", "tell me more", "elaborate", "details"]):
            return full_response
        
        # Otherwise, return only the first 2-4 lines (split by periods)
        short_response = ". ".join(full_response.split(". ")[:1]) + "."
        return short_response
    
    return "I am unable to process your request at the moment."


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text received"})

    user_input = data["text"].lower()
    
    # Check if the input contains any predefined response keywords
    for key, response in PREDEFINED_RESPONSES.items():
        if key in user_input:
            return jsonify({"text": user_input, "response": response})
    
    # If no predefined response, fetch from Gemini API
    response = ask_gemini(user_input)
    
    return jsonify({"text": user_input, "response": response})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)





