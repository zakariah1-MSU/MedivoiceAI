# **Database Deliverables**

## **1\. Introduction**

This document provides a comprehensive overview of the MongoDB database implementation for the MediVoice AI system. It includes database design, setup procedures, connection configuration, data operations, and best practices.

## **2\. Objective**

* Design a scalable NoSQL database for MediVoice AI  
* Store and manage medicines, orders, clients, and conversations  
* Enable efficient data retrieval and updates  
* Support real-time voice-based interactions.

## **3\. Database Technology**

* Database: MongoDB (Atlas / Cloud)  
* Language: Python  
* Driver: PyMongo

## **4\. Database Collections Design**

### **4.1 Pharmacies Collection**

Stores pharmacist/customer details.

**Schema:**

{

  "pharmacy\_id": "String (Primary Key)",

  "name": "String",

  "contact": "String (Unique)",

  "location": "String",

  "language\_preference": "String",

  "business\_type": "String",

  "preferred\_brands": \["String"\],

  "discount\_tier": "String",

  "last\_order\_date": "Date"

}

**Sample data:**

{  
  "pharmacy\_id": "P002",  
  "name": "Walmart Pharmacy",  
  "contact": "+19788776655",  
  "location": "Dover",  
  "language\_preference": "English",  
  "business\_type": "Wholesale Distributor",  
  "preferred\_brands": \[  
    "Pfizer",  
    "Johnson & Johnson"  
  \],  
  "discount\_tier": "Silver",  
  "last\_order\_date": "2025-11-24"  
}

### **4.2 Medicines Collection**

Stores medicine catalog as a  JSON format.

**Schema:**

{

  "medicine\_id": "String (Primary Key)",

  "name": "String",

  "category": "String",

  "manufacturer": "String",

  "price\_per\_unit": "Number",

  "stock\_quantity": "Number",

  "expiry\_date": "Date",

  "description": "String",

  "alternative\_medicines": \["String"\],

  "seasonal\_demand": \["String"\],

  "discount": "Number"

}

**Sample data:**

{  
  "medicine\_id": "M001",  
  "name": "paracetamol 500 mg",  
  "category": "Pain Relief",  
  "manufacturer": "Cipla",  
  "price\_per\_unit": 0.25,  
  "stock\_quantity": 488,  
  "expiry\_date": "2026-05-30",  
  "description": "Used for fever and mild pain relief",  
  "alternative\_medicines": \[  
    "Crocin",  
    "Calpol"  
  \],  
  "seasonal\_demand": \[  
    "Winter",  
    "Monsoon"  
  \],  
  "discount": 10  
}

### 

### **4.3 Orders Collection**

Stores order details.

**Schema:**

{

  "order\_id": "String (Primary Key)",

  "pharmacist\_id": "String (Foreign Key)",

  "conversation\_id": "String",

  "items": \[

    {

      "medicine\_id": "String",

      "quantity": "Number",

      "unit\_price": "Number"

    }

  \],

  "total\_amount": "Number",

  "status": "String",

  "delivery\_date": "Date",

  "payment\_status": "String",

  "mode\_of\_payment": "String",

  "order\_timestamp": "Date"

}

**Sample data:**

{  
  "order\_id": "O1003",  
  "pharmacist\_id": "P003",  
  "conversation\_id": "C003",  
  "items": \[  
    {  
      "medicine\_id": "M004",  
      "quantity": 75,  
      "unit\_price": 1.5  
    },  
    {  
      "medicine\_id": "M005",  
      "quantity": 30,  
      "unit\_price": 2.25  
    }  
  \],  
  "total\_amount": 168.75,  
  "status": "Delivered",  
  "delivery\_date": "2025-11-26",  
  "payment\_status": "Paid",  
  "mode\_of\_payment": "Credit card",  
  "order\_timestamp": "2025-11-25"  
}

### **4.4 Conversations Collection**

Stores call transcripts.

**Schema:**

{

  "conversation\_id": "String (Primary Key)",

  "pharmacist\_id": "String (Foreign Key)",

  "call\_type": "String",

  "timestamp": "DateTime",

  "transcript\_text": "String",

  "summary": "String",

  "related\_medicines": \["String"\],

  "related\_offers": \["String"\],

  "embedding\_vector": \["Number"\],

  "sentiment": "String",

  "duration\_sec": "Number"

}

**Sample data:**

