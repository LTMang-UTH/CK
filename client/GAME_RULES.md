# Fun Draw - Quy Tắc Chơi và Cách Tính Điểm

## 📖 Tổng Quan

Fun Draw là một game vẽ và đoán từ (Pictionary-style) cho nhiều người chơi. Người chơi lần lượt vẽ một từ và những người khác sẽ đoán từ đó.

## 🎮 Quy Tắc Chơi

### 1. Thiết Lập Game

- **Số người chơi tối đa**: 8 người (có thể tùy chỉnh)
- **Số rounds**: 3 rounds (có thể tùy chỉnh)
- **Thời gian vẽ mỗi turn**: 120 giây (có thể tùy chỉnh)
- **Số từ để chọn**: 3 từ (có thể tùy chỉnh)
- **Số gợi ý (hints)**: 2 gợi ý (có thể tùy chỉnh)

### 2. Luồng Chơi

#### **Bước 1: Tạo/Tham Gia Phòng**
- Host tạo phòng và thiết lập cài đặt
- Người chơi khác join phòng bằng Room ID
- Khi đủ người, host bấm "Start Game"

#### **Bước 2: Chọn Từ (15 giây)**
- Mỗi lượt, một người chơi được chọn làm người vẽ (drawer)
- Người vẽ nhận **3 từ** để chọn
- Có **15 giây** để chọn từ
- Nếu không chọn trong 15 giây, hệ thống sẽ **tự động chọn ngẫu nhiên** một từ
- Người chơi khác thấy thông báo: "[Tên người vẽ] is choosing a word..."

#### **Bước 3: Vẽ và Đoán (120 giây)**
- Người vẽ bắt đầu vẽ từ đã chọn lên canvas
- Người đoán (guesser) nhìn vào bức vẽ và đoán từ
- Người đoán gửi đáp án qua chat
- **Người vẽ KHÔNG được chat** khi đang vẽ (chỉ tập trung vào vẽ)
- Thời gian đếm ngược từ 120 giây

#### **Bước 4: Gợi Ý (Hint)**
- Khi còn **75% thời gian** (tức là sau 30 giây nếu thời gian là 120 giây)
- Hệ thống tự động **reveal 1 ký tự** của từ
- Ví dụ: "door" → "d_ _ _" → "do_ _" (sau khi reveal)

#### **Bước 5: Kết Thúc Turn**
Turn kết thúc khi:
- **Hết thời gian** (120 giây)
- **Tất cả người chơi đã đoán đúng**

Sau khi kết thúc turn:
- Hiển thị từ đúng trong 5 giây
- Chuyển sang người vẽ tiếp theo

#### **Bước 6: Kết Thúc Game**
- Game kết thúc khi hoàn thành tất cả **rounds**
- Hiển thị bảng xếp hạng (podium) với top 3 người chơi
- Hiển thị điểm số và thứ hạng của bạn

### 3. Vai Trò Người Chơi

#### **Người Vẽ (Drawer)**
- ✅ Vẽ lên canvas bằng chuột
- ✅ Chọn màu và công cụ (pencil, eraser, clear)
- ✅ Thấy từ cần vẽ đầy đủ
- ❌ Không thể chat khi đang vẽ (game state = 'playing')
- ❌ Không thể đoán từ

#### **Người Đoán (Guesser)**
- ✅ Xem bức vẽ trên canvas (real-time)
- ✅ Gửi đáp án qua chat
- ✅ Chat với tất cả người chơi
- ✅ Thấy gợi ý (hint) của từ (dạng: "d_ _ _")
- ✅ Sau khi đoán đúng, thấy từ đầy đủ và có thể chat riêng với những người đã đoán đúng
- ❌ Không thể vẽ

## 📊 Cách Tính Điểm

### Công Thức Tính Điểm

#### **Người Đoán Đúng:**
```
Điểm = Số giây còn lại khi đoán đúng
```

**Ví dụ:**
- Thời gian còn lại: 80 giây → Điểm: **80 điểm**
- Thời gian còn lại: 45 giây → Điểm: **45 điểm**
- Thời gian còn lại: 10 giây → Điểm: **10 điểm**

#### **Người Vẽ:**
```
Điểm = Số giây còn lại / 2 (làm tròn xuống)
```

**Ví dụ:**
- Người đoán đúng khi còn 80 giây → Người vẽ nhận: **40 điểm** (80 ÷ 2)
- Người đoán đúng khi còn 45 giây → Người vẽ nhận: **22 điểm** (45 ÷ 2)
- Người đoán đúng khi còn 10 giây → Người vẽ nhận: **5 điểm** (10 ÷ 2)

### Quy Tắc Đặc Biệt

