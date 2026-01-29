from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
import os
from typing import Optional
import uvicorn

load_dotenv()

app = FastAPI(title="JENNIE API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    print(f"✓ Gemini API configured")
else:
    print("⚠ Warning: GEMINI_API_KEY not found in .env file")

# Store conversation history
conversation_histories = {}

# Models


class ChatMessage(BaseModel):
    message: str
    sessionId: Optional[str] = "default"


class ChatResponse(BaseModel):
    reply: str
    sessionId: str

# Health check endpoint


@app.get("/api/health")
async def health_check():
    return {"status": "Server is running", "api": "Gemini"}

# Chat endpoint


@app.post("/api/chat", response_model=ChatResponse)
async def chat(chat_msg: ChatMessage):
    try:
        if not chat_msg.message:
            raise HTTPException(status_code=400, detail="Message is required")

        if not api_key:
            raise HTTPException(
                status_code=500, detail="Gemini API key is not configured")

        session_id = chat_msg.sessionId

        # Get or create conversation history for this session
        if session_id not in conversation_histories:
            conversation_histories[session_id] = []

        history = conversation_histories[session_id]

        # Use the latest available model
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Build conversation context
        conversation_text = ""
        for h in history[-6:]:  # Last 6 messages for context
            role = "Me" if h["role"] == "user" else "Assistant"
            conversation_text += f"{role}: {h['content']}\n"

        conversation_text += f"Me: {chat_msg.message}\nAssistant:"

        # Generate response
        response = model.generate_content(conversation_text)
        assistant_message = response.text if response.text else "I couldn't generate a response at this moment. Please try again."

        # Add to history
        history.append({
            "role": "user",
            "content": chat_msg.message
        })
        history.append({
            "role": "assistant",
            "content": assistant_message
        })

        # Keep only last 20 messages
        if len(history) > 20:
            history.pop(0)
            history.pop(0)

        print(f"✓ Response sent for session {session_id}")
        return ChatResponse(reply=assistant_message, sessionId=session_id)

    except HTTPException:
        raise
    except Exception as error:
        print(f"✗ Error: {str(error)}")
        error_detail = str(error) if os.getenv(
            "NODE_ENV") == "development" else "Failed to process your request"
        raise HTTPException(status_code=500, detail=error_detail)

# Clear conversation history


@app.delete("/api/chat/history/{session_id}")
async def clear_history(session_id: str):
    if session_id in conversation_histories:
        del conversation_histories[session_id]
    return {"message": "Conversation history cleared"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"🤖 JENNIE Backend running on http://localhost:{port}")
    print(f"📡 API endpoints available at http://localhost:{port}/api")
    print(f"📚 Swagger docs available at http://localhost:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
