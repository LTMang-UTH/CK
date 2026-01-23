import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const { register, lastError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert('Vui lòng nhập email');
      return;
    }

    if (!validateEmail(email)) {
      alert('Vui lòng nhập email hợp lệ');
      return;
    }

    if (password !== confirmPassword) {
      alert('Mật khẩu và xác nhận mật khẩu không khớp');
      return;
    }

    setLoading(true);
    const success = await register(username, password, email);
    setLoading(false);

    if (success) {
      alert('Đăng ký thành công!');
      navigate('/login');
    } else {
      alert(lastError || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h1 className="register-title">Đăng ký</h1>
        <form onSubmit={handleRegister} className="register-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        <div className="register-links">
          <Link to="/login" className="link">
            Đã có tài khoản? Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

