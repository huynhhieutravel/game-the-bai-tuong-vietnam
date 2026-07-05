const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const modalCode = `
const CanGianModal = ({ req, gameState, onConfirm }) => {
  const [selectedCardIdx, setSelectedCardIdx] = React.useState(null);
  const me = gameState.players.find(p => p.id === req.askQueue[0]);
  const target = gameState.players.find(p => p.id === req.targetId);
  return (
    <div style={{ textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 10px', color: '#60a5fa' }}>🛡️ CAN GIÁN (Chu Văn An)</h3>
      <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>
        Bạn có muốn đưa 1 lá bài cho {target ? target.name : 'tướng Hà'} để vô hiệu hóa Cẩm Nang này không?
      </p>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '15px' }}>
        {me && me.hand.map((c, i) => (
          <div 
             key={i} 
             onClick={() => setSelectedCardIdx(i)}
             style={{
                border: selectedCardIdx === i ? '2px solid #3b82f6' : '1px solid #ccc',
                padding: '5px', borderRadius: '4px', cursor: 'pointer',
                background: selectedCardIdx === i ? 'rgba(59,130,246,0.1)' : '#fff',
                color: '#000'
             }}
          >
             {c.name} {c.suit}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
           className="btn btn-primary" 
           disabled={selectedCardIdx === null}
           onClick={() => onConfirm({ doReact: true, cardIndexSelected: selectedCardIdx })}
        >
           Đưa bài cản Cẩm Nang
        </button>
        <button 
           className="btn btn-secondary" 
           onClick={() => onConfirm({ doReact: false })}
        >
           Bỏ qua
        </button>
      </div>
    </div>
  );
};
`;

content = content.replace('const App = () => {', modalCode + '\nconst App = () => {');

const renderBlock = `
        if (req.type === 'ask_can_gian' && req.askQueue && req.askQueue[0] === 0) {
          return (
            <div style={modalStyle}>
              <CanGianModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }
`;
content = content.replace(/(if \(req\.type === 'ask_thong_ngon')/, renderBlock + '\n        $1');

fs.writeFileSync(file, content);