{  
  "conversation\_id": "C003",  
  "pharmacist\_id": "P003",  
  "call\_type": "outbound",  
  "timestamp": "2025-10-26T09:30:00Z",  
  "transcript\_text": "Good morning\! We are offering a 10% discount on Vitamin D supplements this week.",  
  "summary": "AI bot promoted discount on Vitamin D supplements.",  
  "related\_medicines": \[  
    "M005"  
  \],  
  "related\_offers": \[  
    "OF001"  
  \],  
  "embedding\_vector": \[  
    \-0.08,  
    0.29,  
    0.44,  
    \-0.11,  
    0.32,  
    0.21,  
    \-0.03,  
    0.17  
  \],  
  "sentiment": "positive",  
  "duration\_sec": 75  
}

### **4.5 Schedules Collection**

Stores reminder schedules.

**Schema:**

{

  "schedule\_id": "String (Primary Key)",

  "pharmacist\_id": "String",

  "schedule\_type": "String",

  "medicine\_ids": \["String"\],

  "offer\_ids": \["String"\],

  "scheduled\_time": "DateTime",

  "status": "String",

  "notes": "String",

  "last\_executed": "DateTime",

  "next\_execution": "DateTime"

}

**Sample data:**

{  
  "schedule\_id": "S003",  
  "pharmacist\_id": "P003",  
  "schedule\_type": "inventory\_check",  
  "medicine\_ids": \[  
    "M004",  
    "M005"  
  \],  
  "offer\_ids": \[\],  
  "scheduled\_time": "2025-10-29T14:00:00Z",  
  "status": "pending",  
  "notes": "Check Vitamin C and Antibiotic stock for reorder alert",  
  "last\_executed": null,  
  "next\_execution": "2025-10-30T14:00:00Z"  
}

### **4.6 Offers Collection**

Stores offer details.   
**Schema:**   
{  
  "offer\_id": "String (Primary Key)",  
  "offer\_name": "String",  
  "description": "String",  
  "valid\_from": "Date",  
  "valid\_to": "Date",  
  "applicable\_medicines": \["String"\],  
  "discount\_percent": "Number",  
  "target\_group": "String",  
  "promotion\_channel": \["String"\],  
  "status": "String"  
}  
**Sample data:**  
{  
  "offer\_id": "OF002",  
  "offer\_name": "New Year Mega Deal",  
  "description": "15% discount on antibiotics and pain relief medicines.",  
  "valid\_from": "2025-12-25",  
  "valid\_to": "2026-01-10",  
  "applicable\_medicines": \[  
    "M001",  
    "M002",  
    "M004"  
  \],  
  "discount\_percent": 15,  
  "target\_group": "Gold",  
  "promotion\_channel": \[  
    "Outbound Calls",  
    "Email"  
  \],  
  "status": "Scheduled"  
}

### **4.7 Personalization Collection**

Stores personalization of pharmacies to make the calls based on res notes.  
**Schema:**  
{  
  "personalization\_id": "String (Primary Key)",  
  "pharmacist\_id": "String",  
  "preferred\_medicines": \["String"\],  
  "preferred\_discount\_range": "String",  
  "communication\_tone": "String",  
  "seasonal\_patterns": {  
    "rainy": \["String"\],  
    "summer": \["String"\]  
  },  
  "last\_offer\_accepted": "String",  
  "reorder\_frequency\_days": "Number",  
  "average\_order\_value": "Number",  
  "repeat\_call\_frequency": {  
    "winter": "String",  
    "summer": "String"  
  },  
  "notes": "String",  
  "embedding\_vector\_id": "String",  
  "last\_updated": "DateTime"  
}

**Sample data:**  
{  
  "\_id": {  
    "$oid": "6907f5d5ecfe6ce235afca2d"  
  },  
  "personalization\_id": "PER002",  
  "pharmacist\_id": "P002",  
  "preferred\_medicines": \[  
    "Amoxicillin",  
    "Cetrizine"  
  \],  
  "preferred\_discount\_range": "5-10%",  
  "communication\_tone": "friendly",  
  "seasonal\_patterns": {  
    "rainy": \[  
      "Antifungal Creams"  
    \],  
    "summer": \[  
      "ORS"  
    \]  
  },  
  "last\_offer\_accepted": "OFR004",  
  "reorder\_frequency\_days": 10,  
  "average\_order\_value": 950,  
  "repeat\_call\_frequency": {  
    "winter": "7 days",  
    "summer": "15 days"  
  },  
  "notes": "Likes being reminded about new stock arrivals.",  
  "embedding\_vector\_id": "EMB002",  
  "last\_updated": {  
    "$date": "2025-10-24T16:30:00.000Z"  
  }  
}

### **4.8 Inventory Collection**

