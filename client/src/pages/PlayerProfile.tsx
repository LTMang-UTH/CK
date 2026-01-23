import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AuthService } from '../services/authService';
import type { UserData } from '../types';
import './PlayerProfile.css';

const PlayerProfile = () => {
  const navigate = useNavigate();
  const { username } = useAuthStore();
  const [profile, setProfile] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const data = await AuthService.getUserProfile();
      if (data?.data) {
        setProfile(data.data);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  if (loading) {
    return <div className="profile-container">Đang tải...</div>;
  }

  if (!profile) {
    return <div className="profile-container">Không thể tải hồ sơ</div>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="profile-container">
      <div className="profile-box">
        <h1 className="profile-title">Hồ Sơ Người Chơi</h1>
        <div className="profile-content">
          <div className="profile-field">
            <label>Tên đăng nhập:</label>
            <div className="profile-value">{profile.username}</div>
          </div>
          <div className="profile-field">
            <label>Email:</label>
            <div className="profile-value">{profile.email}</div>
          </div>
          <div className="profile-field">
            <label>Ngày tham gia:</label>
            <div className="profile-value">{formatDate(profile.createdAt)}</div>
          </div>
        </div>
        <div className="profile-actions">
          <button onClick={() => navigate('/change-password')} className="btn-primary">
            Đổi Mật Khẩu
          </button>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Về Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;

