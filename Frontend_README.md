# MediVoice AI – Frontend User Manual (Final Updated Version)

---

## 1. Overview

The MediVoice AI frontend is a React-based web application that enables pharmacy and dealer users to interact with the AI-powered voice communication system and backend services.

The application provides the following features:

* AI-based call triggering
* Inventory and order management
* Dashboard-based monitoring
* Conversation tracking
* Analytics and reporting

The frontend communicates with a Node.js backend using REST APIs and dynamically updates data based on user actions.

---

## 2. Project Structure

The frontend is located inside the `client/` folder.

### Main Structure

```text
client/
  index.html
  public/
  src/
    App.tsx
    main.tsx
    index.css
    pages/
    components/
    hooks/
    lib/
```

---

### File/Folder Description

* **index.html** - Root HTML file where the React app loads
* **main.tsx** - Entry point of the application
* **App.tsx** - Handles routing and page navigation
* **index.css** - Global styling (Tailwind CSS)

---

### src/pages/

Contains all main application screens such as:

* Pharmacy dashboard
* Dealer dashboard
* Voice call interface
* Orders and inventory pages

---

### src/components/

Reusable UI components such as:

* buttons
* cards
* tables
* layout elements

---

### src/hooks/

Custom React hooks used for:

* Toast notifications (use-toast.ts)
* Mobile responsiveness (use-mobile.tsx)

---

### src/lib/

Utility functions for:

* API request handling (e.g., sending requests to backend endpoints)
* Shared helper functions used across components

---

## 3. Key Functional Modules

### Landing Page

* Entry point of the application
* Allows user to select:

  * Pharmacy portal
  * Dealer portal

---

### Dashboard

#### Pharmacy Dashboard

* View orders and invoices
* Access medicine catalog
* Trigger AI voice calls

#### Dealer Dashboard

* View analytics (orders, conversations, stock)
* Monitor pharmacies
* Manage inventory and offers

---

### Voice Call Interface

Location:
`client/src/pages/pharmacy/voice.tsx`

Features:

* “Call AI Bot Now” button
* Sends a request to backend API
* Initiates Twilio call
* Connects user to AI voice assistant

---

### Inventory Management

* View available medicines
* Track stock levels
* Monitor expiry dates and discounts

---

### Conversations

* View AI-generated call transcripts
* Search and filter conversations
* Track communication history

---

### Orders and Invoices

* Create and manage orders
* View order details
* Print invoices

---

### Offers and Promotions

* Display available offers
* Manage discounts
* Highlight expiring medicines

---

## 4. Technology Stack

The frontend is built using:

* React (Vite)
* TypeScript
* Tailwind CSS
* REST API integration using fetch and state management

---

## 5. Running the Frontend

### Install dependencies:

```
npm install
```

---

### Start the application:

```
npm run dev
```

---

### Open in browser:

```
http://localhost:3000
```

---

## 6. API Communication

The frontend communicates with the backend using REST APIs:

```
/api/*
```

Examples:

* `/api/twilio/outbound` → Trigger AI call
* `/api/orders` → Manage orders
* `/api/conversations` → Fetch transcripts
* `/api/stock-requests` → Inventory updates

---

## 7. Data Update Mechanism

The frontend updates data dynamically using API calls and state management.

* When a user performs an action (such as placing an order or triggering a call),
* The frontend sends a request to the backend
* The backend processes and updates the database
* The frontend then fetches updated data and refreshes the UI

No real-time streaming (such as WebSockets or SSE) is used in the frontend.

---

## 8. Application Flow

### A. AI Call Flow

1. User clicks “Call AI Bot Now”
2. Frontend sends a POST request to backend
3. Backend triggers a Twilio call
4. AI system handles the voice interaction
5. Data is stored in the database
6. Updated information is fetched and displayed in the UI

---

### B. Data Flow

1. User performs an action
2. API request is sent to backend
3. Backend processes the request
4. Database is updated
5. Frontend fetches updated data
6. UI reflects changes

---

## 9. Important UI Interactions

* Call button → Initiates AI call
* Search fields → Filter data
* Dashboard cards → Display key metrics
* Tables → Show structured data

---

## 10. Troubleshooting

### App not loading

* Ensure `npm run dev` is running
* Check browser console for errors

---

### Call button not working

* Check request to `/api/twilio/outbound`
* Verify backend is running

---

### Data not updating

* Refresh the page
* Check backend logs
* Verify API responses

---

### Data not visible

* Verify MongoDB connection
* Ensure backend services are active

---

## 11. Security Notes

* No API keys are stored in the frontend
* Sensitive operations are handled in the backend
* Avoid hardcoding credentials
* Validate user input before sending requests

---

## 12. Future Improvements

* Authentication system (JWT-based)
* Role-based access control
* Improved UI/UX
* Cloud deployment
* Advanced analytics

---

## 13. Conclusion

The MediVoice AI frontend provides a clean and interactive interface for managing pharmacy operations and interacting with an AI-powered voice system. It integrates backend APIs, structured UI components, and dynamic data updates to deliver a smooth user experience.
