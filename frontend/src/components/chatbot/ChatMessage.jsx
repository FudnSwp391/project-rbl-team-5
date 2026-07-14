import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import ChatbotIcon from "./ChatbotIcon.jsx"

const ChatMessage = ({ chat, onProductClick }) => {
  return (
    <div className={`message ${chat.role === "model" ? 'bot' : 'user'}-message`}>
      {chat.role === "model" && <ChatbotIcon />}
      <div className="message-text">
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          remarkPlugins={[remarkGfm]}
          components={{
            ul: (props) => <ul className="my-list" {...props} />,
            strong: (props) => <strong className="font-bold" {...props} />,
            a: (props) => {
              const href = props.href;
              const children = props.children;
              const match = href && href.match(/^#product-(\d+)$/);
              if (match) {
                return React.createElement(
                  'a',
                  {
                    href: '#',
                    className: 'product-link',
                    onClick: function (e) {
                      e.preventDefault();
                      if (onProductClick) onProductClick(match[1]);
                    }
                  },
                  children
                );
              }
              return React.createElement('a', { href: href }, children);
            }
          }}
        >
          {chat.text || ''}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default ChatMessage