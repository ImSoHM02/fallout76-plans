import React, { useState } from 'react';

const CollapsibleItem = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {isOpen ? '▼' : '►'} {title}
      </div>
      {isOpen && <div style={{ marginLeft: '20px' }}>{children}</div>}
    </div>
  );
};

export default CollapsibleItem;