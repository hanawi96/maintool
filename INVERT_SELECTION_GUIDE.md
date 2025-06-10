# 🔄 Invert Selection Feature Guide

## ✨ Overview
The **Invert Selection** feature allows you to toggle which regions are considered "active" for export. Instead of moving handles, it simply inverts the visual representation of selected/unselected regions on the waveform.

## 🎯 Use Cases

### 1. **Remove Intro/Outro**
- Select the main content (middle part) with handles
- Click **Invert Selection** to mark intro + outro as active regions
- Export to get content with intro/outro removed

### 2. **Extract Background Music**
- Select the speech/vocal part with handles
- Click **Invert Selection** to mark background sections as active
- Export to get clean background audio

### 3. **Quick Content Trimming**
- Select the unwanted section with handles
- Click **Invert Selection** to mark good content as active
- Export to keep only the good parts

## 🎮 How to Use

### Location
The **Invert Selection** button is located in the **Speed Control** section of the Unified Control Bar, right after the speed slider and reset button.

### Icon
The button uses a **RefreshCw** icon (🔄) indicating the "flip/invert" action.

### Steps
1. **Upload an audio file** and wait for waveform to load
2. **Select a region** by dragging handles on the waveform  
3. **Click the Invert Selection button** (🔄)
4. **Watch the waveform colors change** - purple and gray regions swap
5. **Handles stay in same position** - only visual representation changes
6. **Use Export controls** to process the active (purple) regions

## 🧠 Smart Logic

### Visual Toggle
- **Normal mode**: Purple bars = selected region (between handles), Gray bars = unselected regions
- **Inverted mode**: Gray bars = region between handles, Purple bars = regions outside handles
- **Handles never move** - they maintain the same time boundaries
- **Instant visual feedback** - colors change immediately

### Example:
- **Audio**: 30 seconds total
- **Handles at**: 10s - 20s (selection region)
- **Normal mode**: Purple bars from 10s-20s, Gray bars from 0s-10s and 20s-30s
- **Inverted mode**: Gray bars from 10s-20s, Purple bars from 0s-10s and 20s-30s

## 🎨 Visual Feedback

### Waveform Colors
- **Purple bars** (`#7c3aed`): Active audio regions (will be exported)
- **Gray bars** (`#cbd5e1`): Inactive audio regions (will be excluded)
- **Selection overlay**: Remains at handle positions regardless of invert mode

### Button States
- **Enabled**: Button is clickable with hover effects
- **Disabled**: Button is grayed out when:
  - No audio file loaded
  - Invalid selection (start >= end)
  - Audio duration is 0

## ⚡ Performance Features

### Ultra-Light Toggle
- **Zero performance impact** on playback
- **Instant visual update** - no calculations needed
- **Minimal memory usage** - only changes rendering logic
- **History integration** - automatically saves state before toggle

### Smooth Integration
- **Works with all existing features**: fade effects, speed control, export formats
- **Maintains audio sync** - cursor position unchanged
- **Preserves handle positions** - selection boundaries remain exactly the same

## 🔧 Technical Details

### Requirements
- Valid audio file loaded
- Active selection with start < end
- Audio duration > 0

### History Integration
- **Auto-saves** current state before inversion
- **Undo/Redo** works seamlessly with invert toggle
- **State persistence** - invert mode saved in history

### Export Behavior
- **Export logic adapts** - processes active (purple) regions only
- **No handle changes** - export boundaries determined by visual state
- **Consistent results** - same export output regardless of how regions were selected

## 🛠️ Error Handling

### When Button is Disabled
The button automatically disables when:
```javascript
disabled || duration <= 0 || startTime >= endTime
```

### Console Logging
The feature provides detailed console logs for debugging:
- Toggle state changes  
- Current handle positions
- Visual state confirmations

## 💡 Pro Tips

1. **Use with Fade Effects**: Apply fade in/out - effects follow active regions
2. **Toggle Multiple Times**: Click multiple times to find desired result
3. **History Navigation**: Use Undo if you toggle accidentally
4. **Visual Verification**: Check waveform colors before export

## 🔄 Keyboard Shortcuts
Currently, invert selection is **mouse-only**. Future updates may include keyboard shortcuts.

## 📝 Examples

### Example 1: Remove Commercial Break
1. Audio: 60s commercial break in 300s podcast
2. Set handles: 120s - 180s (commercial boundaries)
3. Invert: Gray region = commercial, Purple regions = content
4. Export: Clean podcast without commercial

### Example 2: Extract Intro Music  
1. Audio: 30s song with 5s speech intro
2. Set handles: 0s - 5s (speech boundaries)
3. Invert: Gray region = speech, Purple region = music
4. Export: Pure instrumental intro

---

**Feature Status**: ✅ **Fully Implemented**
**Logic**: Toggle-based visual inversion without handle movement
**Performance**: Zero impact on audio processing 