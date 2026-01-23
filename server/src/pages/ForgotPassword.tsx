import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService } from '../services/authService';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    if (!validateEmail(email)) {
      alert('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      const success = await AuthService.forgotPassword(email);
      setLoading(false);

      if (success) {
        alert('OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');
        setStep('otp');
      } else {
        alert('Gửi OTP thất bại. Vui lòng thử lại.');
      }
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error.response?.data?.message || error.message || 'Gửi OTP thất bại. Vui lòng kiểm tra email và thử lại.';
      alert(errorMessage);
      console.error('Send email error:', error);
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      alert('Vui lòng nhập mã OTP 6 chữ số hợp lệ.');
      return;
    }

    setStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      alert('Vui lòng nhập mật khẩu mới và xác nhận.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Mật khẩu không khớp.');
      return;
    }

    setLoading(true);
    const success = await AuthService.resetPasswordOTP(email, otp, password);
    setLoading(false);

    if (success) {
      alert('Đổi mật khẩu thành công!');
      navigate('/login');
    } else {
      alert('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h1 className="forgot-password-title">Đặt Lại Mật Khẩu</h1>

        {step === 'email' && (
          <form onSubmit={handleSendEmail} className="forgot-password-form">
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
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="forgot-password-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Nhập mã OTP 6 chữ số"
                value={otp}
                onChange={handleOTPChange}
                className="form-input"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className="btn-primary">
              Xác Nhận OTP
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            <div className="form-group">
              <input
                type="password"
                placeholder="Mật khẩu mới"
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
              {loading ? 'Đang đổi...' : 'Đổi Mật Khẩu'}
            </button>
          </form>
        )}

        <Link to="/login" className="link">
          Về Trang Đăng Nhập
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;

