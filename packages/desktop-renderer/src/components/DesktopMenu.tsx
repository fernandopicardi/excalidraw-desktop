import React from 'react';
import './DesktopMenu.css';

interface DesktopMenuProps {
  onImportMermaid: () => void;
  onNew: () => void;
  onSave: () => void;
  onOpen: () => void;
}

const DesktopMenu: React.FC<DesktopMenuProps> = ({
  onImportMermaid,
  onNew,
  onSave,
  onOpen
}) => {
  return (
    <div className="desktop-menu">
      <div className="menu-group">
        <button onClick={onNew} className="menu-button">
          New
        </button>
        <button onClick={onOpen} className="menu-button">
          Open
        </button>
        <button onClick={onSave} className="menu-button">
          Save
        </button>
      </div>
      
      <div className="menu-group">
        <button onClick={onImportMermaid} className="menu-button mermaid-button">
          Import Mermaid
        </button>
      </div>
    </div>
  );
};

export { DesktopMenu };
