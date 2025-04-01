from flask import Flask, render_template, request, jsonify, session, url_for, redirect
import os
import re
import traceback
import requests
from twilio.rest import Client
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

user_data = {}  # Store user details globally (temporary)

app.secret_key = os.urandom(24)  # Required for session handling


class SarahAI:
    def __init__(self, user_data):
        """Initialize Sarah with stored user data and conversation tracking."""
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.api_key}"
        self.user_data = user_data  # Fetch stored user data
        self.teps_activated = False  # Track TEPS state in backend

        self.conversation_history = [
            {"role": "system", "text": "Your name is Sarah, an advanced AI assistant created by Lucifer, a BCA graduate from Bangalore University. "
                                       "Lucifer has been unemployed for 9 months, and he built Sarah as a friendly, human-like assistant with a unique emergency protocol system (TEPS) for safety."}
        ]

    def chat(self, user_input):
        """Process user input and handle TEPS activation or deactivation in the backend."""

        # ✅ Check if the word "activated" is present in the conversation
        if "activated" in user_input.lower():
            print("🚨 TEPS ACTIVATION DETECTED!")

            # ✅ Check SMS sent status from backend
            response = requests.get("http://127.0.0.1:5000/check_sms_status")  # Replace with actual backend URL if needed
            sms_status = response.json().get("smsSent", False)  # Default to False if key not found

            if not sms_status:  # ✅ If SMS is NOT sent, send it now
                print("📩 SMS NOT SENT YET! SENDING NOW...")
                send_emergency_sms()  # Call the existing function to send SMS
            else:
                print("✅ SMS ALREADY SENT! NO ACTION NEEDED.")


        self.conversation_history.append({"role": "user", "text": user_input})
        
        system_prompt = (
            "Keep responses short, engaging, and natural like a human conversation."
            "If user asks about Shobha, she is an idiot fellow sister of Lucifer and also a big waste body of the country."
            "Try to add emojis in the last word in all the conversation."
            "If the user needs more information, then give a detailed and informative response, else keep it short."
            "When the user asks why you were created, you must include TEPS in the response."
            "Sarah is an advanced AI assistant created by Lucifer, who has been unemployed for 9 months."
            "She behaves like a human and engages in natural conversations."
            "Sarah remembers the user's name during the session and uses it naturally."
            "If TEPS is activated, she continuously speaks to reassure and guide the user to safety."
            "Sarah always speaks warmly and with emotional intelligence, making users feel they are talking to a real human."
            "If the user says 'I'm in trouble' or 'danger' or anything like that, you have to ask, 'Are you sure?'"
            "If the user says 'yes,' then say 'Activating Emergency Protocol System User Confirmed and Emergency Protocol System is activated', I have already sent your location and distress message to your emergency contacts and the police.'"
            "Encourage them to move to a safe public place like a metro station or a bus stop."
            "Reassure them by saying 'I am here with you. Stay strong! 💪'"
            "When TEPS is activated, Sarah will continuously talk to the user, provide emotional support, and guide them to safety without stopping."
            "Sarah will ask questions, check the user's condition, and encourage them to stay strong until they confirm they are safe."
            "Once TEPS is deactivated, Sarah will return to normal mode and resume regular conversation."
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
    

# ✅ Create SarahAI instance with stored user data
def create_sarah_instance(user_data):
    return SarahAI(user_data)

# Create a global Sarah instance
sarah = None

# ✅ Validate phone number format (+91XXXXXXXXXX)
def is_valid_phone(phone):
    """Check if the phone number is valid (+91XXXXXXXXXX or 10 digits)."""
    return bool(re.fullmatch(r"\+91\d{10}|\d{10}", phone))


# ✅ Calculate Age from DOB
def calculate_age(dob):
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
        today = datetime.today()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, today.day))
    except Exception as e:
        print("❌ Error calculating age:", e)
        return "Unknown Age"



