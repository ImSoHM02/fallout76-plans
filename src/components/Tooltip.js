import React, { useState, useRef, useEffect } from 'react';
import './Tooltip.css';

const Tooltip = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // 10px above the element
        left: rect.left + rect.width / 2 // Centered horizontally
      });
    }
  }, [isVisible]);

  return (
    <div 
      ref={triggerRef}
      className="tooltip-container" 
      onMouseEnter={() => setIsVisible(true)} 
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className="tooltip-text" 
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;