const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const modalCode = `
const HauVienModal = ({ req, gameState, onConfirm }) => {
  const [selectedTarget, setSelectedTarget] = React.useState(null);
  return (
    <div style={{ textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 10px', color: '#60a5fa' }}>🏰 HẬU VIỆN (Dương Đình Nghệ)</h3>
      <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>
        Bạn có muốn nhường [Đào] cho tướng có Hậu Viện để rút 1 lá bài không?
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
        {req.targets.map(tid => {
          const t = gameState.players.find(p => p.id === tid);
          const isSelected = selectedTarget === tid;
          return (
            <div 
              key={tid}
              onClick={() => setSelectedTarget(tid)}
              style={{
                padding: '10px', 
                border: isSelected ? '2px solid #3b82f6' : '1px solid #ccc',
                borderRadius: '8px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
              }}
            >
              {t.name} (HP: {t.hp}/{t.maxHp})
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
           className="btn btn-primary" 
           disabled={selectedTarget === null}
           onClick={() => onConfirm({ doReact: true, targetId: selectedTarget })}
        >
           Nhường Đào
        </button>
        <button 
           className="btn btn-secondary" 
           onClick={() => onConfirm({ doReact: false })}
        >
           Tự hồi máu
        </button>
      </div>
    </div>
  );
};
`;

// Insert the modal before the App component definition
content = content.replace('const App = () => {', modalCode + '\nconst App = () => {');

// Insert the render block inside the main modal conditional
const renderBlock = `
        if (req.type === 'ask_hau_vien' && req.sourceId === 0) {
          return (
            <div style={modalStyle}>
              <HauVienModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }
`;
content = content.replace(/(if \(req\.type === 'ask_tien_phat')/, renderBlock + '\n        $1');

fs.writeFileSync(file, content);
