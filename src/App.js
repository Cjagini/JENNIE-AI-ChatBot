import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Get API URL from environment or use default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! I\'m JENNIE. How can I help you today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) {
      return;
    }

    // Add user message to chat
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/chat`,
        {
          message: inputValue,
          sessionId,
        }
      );

      const botMessage = {
        id: messages.length + 2,
        text: response.data.reply,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: messages.length + 2,
        text: error.response?.data?.error || 'Failed to get response. Please make sure the backend server is running and your API key is configured.',
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 1,
        text: 'Hello! I\'m JENNIE. How can I help you today?',
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <h1>🤖 JENNIE</h1>
          <button className="clear-btn" onClick={handleClearChat}>
            Clear Chat
          </button>
        </div>

        <div className="messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
            >
              <div className="message-content">
                {message.text}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message bot loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Type your question here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || !inputValue.trim()}>
            {loading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