1. **Nhiều người đoán đúng:**
   - Mỗi người đoán đúng nhận điểm riêng (theo thời gian còn lại khi họ đoán)
   - Người vẽ nhận điểm từ **mỗi người đoán đúng**
   - Ví dụ: 2 người đoán đúng lần lượt ở 80s và 60s
     - Người đoán 1: 80 điểm
     - Người đoán 2: 60 điểm
     - Người vẽ: 40 + 30 = **70 điểm**

2. **Giảm thời gian khi có người đoán đúng:**
   - Khi có người đoán đúng, thời gian còn lại giảm xuống còn **75%**
   - Nhưng không giảm xuống dưới **30 giây**
   - Ví dụ:
     - Thời gian còn lại: 100 giây
     - Có người đoán đúng → Thời gian mới: 75 giây (100 × 0.75)
     - Nếu thời gian còn lại là 40 giây → Thời gian mới: 30 giây (không dưới 30)

3. **Điểm tích lũy:**
   - Điểm được cộng dồn qua các rounds
   - Người chơi có điểm cao nhất sau tất cả rounds sẽ thắng

## 🎯 Ví Dụ Tính Điểm

### Scenario 1: Một người đoán đúng sớm

- **Thời gian ban đầu**: 120 giây
- **Người A đoán đúng** ở 100 giây
  - Người A: **100 điểm**
  - Người vẽ: **50 điểm** (100 ÷ 2)
  - Thời gian còn lại: 75 giây (100 × 0.75)
- **Người B đoán đúng** ở 60 giây (sau khi đã giảm)
  - Người B: **60 điểm**
  - Người vẽ: **30 điểm** (60 ÷ 2)
  - Thời gian còn lại: 45 giây (60 × 0.75)
- **Tổng điểm người vẽ**: 50 + 30 = **80 điểm**

### Scenario 2: Tất cả đoán đúng sớm

- **Thời gian ban đầu**: 120 giây
- **3 người đoán đúng** lần lượt ở: 110s, 90s, 70s
  - Người 1: **110 điểm**, Người vẽ: **55 điểm**
  - Người 2: **90 điểm**, Người vẽ: **45 điểm**
  - Người 3: **70 điểm**, Người vẽ: **35 điểm**
- **Tổng điểm người vẽ**: 55 + 45 + 35 = **135 điểm**

### Scenario 3: Không ai đoán đúng

- **Thời gian hết** (0 giây)
- **Tất cả người chơi**: **0 điểm**
- **Người vẽ**: **0 điểm**

## 💡 Mẹo Chơi

### Cho Người Vẽ:
1. **Vẽ đơn giản, rõ ràng** - Không cần quá chi tiết
2. **Vẽ nhanh** - Thời gian có hạn, vẽ những phần quan trọng trước
3. **Sử dụng màu sắc** - Màu sắc giúp phân biệt các phần của bức vẽ
4. **Tập trung vào vẽ** - Không được chat khi đang vẽ, hãy để bức vẽ tự nói lên từ

### Cho Người Đoán:
1. **Quan sát kỹ** - Xem từng nét vẽ để hiểu ý đồ
2. **Đoán sớm** - Đoán càng sớm, điểm càng cao
3. **Sử dụng gợi ý** - Khi có hint (ký tự được reveal), kết hợp với bức vẽ để đoán
4. **Chat với người khác** - Thảo luận với người chơi khác (nhưng không được copy đáp án)

## 🔄 Tính Năng Đặc Biệt

### 1. Khôi Phục Canvas Khi Reload
- Khi reload trang, tất cả những gì đã vẽ sẽ **tự động khôi phục**
- Áp dụng cho cả người vẽ và người đoán
- Canvas được lưu trên server, không bị mất khi reload

### 2. Chat Riêng Cho Người Đã Đoán Đúng
- Sau khi đoán đúng, bạn có thể chat riêng với những người đã đoán đúng
- Chat này không hiển thị cho người chưa đoán đúng

### 3. Tab Isolation
- Mỗi tab trình duyệt hoạt động độc lập
- Có thể mở nhiều tab với các tài khoản khác nhau
- Không ảnh hưởng lẫn nhau

## 📝 Lưu Ý

1. **Từ phải chính xác** - Phải viết đúng chính tả, không phân biệt hoa thường
2. **Không được viết từ** - Người vẽ không được viết chữ, số, hoặc ký hiệu lên canvas
3. **Thời gian có hạn** - Quản lý thời gian tốt để đạt điểm cao
4. **Điểm tích lũy** - Điểm được cộng dồn qua các rounds, chiến lược dài hạn quan trọng

## 🏆 Chiến Thắng

Người chơi có **tổng điểm cao nhất** sau tất cả các rounds sẽ thắng!

---

**Chúc bạn chơi vui vẻ! 🎨🎮**

