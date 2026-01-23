import { websocketService } from '../services/websocketService';
import { useGameStore } from '../store/gameStore';
import './WordButton.css';

interface WordButtonProps {
  word: string;
}

const WordButton = ({ word }: WordButtonProps) => {
  const { roomId } = useGameStore();

  const handleClick = () => {
    websocketService.emit('chooseWord', { roomId, word });
  };

  return (
    <button className="word-button" onClick={handleClick}>
      {word}
    </button>
  );
};

export default WordButton;

