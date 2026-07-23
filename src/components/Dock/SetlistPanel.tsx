import React from 'react';
import { SetlistEntry } from '../../types';

interface SetlistPanelProps {
  setlist: SetlistEntry[];
  onSelectEntry: (entry: SetlistEntry) => void;
  onRemoveEntry: (index: number) => void;
}

export const SetlistPanel: React.FC<SetlistPanelProps> = ({
  setlist,
  onSelectEntry,
  onRemoveEntry,
}) => {
  return (
    <div className="setlist-panel">
      <div className="panel-label">Setlist</div>
      <div className="setlist-items">
        {setlist.length === 0 ? (
          <div className="setlist-empty">
            Add paragraphs
            <br />
            using the + button
          </div>
        ) : (
          setlist.map((entry, index) => (
            <div
              key={index}
              className="setlist-item"
              onClick={() => onSelectEntry(entry)}
            >
              <div className="sl-msg">{entry.msgDate}</div>
              <div className="sl-para">¶ {entry.paraNum}</div>
              <button
                className="sl-remove"
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveEntry(index);
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
