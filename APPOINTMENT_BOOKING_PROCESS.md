# Logic Kiểm Tra Lịch Hẹn

Tài liệu này mô tả logic kiểm tra lịch hẹn của hệ thống Easy Medify. Nội dung tậ trung vào các điều kiện xác định một khung giờ có thể đặt được hay không, cách hệ thống sinh danh sách lịch trống, và lý do hệ thống báo lỗi khi người dùng chọn một lịch không hợp lệ.

## 1. Phạm vi của logic kiểm tra lịch

Logic kiểm tra lịch không phải là toàn bộ quy trình đặt lịch, mà là các bước kiểm tra kỹ thuật và nghiệp vụ sau:

- Kiểm tra dịch vụ, bác sĩ và ngày giờ người dùng chọn.
- Kiểm tra lịch bác sĩ còn trống hay đã kín.
- Kiểm tra bác sĩ có đang nghỉ phép hay không.
- Kiểm tra người dùng chọn ngày trong quá khứ hay không.
- Kiểm tra kiểu lịch là online hay offline để áp dụng cách tính khác nhau.
- Kiểm tra phương thức thanh toán có hợp lệ với lịch hẹn hay không.

## 2. Dữ liệu đầu vào mà hệ thống dùng để kiểm tra

Khi người dùng đặt lịch, hệ thống cần tối thiểu các trường sau:

- `service_id`
- `doctor_id`
- `appointment_date`
- `appointment_start_time`
- `appointment_type`
- `payment_method`

Ngoài ra, với một số trường hợp còn có:

- Thông tin người đặt hoặc người đi khám.
- Ghi chú lý do khám.
- Token guest nếu người dùng không đăng nhập.

## 3. Logic kiểm tra phía giao diện

### 3.1. Chọn dịch vụ

Khi người dùng chọn dịch vụ, hệ thống sẽ:

- Tải danh sách bác sĩ phù hợp với dịch vụ.
- Xóa các lựa chọn cũ về bác sĩ, ngày và giờ.
- Buộc người dùng chọn lại lịch tương ứng với dịch vụ mới.

Mục đích là tránh tình trạng người dùng giữ lại bác sĩ hoặc giờ cũ không còn phù hợp với dịch vụ vừa đổi.

### 3.2. Chọn chuyên khoa

Nếu dịch vụ có nhiều bác sĩ, hệ thống cho lọc theo chuyên khoa.

Khi thay đổi chuyên khoa:

- Danh sách bác sĩ được lọc lại.
- Lịch hẹn đã chọn trước đó bị xóa.

### 3.3. Chọn bác sĩ

Chỉ khi đã chọn dịch vụ thì bác sĩ mới được tải.

Khi chọn bác sĩ, hệ thống tiếp tục chuyển sang bước kiểm tra lịch trống của bác sĩ đó theo ngày đang chọn.

### 3.4. Chọn ngày khám

Hệ thống chặn các điều kiện sau:

- Không cho chọn ngày trong quá khứ.
- Không cho giữ lại giờ cũ nếu đổi sang ngày mới.
- Chỉ tải lịch trống cho ngày đang được chọn.

### 3.5. Chọn giờ khám

Người dùng chỉ được chọn trong danh sách giờ hoặc ca mà server trả về là còn trống.

Nếu không có giờ trống, giao diện sẽ báo rằng ngày đó không còn lịch phù hợp.

## 4. Logic sinh danh sách lịch trống ở server

Trung tâm của logic kiểm tra lịch nằm ở hàm `getAvailableSlotsLogic` trong controller lịch hẹn.

### 4.1. Kiểm tra dịch vụ

Đầu tiên, server tìm dịch vụ theo `service_id`.

Nếu không tìm thấy dịch vụ thì dừng lại và báo lỗi.

### 4.2. Kiểm tra bác sĩ

Sau đó server tìm bác sĩ theo `doctor_id`.

Nếu không tìm thấy bác sĩ thì cũng dừng lại và báo lỗi.

### 4.3. Kiểm tra lịch nghỉ phép

Hệ thống đọc danh sách nghỉ phép của bác sĩ.

Nếu bác sĩ nghỉ cả ngày, toàn bộ slot trong ngày đó sẽ bị loại bỏ.

Nếu bác sĩ chỉ nghỉ theo khung giờ, hệ thống sẽ loại bỏ những slot bị chồng lấn với thời gian nghỉ.

### 4.4. Kiểm tra khung làm việc

Server lấy các ca làm việc của bác sĩ theo ngày.

Có 2 trường hợp:

- Có lịch cố định theo ngày.
- Không có lịch cố định thì dùng cấu hình ca mặc định từ hệ thống.

Từ đó hệ thống sinh ra danh sách khung giờ hợp lệ.

### 4.5. Lấy lịch hẹn đã tồn tại

Server lấy tất cả lịch hẹn của bác sĩ trong ngày đó, loại trừ các lịch đã hủy hoặc đã qua.

Mục đích là để tránh đè lên các lịch đã được chốt.

## 5. Logic khác nhau giữa online và offline

### 5.1. Lịch online

Với lịch `online`, hệ thống kiểm tra theo từng slot 30 phút.

Quy tắc chính:

