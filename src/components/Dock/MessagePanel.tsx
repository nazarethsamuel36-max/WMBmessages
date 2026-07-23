import React from 'react';
import { Message } from '../../types';

interface MessagePanelProps {
  messages: Message[];
  currentMessageIndex: number;
  onSelectMessage: (index: number) => void;
}

export const MessagePanel: React.FC<MessagePanelProps> = ({
  messages,
  currentMessageIndex,
  onSelectMessage,
}) => {
  return (
    <div className="message-panel" id="messagePanel">
      <div className="panel-label">Messages</div>
      <div id="messageList">
        {messages.length === 0 ? (
          <div className="loading-msg">Loading…</div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`message-item ${index === currentMessageIndex ? 'active' : ''}`}
              onClick={() => onSelectMessage(index)}
            >
              <div className="msg-date">{msg.date}</div>
              <div className="msg-title">{msg.title}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
