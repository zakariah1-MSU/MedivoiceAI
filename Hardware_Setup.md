# **Raspberry Pi Setup & User Manual for MediVoice AI**

# **1\. Raspberry Pi Setup**

## **1.1 Overview**

Raspberry Pi is used in the MediVoice AI system as an edge device to capture voice input, process audio signals, and communicate with the cloud-based AI backend in real time.

## **1.2 Hardware Requirements**

* Raspberry Pi 4 (4GB/8GB recommended)  
* MicroSD Card (32GB or higher)  
* Power Adapter (5V, 3A)  
* USB Microphone  
* Stable Internet Connection (Wi-Fi or Ethernet)

## **1.3 Operating System Installation**

### **Step 1: Install Raspberry Pi OS**

* Download Raspberry Pi Imager  
* Flash Raspberry Pi OS (64-bit) into SD card  
* Insert SD card into Raspberry Pi

### **Step 2: Initial Boot Setup**

* Connect monitor, keyboard, mouse  
* Power ON Raspberry Pi  
* Configure Wi-Fi, region, and system updates

## **1.4 Software Installation**

**Update system packages:**

sudo apt update && sudo apt upgrade \-y

**Install Python:**

sudo apt install python3 python3-pip \-y

**Install audio dependencies:**

sudo apt install portaudio19-dev python3-pyaudio \-y

**Install Python libraries:**

pip3 install websockets requests python-dotenv pyaudio

## **1.5 Audio Configuration**

**Check microphone devices:**

arecord \-l

**Test recording:**

arecord test.wav

aplay test.wav

## **1.6 Backend Configuration**

Create or update `.env` file:

BACKEND\_WS\_URL=wss://your-fastapi-server/media-stream

DEVICE\_ID=raspberrypi-001

## **1.7 Running Voice Client**

**Create script:**

nano voice\_client.py

**Run application:**

python3 voice\_client.py

# **2\. Raspberry Pi User Manual**

## **2.1 System Overview**

Raspberry Pi acts as the voice interaction terminal for MediVoice AI. It enables pharmacists or users to interact with the AI assistant using natural voice commands.

## **2.2 Starting the System**

1. Power ON Raspberry Pi  
2. Open terminal  
3. Run the voice client:

python3 voice\_client.py

## **2.3 How to Use MediVoice AI**

##  **Voice Commands**

Users can speak commands such as:

* "I need cough syrup"  
* "Check my order status"  
* "Add Amoxicillin 500 mg"  
* "What medicines are available for fever?"

### **AI Processing Flow**

1. Voice input captured by microphone  
2. Audio streamed to backend via WebSocket  
3. AI processes request and triggers the outgoing call using Twilio+OpenAI \+ MongoDB  
4. Response generated  
5. Recommends the medicines

### **Output Response**

* AI responds in natural speech  
* Provides medicine suggestions  
* Confirms orders or status updates

## **2.4 Key Functionalities**

* Medicine search and recommendations  
* Voice-based order placement  
* Inventory status checking  
* Order tracking  
* Call transcript logging  
* Payment link generation

## **2.5 Troubleshooting**

### **Microphone not detected**

arecord \-l

- Check hardware connection.

### **No audio output**

alsamixer

- Unmute and increase volume.

### **Connection issues**

* Check internet connectivity  
* Verify backend URL in **.env**  
* Ensure FastAPI server is running

## **2.8 Shutdown Procedure**

**Safely stop system:**

sudo shutdown now

# **Summary**

Raspberry Pi in MediVoice AI serves as an edge voice device that connects physical hardware with cloud-based AI services, enabling real-time conversational pharmacy automation.

