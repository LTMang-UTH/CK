import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import './ChangePassword.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      alert('Vui lòng nhập đầy đủ các trường bắt buộc.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Mật khẩu không khớp. Vui lòng thử lại.');
      return;
    }

    setLoading(true);
    const success = await AuthService.changePassword(newPassword);
    setLoading(false);

    if (success) {
      alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      navigate('/login');
    } else {
      alert('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-box">
        <h1 className="change-password-title">Đổi Mật Khẩu</h1>
        <form onSubmit={handleChangePassword} className="change-password-form">
          <div className="form-group">
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Đang đổi...' : 'Đổi Mật Khẩu'}
          </button>
        </form>
        <button onClick={() => navigate('/profile')} className="btn-link">
          Về Hồ Sơ
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;