- Không cho slot vượt quá giờ kết thúc ca.
- Nếu là ngày hiện tại thì không cho chọn sát giờ, thường chặn trước 15 phút.
- Không cho đụng với lịch online đã tồn tại.
- Nếu chồng lên thời gian nghỉ phép thì loại bỏ.

Kết quả là danh sách slot online được tính rất chặt theo từng mốc thời gian cụ thể.

### 5.2. Lịch offline

Với lịch `offline`, hệ thống không khóa cứng theo từng slot 30 phút mà tính theo sức chứa của ca.

Logic hoạt động như sau:

- Tính tổng số phút làm việc thực tế của ca.
- Trừ đi thời gian nghỉ phép nếu có.
- Trừ đi thời gian bác sĩ đang tiếp các lịch online đã chốt.
- Chia cho thời lượng trung bình của dịch vụ để ra số lượng bệnh nhân offline tối đa.
- Sinh ra các mốc giờ đại diện để người dùng chọn.

Điểm quan trọng ở đây là offline ưu tiên theo sức chứa, không phải theo từng slot cứng như online.

## 6. Logic kiểm tra khi tạo lịch

Khi người dùng bấm xác nhận, server không chỉ tin dữ liệu từ giao diện mà kiểm tra lại toàn bộ.

### 6.1. Kiểm tra trường bắt buộc

Server bắt buộc phải có:

- Dịch vụ.
- Bác sĩ.
- Ngày khám.
- Giờ khám.

Nếu thiếu một trong các trường này, server trả lỗi ngay.

### 6.2. Kiểm tra khung giờ đã chọn có còn hợp lệ không

Sau khi lấy danh sách lịch trống, server đối chiếu lại khung giờ người dùng chọn.

Nếu khung giờ đó không còn trong danh sách available, hệ thống trả lỗi kiểu:

- Khung giờ này đã hết chỗ.
- Bác sĩ bận.
- Vui lòng chọn ca khác.

### 6.3. Tính giờ kết thúc lịch

Khi lịch hợp lệ, server tính giờ kết thúc dựa trên thời lượng của dịch vụ.

Việc này giúp hệ thống biết lịch kéo dài đến đâu để tránh chồng chéo ở các lần kiểm tra sau.

### 6.4. Tính thời hạn thanh toán

Nếu phương thức thanh toán là online, hệ thống tạo mốc `payment_hold_until` trước giờ khám 30 phút.

Nếu là thanh toán tại quầy thì thường không cần mốc giữ chỗ thanh toán kiểu online.

## 7. Kiểm tra ngày giờ trên giao diện chi tiết lịch hẹn

Ở trang chi tiết lịch hẹn, hệ thống còn kiểm tra thêm:

- Lịch còn bao lâu nữa sẽ diễn ra.
- Lịch có còn đủ thời gian để hủy hay đổi hay không.
- Lịch có cần thanh toán hay không.
- Nếu là online thì có cần hiện nút Thanh toán ngay hay không.
- Nếu là tiền mặt thì hiện thông báo đến sớm 30 phút để đóng tiền và check-in.

## 8. Lý do một lịch bị từ chối

Một lịch hẹn sẽ bị từ chối nếu rơi vào một trong các trường hợp sau:

- Bác sĩ không tồn tại.
- Dịch vụ không tồn tại.
- Bác sĩ đang nghỉ phép.
- Khung giờ đã hết chỗ.
- Người dùng chọn ngày trong quá khứ.
- Khung giờ vượt ngoài ca làm việc.
- Khung giờ bị trùng với lịch online khác.
- Dữ liệu gửi lên thiếu trường bắt buộc.

## 9. Dấu hiệu trên giao diện khi kiểm tra thất bại

Khi logic check lịch không pass, giao diện thường hiển thị một trong các thông báo sau:

- Không thể chọn ngày trong quá khứ.
- Không có lịch trống trong ngày này.
- Khung giờ này đã hết chỗ hoặc bác sĩ bận.
- Vui lòng điền đầy đủ các trường bắt buộc.
- Lỗi tải lịch.

Những thông báo này phản ánh trực tiếp kết quả kiểm tra từ giao diện và server.

## 10. Tóm tắt ngắn của logic check lịch

Logic kiểm tra lịch của hệ thống có thể tóm lại như sau:

1. Chọn dịch vụ và bác sĩ phù hợp.
2. Chọn ngày không nằm trong quá khứ.
3. Tải lịch trống từ server.
4. Kiểm tra nghỉ phép, ca làm việc và lịch đã tồn tại.
5. Sinh danh sách slot hợp lệ theo loại online hoặc offline.
6. Chỉ cho đặt nếu khung giờ còn available.
7. Tạo lịch và tính hạn thanh toán nếu cần.

## 11. Ý nghĩa kỹ thuật của logic này

Logic check lịch là lớp bảo vệ quan trọng nhất của module lịch hẹn.

Nó giúp hệ thống:

- Tránh đặt trùng lịch.
- Tránh cho người dùng đặt vào giờ bác sĩ không làm việc.
- Tránh vượt sức chứa ca khám.
- Giữ cho dữ liệu thanh toán đồng bộ với thời gian khám.
- Tạo trải nghiệm đặt lịch rõ ràng và ít lỗi hơn.