Stores details of medicines stock availability.  
**Schema:**  
{  
  "inventory\_id": "String (Primary Key)",  
  "medicine\_id": "String",  
  "medicine\_name": "String",  
  "stock\_quantity": "Number",  
  "warehouse\_location": "String",  
  "last\_restock\_date": "Date",  
  "next\_restock\_due": "Date",  
  "order\_limit": "Number",  
  "status": "String"  
}  
**Sample data:**  
{  
  "inventory\_id": "INV002",  
  "medicine\_id": "M002",  
  "medicine\_name": "Amoxicillin 250mg",  
  "stock\_quantity": 40,  
  "warehouse\_location": "Parsipanny",  
  "last\_restock\_date": "2025-10-10",  
  "next\_restock\_due": "2025-10-30",  
  "order\_limit": 50,  
  "status": "low\_stock"  
}

### **4.9 Live\_Conversations Collection**

Stores live conversations but it deletes after outgoing calls are done regarding that conversation happened in the pharmacy store.  
**Schema:**  
{  
  "pharmacy\_name": "String",  
  "pharmacist\_text": "String",  
  "ai\_response": "String",  
  "timestamp": "DateTime",  
  "type": "String",  
  "status": "String",  
  "call\_sid": "String",  
  "\_\_v": "Number"  
}  
**Sample data:**  
{  
  "pharmacy\_name": "+18553591523",  
  "pharmacist\_text": "Hi maryville. How are you.",  
  "ai\_response": "Hi there\! I'm just lines of code, but ready to assist you. How can I help with your pharmaceutical needs today?",  
  "timestamp": {  
    "$date": "2026-04-16T03:29:06.271Z"  
  },  
  "type": "inbound",  
  "status": "transcribed",  
  "call\_sid": "CA2b18338299c06902936e726d71e046a8",  
  "\_\_v": 0  
}

### **4.10 Keyword\_Extractions Collection**

**Sample data:**  
{
  "pharmacy_name": null,
  "pharmacy_id": null,
  "medicine": "aspirin",
  "intent": "stock_low",
  "summary": "Staff mentioned that aspirin stock is running low.",
  "transcript": "I think we are running out of aspirin.",
  "language": "es",
  "source": "mediavoice_listener",
  "created_at": {
    "$date": "2026-03-26T02:43:22.687Z"
  },
  "auto_call_status": "failed",
  "picked_at": {
    "$date": "2026-04-22T22:58:10.495Z"
  },
  "auto_call_error": "can't subtract offset-naive and offset-aware datetimes",
  "processed_at": {
    "$date": "2026-04-22T22:58:10.531Z"
  }
}


## **5\. Database Setup (Step-by-Step)**

### **Step 1: Create MongoDB Atlas Cluster**

1. Sign up on MongoDB Atlas  
2. Create a free cluster  
3. Create a database user  
4. Add IP whitelist (0.0.0.0/0 for testing)

### **Step 2: Obtain Connection String**

Example:

mongodb+srv://username:password@cluster.mongodb.net/medivoice\_ai

### **Step 3: Configure Environment Variables**

MONGODB\_URI=mongodb+srv://username:password@cluster.mongodb.net/medivoice\_ai  
MONGODB\_DB\_NAME=medivoice\_ai

## **6\. Database Connection Implementation**

from pymongo import MongoClient  
import os  
from dotenv import load\_dotenv

load\_dotenv()

MONGODB\_URI \= os.getenv("MONGODB\_URI")  
MONGODB\_DB\_NAME \= os.getenv("MONGODB\_DB\_NAME", "medivoice\_ai")

client \= MongoClient(MONGODB\_URI)  
db \= client\[MONGODB\_DB\_NAME\]

clients \= db\["Pharmacies"\]  
medicines \= db\["Medicines"\]  
orders \= db\["Orders"\]  
call\_transcripts \= db\["Conversations"\]  
schedules \= db\["Schedules"\]

## **7\. Data Operations**

### **7.1 Insert Data**

clients.insert\_one({"pharmacist\_id": "P001", "name": "John"})

### **7.2 Retrieve Data**

clients.find\_one({"pharmacist\_id": "P001"})

### **7.3 Update Data**

clients.update\_one(  
    {"pharmacist\_id": "P001"},  
    {"$set": {"name": "Updated"}}  
)

### **7.4 Delete Data**

clients.delete\_one({"pharmacist\_id": "P001"})

## **8\. Indexing Strategy**

clients.create\_index("contact")  
orders.create\_index("order\_id")  
medicines.create\_index("medicine\_id")

## **9\. Storing data** 
1. Medicines validated from Medicines collection  
2. Order stored in Orders collection  
3. Transcript saved in Conversations collection  
4. Client data updated in Pharmacies collection

## **10\. Testing Database Connection**

try:  
    client.admin.command("ping")  
    print("Database connected")  
except Exception as e:  
    print("Connection error", e)