# ✅ Send Emergency SMS (Triggered by TEPS)
def send_emergency_sms():
    global user_data

    if not user_data or not all(k in user_data for k in ["name", "age", "phone"]):
        print("❌ Missing user data. Cannot send SMS.")
        return False

    location_url = f"https://maps.google.com?q={user_data['location']}" if user_data.get("location") else "Location not available"

    message_body = (
        f" EMERGENCY \n"
        f"Name: {user_data['name']}\n"
        f"Age: {user_data['age']} years old\n"
        f"Phone: {user_data['phone']}\n"
        f"Live Location: {location_url}\n"
        f" This person is in DANGER! Please help immediately!"
    )

    # ✅ Fetch credentials securely
    TWILIO_SID = os.getenv("TWILIO_SID")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")

    if not all([TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER]):
        print("❌ Twilio credentials are missing! Check .env file.")
        return False

    try:
        client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=message_body,
            from_=TWILIO_NUMBER,
            to=user_data["phone"]  # Replace with actual mobile number
        )
        print("✅ SMS sent successfully! SID:", message.sid)
        return True
    except Exception as e:
        print("❌ Failed to send SMS:")
        traceback.print_exc()
        return False
    

@app.route('/')
def register():
    return render_template('register.html')

@app.route('/save_user', methods=['POST'])
def save_user():
    global user_data
    data = request.json

    # Ensure phone is always a string
    phone = str(data.get("phone", "")).strip()

    # Automatically add +91 if only 10 digits
    if re.fullmatch(r"\d{10}", phone):
        phone = f"+91{phone}"

    # Validate phone number format
    if not is_valid_phone(phone):
        return jsonify({"error": "Invalid phone number format."}), 400

    # Store user data
    user_data = {
        "name": data.get("name", "Unknown"),
        "dob": data.get("dob", "Unknown"),
        "phone": phone,
        "location": data.get("location", "Unknown"),
    }

    # Calculate and store age
    user_data["age"] = calculate_age(user_data["dob"])

    print("✅ User Data Saved:", user_data)  # Debugging
    return jsonify({"redirect": url_for('home')})


@app.route('/get_user')
def get_user():
    global user_data
    if user_data:
        return jsonify(user_data)
    return jsonify({"error": "No user data found"}), 400


@app.route('/home')
def home():
    global sarah

    if not user_data:  # ✅ Ensure user data is available
        return redirect(url_for('register'))  # If no user data, redirect back to register

    sarah = SarahAI(user_data)  # ✅ Initialize Sarah with user data
    return render_template('index.html', username=user_data.get("name", "User"))  # ✅ Pass username to template


@app.route('/process', methods=['POST'])
def process():
    global sarah
    
    if sarah is None:
        sarah = SarahAI(user_data)  # ✅ Pass user_data
    
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text received"})
    
    user_input = data["text"]
    response = sarah.chat(user_input)  # ✅ Get AI response

    # ✅ Check if AI response contains "activated"
    if "activated" in response.lower():
        print("🚨 TEPS ACTIVATION DETECTED ")

        # ✅ Check SMS sent status
        sms_status_response = requests.get("https://teps-demo.onrender.com/check_sms_status")  
        sms_status = sms_status_response.json().get("smsSent", False)  

        if not sms_status:  # ✅ If SMS is NOT sent, call API to send it
            print("📩 SMS NOT SENT YET! SENDING NOW...")

            sms_response = requests.post("https://teps-demo.onrender.com/send_emergency_sms", json={})  # ✅ Call API

            if sms_response.json().get("success", False):  # ✅ Check if SMS was sent successfully
                print("✅ SMS SENT SUCCESSFULLY! Status updated.")
            else:
                print("❌ SMS FAILED! Check logs.")
        else:
            print("✅ SMS ALREADY SENT! NO ACTION NEEDED.")

    return jsonify({"text": user_input, "response": response})



@app.route('/main')
def main():
    return render_template('main.html')


# ✅ Store SMS Sent Status in Backend
sms_sent_status = {"sent": False}

@app.route('/send_emergency_sms', methods=['POST'])
def send_sms_route():
    data = request.json
    print("🔥 Received Emergency Trigger:", data)  # Debugging Log  

    success = send_emergency_sms()  # Call your existing SMS function

    # ✅ Update SMS sent status
    sms_sent_status["sent"] = success
    print(f"✅ SMS Sent Status Updated: {sms_sent_status['sent']}")  # Print for debugging

    return jsonify({"success": success})


@app.route('/check_sms_status', methods=['GET'])
def check_sms_status():
    """✅ API to check SMS sent status"""
    return jsonify({"smsSent": sms_sent_status["sent"]})


@app.route('/logout') 
def logout():
    global user_data, sarah
    user_data.clear()  # Clear stored user data
    session.clear()  # Clear session
    sarah = None
    return redirect(url_for('register'))

@app.errorhandler(404)
def page_not_found(e):
    return jsonify({"error": "Page not found"}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
