import React from 'react';
import './Leaderboard.css';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface LeaderboardProps {
  players: Player[];
  currentUsername: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ players, currentUsername }) => {
  /**
   * Sắp xếp players theo điểm giảm dần
   * QUAN TRỌNG: Điểm số KHÔNG bị reset khi chuyển turn hoặc round
   * - Điểm hiển thị là tổng điểm cộng dồn qua tất cả các lần đoán trúng
   * - Mỗi lần đoán đúng, điểm được cộng vào tổng điểm của người chơi
   * - Điểm này được tích lũy qua tất cả các rounds và turns
   * - Khi kết thúc turn và bắt đầu turn mới, điểm giữ nguyên, chỉ thứ hạng thay đổi
   */
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="leaderboard-section">
      <h3>🏆 Xếp Hạng</h3>
      <div className="leaderboard-subtitle">Tổng điểm tất cả rounds</div>
      <div className="leaderboard-list">
        {sortedPlayers.map((player, index) => {
          const isCurrentUser = player.name === currentUsername;
          return (
            <div
              key={player.id}
              className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''}`}
            >
              <div className="leaderboard-rank">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && `#${index + 1}`}
              </div>
              <div className="leaderboard-info">
                <div className="leaderboard-name">
                  {player.name}
                  {isCurrentUser && ' (Bạn)'}
                </div>
                <div className="leaderboard-score">
                  <span className="score-label">Tổng:</span> {player.score} điểm
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;

