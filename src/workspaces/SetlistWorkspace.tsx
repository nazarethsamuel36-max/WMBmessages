import React from 'react';
import { useApp } from '../context/AppContext';

export const SetlistWorkspace: React.FC = () => {
  const { state, openMessage, selectReading, removeFromSetlist, setWorkspace } = useApp();
  const { setlist } = state;

  const handleSelectEntry = async (entry: typeof setlist[0]) => {
    await openMessage(entry.messageIndex);
    selectReading(entry.paragraphIndex, 0);
    setWorkspace('reader');
  };

  return (
    <div className="setlist-workspace">
      <div className="setlist-workspace-header">Setlist Panel</div>

      {setlist.length === 0 ? (
        <div className="setlist-empty">
          No items in setlist.
          <br />
          Add paragraphs from the Reader using the + button.
        </div>
      ) : (
        <div className="setlist-list">
          {setlist.map((entry, index) => (
            <div
              key={index}
              className="setlist-card"
              onClick={() => handleSelectEntry(entry)}
            >
              <div className="setlist-card-body">
                <div className="setlist-card-date">{entry.msgDate}</div>
                <div className="setlist-card-para">Paragraph {entry.paraNum}</div>
              </div>
              <button
                className="btn-remove"
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromSetlist(index);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
