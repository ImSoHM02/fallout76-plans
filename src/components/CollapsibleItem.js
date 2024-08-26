import React, { useState, useCallback, useMemo, memo } from 'react';

const CollapsibleItem = memo(({ title, children, isCheckAll, onCheckAllChange, isUnobtainable }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleCheckAllChange = useCallback(() => {
    onCheckAllChange();
  }, [onCheckAllChange]);

  const memoizedTitle = useMemo(() => (
    <button
      className={`group-title-style ${isUnobtainable ? "unobtainable-plan" : ""}`}
      onClick={toggleOpen}
    >
      {isOpen ? "▼" : "►"} {title}
    </button>
  ), [isOpen, isUnobtainable, title, toggleOpen]);

  const memoizedCheckAll = useMemo(() => (
    isCheckAll !== undefined && (
      <label className="check-all-label">
        <input
          type="checkbox"
          className="check-all-checkbox"
          checked={isCheckAll}
          onChange={handleCheckAllChange}
        />
        Check All
      </label>
    )
  ), [isCheckAll, handleCheckAllChange]);

  return (
    <div className="item-container-style">
      <div className="group-title-container-style">
        {memoizedTitle}
        {memoizedCheckAll}
      </div>
      {isOpen && <div className="details-container-style">{children}</div>}
    </div>
  );
});

CollapsibleItem.displayName = 'CollapsibleItem';

export default CollapsibleItem;