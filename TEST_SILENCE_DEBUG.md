# 🔇 Debug Log for Silence Detection

## Vấn đề hiện tại:
- File 1:56 phút (116 giây) với 25.6 giây silence
- Sau khi xóa silence chỉ còn 14 giây → **SAI**
- Kỳ vọng: 116 - 25.6 = **90.4 giây**

## Debug Steps đã thực hiện:

### 1. **Sửa logic detection**
- ✅ Thêm console.log chi tiết cho mỗi bước
- ✅ Fixed buildKeepSegments() - sort silence by start time
- ✅ Fixed concatenateSegments() - sử dụng temp files cho multiple segments

### 2. **Logic mới**
```javascript
// STEP 1: Detect silence regions
const silentSegments = await this.detectSilenceOnly(inputPath, { threshold, minDuration });

// STEP 2: Build keep segments (non-silence parts)  
const keepSegments = this.buildKeepSegments(silentSegments, totalDuration);

// STEP 3: Extract and concatenate keep segments
if (keepSegments.length === 1) {
  // Single segment - direct extract
} else {
  // Multiple segments - extract to temp files then concat
}
```

### 3. **Console logs sẽ hiển thị**
- `🔇 [Detect] Silence start: Xs`
- `🔇 [Detect] Silence end: Xs, duration: Xs`
- `🔇 [Silence] Detected N silence regions: [...]`
- `🔇 [Silence] Total duration: Xs, Keep segments: [...]`
- `🔇 [Segment N] Extracted Xs to Xs`
- `🔇 [Concat] Joining N segments`

### 4. **Kiểm tra tiếp theo**
1. Upload file và chạy silence detection
2. Xem console logs để verify logic
3. Check output file duration

## Expected Flow:
```
Input: 116s total, 25.6s silence in N regions
→ Keep segments: [seg1, seg2, ..., segN] = 90.4s total
→ Output: 90.4s (không phải 14s)
```
