import './PlayerCard.css';

interface PlayerCardProps {
  playerName: string;
  playerScore: number;
  playerId?: string; // socket.id của player
  isHost?: boolean; // Có phải là host không
  currentUsername?: string; // Username của người đang xem (để so sánh với playerName)
  onKick?: (playerId: string, playerName: string) => void; // Callback khi kick player
}

const PlayerCard = ({ playerName, playerScore, playerId, isHost, currentUsername, onKick }: PlayerCardProps) => {
  const isCurrentUser = currentUsername === playerName;
  const canKick = isHost && !isCurrentUser && onKick && playerId; // Chỉ host mới kick được, không kick chính mình

  const handleKick = () => {
    if (onKick && playerId) {
      // Kick trực tiếp, không cần confirm (có thể thêm custom confirmation dialog sau nếu cần)
      onKick(playerId, playerName);
    }
  };

  return (
    <div className="player-card">
      <div className="player-info">
        <div className="player-name">{playerName}</div>
        <div className="player-score">Score: {playerScore}</div>
      </div>
      {canKick && (
        <button className="kick-button" onClick={handleKick} title={`Đuổi ${playerName}`}>
          ✕
        </button>
      )}
    </div>
  );
};

export default PlayerCard;

