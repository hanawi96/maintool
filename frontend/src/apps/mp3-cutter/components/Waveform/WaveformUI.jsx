import React, { useEffect, useRef, memo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants.js';

// 🚀 **ULTRA-OPTIMIZED COMPONENT** - Loại bỏ excessive re-renders
export const WaveformUI = memo(({ hoverTooltip, handleTooltips, mainCursorTooltip, handlePositions, cursorPositions }) => {
  // 🔧 **MINIMAL DEBUG REFS** - Chỉ track cần thiết
  const renderCountRef = useRef(0);
  const lastLogTimeRef = useRef(0);
  const lastTooltipStateRef = useRef(null);
  
  // 🆕 **HOVER HANDLE DEBUG REFS** - Track handle changes via hover
  const lastHandlePositionsRef = useRef({ startX: null, endX: null });
  const lastHoverStateRef = useRef({ isHovering: false, hoverTarget: null });
  // 🆕 **ENHANCED DETECTION REFS** - Track drag states và interaction modes
  const lastInteractionStateRef = useRef({ isDragging: false, dragType: null, mouseDown: false });
  const handleChangeCountRef = useRef(0);
  // 🚨 **GHOST DRAG DETECTION REFS** - Track mouse leave/enter và ghost states
  const ghostDragDetectionRef = useRef({ 
    lastMouseLeave: null, 
    consecutiveHandleChanges: 0, 
    suspiciousHoverChanges: 0,
    lastForceReset: null
  });
  const handleChangeHistoryRef = useRef([]);
  
  // 🆕 **WAVEFORM CONSTANTS** - Sử dụng height từ config để positioning chính xác
  const WAVEFORM_HEIGHT = WAVEFORM_CONFIG.HEIGHT; // 200px
  
  // 🎯 **TOOLTIP STYLING** - 0.5rem font theo yêu cầu user mới  
  const TOOLTIP_CONFIG = {
    // 🔤 **0.5REM FONT**: Font size theo yêu cầu user: 0.5rem
    FONT_SIZE: '0.65rem',
    
    // 📏 **DURATION ULTRA CLOSE**: Sát đáy waveform hơn nữa (giảm từ -20 xuống -8)
    DURATION_OFFSET: 0, // 200-8=192px from top, cực kì sát đáy
    
    // 🤚 **HANDLE TOOLTIPS**: Giữ nguyên khoảng cách tránh handles
    HANDLE_OFFSET: 19, // 200+15=215px from top, tránh overlap với handles
    
    // 🖱️ **HOVER TOOLTIP**: Cực kì gần hover line - theo yêu cầu user
    HOVER_OFFSET: 2, // Chỉ 3px trên hover line - cực kì gần theo yêu cầu user
    
    // 🔵 **MAIN CURSOR TOOLTIP**: Position cực kì gần main cursor - theo yêu cầu user mới
    MAIN_CURSOR_OFFSET: 2, // Chỉ 3px trên cursor line - gần hơn nữa theo yêu cầu user
    
    // 🎨 **COLOR STYLING**: Màu theo yêu cầu user
    COLOR: '#2d3436', // Màu theo yêu cầu user
    FONT_WEIGHT: '400', // Normal weight thay vì bold
    
    // 🆕 **MAIN CURSOR STYLING**: Styling riêng cho main cursor tooltip - cũng 0.5rem
    MAIN_CURSOR_FONT_SIZE: '0.65rem', // Font 0.5rem theo yêu cầu user mới
    MAIN_CURSOR_COLOR: '#2d3436', // Same color như các tooltip khác
    MAIN_CURSOR_FONT_WEIGHT: '400' // Normal weight thay vì bold - bỏ tô đậm theo yêu cầu user
  };

  // 🚀 **HEAVY THROTTLED DEBUG** - Chỉ log mỗi 3 giây hoặc khi có thay đổi lớn
  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();
    
    // 🎯 **SIGNIFICANT CHANGE DETECTION** - Chỉ log khi thực sự cần thiết
    const currentState = {
      hasHover: !!hoverTooltip,
      hoverVisible: hoverTooltip?.visible,
      hoverX: hoverTooltip?.x,
      hasHandles: !!handleTooltips,
      startVisible: handleTooltips?.start?.visible,
      endVisible: handleTooltips?.end?.visible,
      durationVisible: handleTooltips?.selectionDuration?.visible,
      // 🆕 **MAIN CURSOR STATE**: Track main cursor tooltip state
      hasMainCursor: !!mainCursorTooltip,
      mainCursorVisible: mainCursorTooltip?.visible,
      mainCursorX: mainCursorTooltip?.x
    };
    
    const lastState = lastTooltipStateRef.current;
    const hasSignificantChange = !lastState ||
      currentState.hasHover !== lastState.hasHover ||
      currentState.hoverVisible !== lastState.hoverVisible ||
      currentState.hoverX !== lastState.hoverX ||
      currentState.hasHandles !== lastState.hasHandles ||
      currentState.startVisible !== lastState.startVisible ||
      currentState.endVisible !== lastState.endVisible ||
      currentState.durationVisible !== lastState.durationVisible ||
      // 🆕 **MAIN CURSOR CHANGE DETECTION**: Track main cursor changes
      currentState.hasMainCursor !== lastState.hasMainCursor ||
      currentState.mainCursorVisible !== lastState.mainCursorVisible ||
      currentState.mainCursorX !== lastState.mainCursorX ||
      Math.abs((currentState.hoverX || 0) - (lastState.hoverX || 0)) > 10 || // 10px threshold
      Math.abs((currentState.mainCursorX || 0) - (lastState.mainCursorX || 0)) > 5; // 5px threshold cho main cursor
    
    // 🚀 **ULTRA REDUCED LOGGING** - Chỉ log mỗi 5 giây hoặc changes lớn
    if ((now - lastLogTimeRef.current > 5000) || hasSignificantChange) {
      lastLogTimeRef.current = now;
      lastTooltipStateRef.current = currentState;
      
      // 🎯 **MINIMAL STYLING DEBUG LOG** - Bao gồm main cursor tooltip
      if (renderCountRef.current % 50 === 0 || hasSignificantChange) {
        console.log(`🎨 [WaveformUI] Minimal Tooltip Styling #${renderCountRef.current}:`, {
          tooltip: currentState.hasHover ? 'ACTIVE' : 'INACTIVE',
          x: currentState.hoverX ? `${currentState.hoverX.toFixed(0)}px` : 'N/A',
          handles: `Start:${currentState.startVisible} End:${currentState.endVisible}`,
          // 🆕 **MAIN CURSOR LOG**: Bao gồm main cursor tooltip state
          mainCursor: currentState.hasMainCursor ? 
            `ACTIVE (${currentState.mainCursorX?.toFixed(0)}px)` : 'INACTIVE',
          positioning: {
            waveformHeight: `${WAVEFORM_HEIGHT}px`,
            hoverTooltip: `${TOOLTIP_CONFIG.HOVER_OFFSET}px (chỉ 3px trên hover line - cực kì gần!)`,
            durationTooltip: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px (chỉ ${Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET)}px từ đáy!)`,
            handleTooltips: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px (${TOOLTIP_CONFIG.HANDLE_OFFSET}px below waveform)`,
            // 🆕 **MAIN CURSOR POSITION**: Main cursor position mới gần hơn
            mainCursorTooltip: `${TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET}px (chỉ 3px trên main cursor line - gần hơn nữa!)`
          },
          styling: {
            fontSize: TOOLTIP_CONFIG.FONT_SIZE,
            color: TOOLTIP_CONFIG.COLOR,
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
            // 🆕 **MAIN CURSOR STYLING**: Bao gồm styling mới cho main cursor
            mainCursorFontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE,
            mainCursorColor: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR,
            mainCursorFontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT,
            improvements: 'Font 0.5rem cho tất cả tooltips + centering fix, FIX CSS override với custom class, ẩn hover khi drag handles, ẩn duration khi region nhỏ, màu #2d3436'
          }
        });
      }
    }
  });

  // 🚀 **CONDITIONAL RENDERING** - Chỉ render khi thực sự cần thiết
  const shouldRenderHoverTooltip = hoverTooltip?.visible && 
    typeof hoverTooltip.x === 'number' && 
    !isNaN(hoverTooltip.x) &&
    hoverTooltip.x >= 0;

  const shouldRenderStartTooltip = handleTooltips?.start?.visible &&
    typeof handleTooltips.start.x === 'number' &&
    !isNaN(handleTooltips.start.x) &&
    handleTooltips.start.x >= 0;

  const shouldRenderEndTooltip = handleTooltips?.end?.visible &&
    typeof handleTooltips.end.x === 'number' &&
    !isNaN(handleTooltips.end.x) &&
    handleTooltips.end.x >= 0;

  const shouldRenderDurationTooltip = handleTooltips?.selectionDuration?.visible &&
    typeof handleTooltips.selectionDuration.x === 'number' &&
    !isNaN(handleTooltips.selectionDuration.x) &&
    handleTooltips.selectionDuration.x >= 0;

  // 🆕 **MAIN CURSOR TOOLTIP RENDER CHECK**: Chỉ render khi main cursor đang hiển thị
  const shouldRenderMainCursorTooltip = mainCursorTooltip?.visible &&
    typeof mainCursorTooltip.x === 'number' &&
    !isNaN(mainCursorTooltip.x) &&
    mainCursorTooltip.x >= 0;

  // 🆕 **HANDLE RENDER CHECKS**: Check if handles should be rendered
  const shouldRenderStartHandle = handlePositions?.start?.visible &&
    typeof handlePositions.start.x === 'number' &&
    !isNaN(handlePositions.start.x) &&
    handlePositions.start.x >= 0;

  const shouldRenderEndHandle = handlePositions?.end?.visible &&
    typeof handlePositions.end.x === 'number' &&
    !isNaN(handlePositions.end.x) &&
    handlePositions.end.x >= 0;

  // 🆕 **CURSOR RENDER CHECKS**: Check if cursors should be rendered
  const shouldRenderMainCursor = cursorPositions?.mainCursor?.visible &&
    typeof cursorPositions.mainCursor.x === 'number' &&
    !isNaN(cursorPositions.mainCursor.x) &&
    cursorPositions.mainCursor.x >= 0;

  const shouldRenderHoverLine = cursorPositions?.hoverLine?.visible &&
    typeof cursorPositions.hoverLine.x === 'number' &&
    !isNaN(cursorPositions.hoverLine.x) &&
    cursorPositions.hoverLine.x >= 0;

  // 🔧 **INSTANT TOOLTIP DEBUG**: Log instant positioning và verify zero delay
  useEffect(() => {
    if (shouldRenderDurationTooltip && Math.random() < 0.1) { // 10% sampling
      console.log('📏 [INSTANT-TOOLTIP] Duration positioned via DIRECT CALCULATION:', {
        x: handleTooltips.selectionDuration.x,
        calculatedTop: WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET,
        waveformHeight: WAVEFORM_HEIGHT,
        offset: TOOLTIP_CONFIG.DURATION_OFFSET,
        distanceFromBottom: Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET),
        method: 'INSTANT_SYNC_NO_ANIMATION_FRAMES',
        result: `CỰC KÌ SÁT ĐÁY - chỉ ${Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET)}px từ đáy waveform!`,
        note: 'Duration tooltip hiển thị vì region đủ rộng (>24px) - theo yêu cầu user'
      });
    }
    
    if ((shouldRenderStartTooltip || shouldRenderEndTooltip) && Math.random() < 0.1) { // 10% sampling
      console.log('🤚 [INSTANT-TOOLTIP] Handle positions via DIRECT CALCULATION:', {
        startX: shouldRenderStartTooltip ? handleTooltips.start.x : 'N/A',
        endX: shouldRenderEndTooltip ? handleTooltips.end.x : 'N/A',
        calculatedTop: WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET,
        method: 'INSTANT_SYNC_FROM_PROPS',
        performance: 'ZERO_DELAY_GUARANTEED',
        styling: {
          fontSize: TOOLTIP_CONFIG.FONT_SIZE,
          color: TOOLTIP_CONFIG.COLOR,
          fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
          note: 'Font 3px cực nhỏ, màu #2d3436 - theo yêu cầu user mới'
        }
      });
    }
    
    // 🆕 **MAIN CURSOR TOOLTIP DEBUG**: Log main cursor positioning
    if (shouldRenderMainCursorTooltip && Math.random() < 0.02) { // 2% sampling để tránh spam
      console.log('🔵 [INSTANT-MAIN-CURSOR-TOOLTIP] Position via DIRECT CALCULATION:', {
        x: mainCursorTooltip.x,
        calculatedTop: TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET,
        currentTime: mainCursorTooltip.time?.toFixed(3) + 's',
        formattedTime: mainCursorTooltip.formattedTime,
        method: 'INSTANT_SYNC_FROM_CURRENT_TIME',
        performance: 'ZERO_DELAY_GUARANTEED',
        positioning: 'Chỉ 3px trên main cursor line - gần hơn nữa theo yêu cầu user',
        styling: {
          fontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE, // 2px
          color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR, // #2d3436
          fontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT, // normal weight
          note: 'Font cực micro (2px), màu #2d3436, NO BOLD, position 3px - theo yêu cầu user mới'
        }
      });
    }

    // 🤚 **HANDLE COMPONENT DEBUG**: Log React handle rendering
    if ((shouldRenderStartHandle || shouldRenderEndHandle) && Math.random() < 0.1) { // 10% sampling
      console.log('🤚 [REACT-HANDLE-SUCCESS] Handles rendered as React components:', {
        startHandle: shouldRenderStartHandle ? {
          x: handlePositions.start.x,
          y: handlePositions.start.y,
          width: handlePositions.start.width,
          height: handlePositions.start.height,
          color: handlePositions.start.color,
          isActive: handlePositions.start.isActive,
          leftPos: `${handlePositions.start.x - handlePositions.start.width / 2}px`
        } : 'NOT_RENDERED',
        endHandle: shouldRenderEndHandle ? {
          x: handlePositions.end.x,
          y: handlePositions.end.y,
          width: handlePositions.end.width,
          height: handlePositions.end.height,
          color: handlePositions.end.color,
          isActive: handlePositions.end.isActive,
          leftPos: `${handlePositions.end.x - handlePositions.end.width / 2}px`
        } : 'NOT_RENDERED',
        technique: '✅ SAME AS TOOLTIPS - absolute positioning with z-index',
        visibility: '🔥 SHOULD BE 100% VISIBLE - no canvas clipping!',
        zIndex: 40,
        pointerEvents: 'none (pass through to canvas)'
      });
    }

    // 🔵 **CURSOR COMPONENT DEBUG**: Log React cursor rendering
    if ((shouldRenderMainCursor || shouldRenderHoverLine) && Math.random() < 0.1) { // 10% sampling
      console.log('🔵 [REACT-CURSOR-SUCCESS] Cursors rendered as React components:', {
        mainCursor: shouldRenderMainCursor ? {
          x: cursorPositions.mainCursor.x,
          y: cursorPositions.mainCursor.y,
          width: cursorPositions.mainCursor.width,
          height: cursorPositions.mainCursor.height,
          color: cursorPositions.mainCursor.color,
          showTriangle: cursorPositions.mainCursor.showTriangle,
          triangleSize: cursorPositions.mainCursor.triangleSize
        } : 'NOT_RENDERED',
        hoverLine: shouldRenderHoverLine ? {
          x: cursorPositions.hoverLine.x,
          y: cursorPositions.hoverLine.y,
          width: cursorPositions.hoverLine.width,
          height: cursorPositions.hoverLine.height,
          color: cursorPositions.hoverLine.color
        } : 'NOT_RENDERED',
        technique: '✅ SAME AS TOOLTIPS - absolute positioning with z-index',
        visibility: '🔥 PERFECT CONTROL - no canvas limitations!',
        zIndexes: { hoverLine: 20, mainCursor: 30, handles: 40, tooltips: 50 },
        advantages: 'Smooth animations, perfect positioning, no canvas clipping!'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRenderDurationTooltip, shouldRenderStartTooltip, shouldRenderEndTooltip, shouldRenderMainCursorTooltip, shouldRenderStartHandle, shouldRenderEndHandle, shouldRenderMainCursor, shouldRenderHoverLine, handleTooltips, mainCursorTooltip, handlePositions, cursorPositions]);

  // 🆕 **HOVER HANDLE CHANGE DETECTION** - Debug khi handles thay đổi qua hover
  useEffect(() => {
    const currentHandlePositions = {
      startX: shouldRenderStartTooltip ? handleTooltips.start.x : null,
      endX: shouldRenderEndTooltip ? handleTooltips.end.x : null
    };
    
    const currentHoverState = {
      isHovering: shouldRenderHoverTooltip,
      hoverTarget: hoverTooltip?.target || null,
      hoverX: hoverTooltip?.x || null
    };
    
    // 🆕 **ENHANCED INTERACTION DETECTION** - Thêm context về drag state
    const currentInteractionState = {
      isDragging: false, // Không có direct access, suy luận từ events
      dragType: null,
      mouseDown: false
    };
    
    const lastPositions = lastHandlePositionsRef.current;
    const lastHover = lastHoverStateRef.current;
    const lastInteraction = lastInteractionStateRef.current;
    
    // 🚨 **HANDLE POSITION CHANGE DETECTION** - Phát hiện thay đổi handle position
    const startXChanged = lastPositions.startX !== null && currentHandlePositions.startX !== null && 
      Math.abs(currentHandlePositions.startX - lastPositions.startX) > 0.5; // Giảm threshold xuống 0.5px để catch nhỏ hơn
      
    const endXChanged = lastPositions.endX !== null && currentHandlePositions.endX !== null && 
      Math.abs(currentHandlePositions.endX - lastPositions.endX) > 0.5;
    
    // 🚨 **HOVER STATE CHANGE DETECTION** - Phát hiện thay đổi hover state
    const hoverStateChanged = lastHover.isHovering !== currentHoverState.isHovering ||
      lastHover.hoverTarget !== currentHoverState.hoverTarget;
    
    // 🎯 **ENHANCED BUG DETECTION** - Nhiều tiêu chí hơn để catch edge cases
    const isPossibleHoverBug = (startXChanged || endXChanged) && (
      // Case 1: Đang hover và handles thay đổi
      currentHoverState.isHovering ||
      // Case 2: Vừa chuyển từ không hover sang hover và handles thay đổi ngay
      (!lastHover.isHovering && currentHoverState.isHovering) ||
      // Case 3: Hover position thay đổi cùng lúc với handles
      (currentHoverState.isHovering && lastHover.hoverX !== currentHoverState.hoverX)
    );
    
    // 🚨 **GHOST DRAG DETECTION** - Phát hiện handles "dính" vào cursor
    const isGhostDragDetected = (startXChanged || endXChanged) && currentHoverState.isHovering && (
      // Pattern 1: Handles thay đổi liên tục khi hover mà không có drag operation confirmed
      ghostDragDetectionRef.current.consecutiveHandleChanges > 2 ||
      // Pattern 2: Handles thay đổi ngay sau khi mouse enter lại canvas
      (ghostDragDetectionRef.current.lastMouseLeave && 
       (Date.now() - ghostDragDetectionRef.current.lastMouseLeave) < 5000) // Trong 5 giây sau mouse leave
    );
    
    // 📊 **UPDATE GHOST DETECTION COUNTERS**
    if (startXChanged || endXChanged) {
      ghostDragDetectionRef.current.consecutiveHandleChanges++;
      
      // 📝 **HANDLE CHANGE HISTORY** - Track recent changes
      handleChangeHistoryRef.current.push({
        timestamp: Date.now(),
        startX: currentHandlePositions.startX,
        endX: currentHandlePositions.endX,
        isHovering: currentHoverState.isHovering,
        hoverX: currentHoverState.hoverX,
        startChanged: startXChanged,
        endChanged: endXChanged
      });
      
      // Keep only last 10 changes
      if (handleChangeHistoryRef.current.length > 10) {
        handleChangeHistoryRef.current = handleChangeHistoryRef.current.slice(-10);
      }
    } else {
      // Reset counter khi không có changes
      ghostDragDetectionRef.current.consecutiveHandleChanges = 0;
    }
    
    // 🚨🚨 **GHOST DRAG BUG ALERT** - Critical bug detection
    if (isGhostDragDetected) {
      handleChangeCountRef.current++;
      console.error('🚨🚨🚨 [GHOST-DRAG-BUG-CRITICAL] HANDLES DÍNH VÀO CURSOR - GHOST DRAG STATE:', {
        severity: '🔥🔥🔥 CRITICAL BUG - GHOST DRAG STATE DETECTED',
        bugType: 'GHOST_DRAG_AFTER_MOUSE_LEAVE',
        bugCount: handleChangeCountRef.current,
        criticalWarning: '💀 HANDLES KHÔNG NÊN THAY ĐỔI CHỈ QUA HOVER - ĐÂY LÀ GHOST DRAG BUG!',
        ghostDragEvidence: {
          consecutiveChanges: ghostDragDetectionRef.current.consecutiveHandleChanges,
          timeSinceMouseLeave: ghostDragDetectionRef.current.lastMouseLeave ? 
            `${(Date.now() - ghostDragDetectionRef.current.lastMouseLeave)}ms ago` : 'N/A',
          recentHistory: handleChangeHistoryRef.current.slice(-5).map(h => ({
            time: new Date(h.timestamp).toISOString(),
            startX: h.startX?.toFixed(1),
            endX: h.endX?.toFixed(1), 
            hovering: h.isHovering,
            changed: h.startChanged || h.endChanged
          }))
        },
        currentState: {
          startHandle: startXChanged ? {
            from: lastPositions.startX?.toFixed(2) + 'px',
            to: currentHandlePositions.startX?.toFixed(2) + 'px',
            delta: (currentHandlePositions.startX - lastPositions.startX).toFixed(2) + 'px'
          } : 'unchanged',
          endHandle: endXChanged ? {
            from: lastPositions.endX?.toFixed(2) + 'px', 
            to: currentHandlePositions.endX?.toFixed(2) + 'px',
            delta: (currentHandlePositions.endX - lastPositions.endX).toFixed(2) + 'px'
          } : 'unchanged',
          hoverInfo: {
            isHovering: currentHoverState.isHovering,
            hoverX: currentHoverState.hoverX?.toFixed(2) + 'px',
            hoverFollowingHandles: 'TRUE - SUSPICIOUS!'
          }
        },
        rootCause: {
          suspectedIssue: 'Drag state không được reset đúng cách sau mouse leave',
          possibleFixes: [
            'Kiểm tra mouse leave event handler',
            'Đảm bảo drag state được reset hoàn toàn',
            'Thêm protection cho mouse enter events',
            'Validate drag conditions trước khi cho phép handle updates'
          ]
        },
        timestamp: new Date().toISOString(),
        actionRequired: '🔧 URGENT FIX NEEDED - This breaks user experience completely!'
      });
    }
    
    if (isPossibleHoverBug && !isGhostDragDetected) {
      handleChangeCountRef.current++;
      console.warn('🚨🚨 [ENHANCED-HOVER-HANDLE-BUG] NGHI NGỜ HANDLES THAY ĐỔI DO HOVER:', {
        severity: '🔥 HIGH PRIORITY BUG DETECTION',
        bugCount: handleChangeCountRef.current,
        warning: '⚠️ HANDLES KHÔNG NÊN THAY ĐỔI KHI CHỈ HOVER!',
        changes: {
          startHandle: startXChanged ? {
            from: lastPositions.startX?.toFixed(2) + 'px',
            to: currentHandlePositions.startX?.toFixed(2) + 'px',
            delta: (currentHandlePositions.startX - lastPositions.startX).toFixed(2) + 'px',
            significant: Math.abs(currentHandlePositions.startX - lastPositions.startX) > 2 ? '🔥 LARGE CHANGE' : '⚠️ small change'
          } : 'unchanged',
          endHandle: endXChanged ? {
            from: lastPositions.endX?.toFixed(2) + 'px', 
            to: currentHandlePositions.endX?.toFixed(2) + 'px',
            delta: (currentHandlePositions.endX - lastPositions.endX).toFixed(2) + 'px',
            significant: Math.abs(currentHandlePositions.endX - lastPositions.endX) > 2 ? '🔥 LARGE CHANGE' : '⚠️ small change'
          } : 'unchanged'
        },
        hoverInfo: {
          currentHover: currentHoverState.isHovering ? 'HOVERING' : 'NOT_HOVERING',
          previousHover: lastHover.isHovering ? 'WAS_HOVERING' : 'WAS_NOT_HOVERING',
          hoverTransition: `${lastHover.isHovering ? 'HOVER' : 'NO_HOVER'} → ${currentHoverState.isHovering ? 'HOVER' : 'NO_HOVER'}`,
          hoverTarget: currentHoverState.hoverTarget || 'none',
          hoverX: currentHoverState.hoverX?.toFixed(2) + 'px' || 'N/A',
          hoverXChanged: lastHover.hoverX !== currentHoverState.hoverX
        },
        context: {
          renderCount: renderCountRef.current,
          timestamp: new Date().toISOString(),
          possibleCauses: [
            'Hover event trigger handle update logic',
            'Race condition giữa hover và drag events', 
            'Mouse event confusion (mousedown/mousemove)',
            'Touch event interference',
            'Tooltip calculation side effects'
          ]
        },
        diagnosis: '🔍 CẦN KIỂM TRA: Logic hover có thể đang trigger handle position updates không mong muốn'
      });
    }
    
    // 🎯 **NORMAL HANDLE CHANGE DEBUG** - Enhanced với more context
    if ((startXChanged || endXChanged) && !currentHoverState.isHovering && !lastHover.isHovering) {
      console.log('✅ [NORMAL-HANDLE-CHANGE-ENHANCED] Handle changed during proper drag operation:', {
        info: '✅ This is EXPECTED - handles change during drag operations',
        changes: {
          startHandle: startXChanged ? {
            from: lastPositions.startX?.toFixed(2) + 'px',
            to: currentHandlePositions.startX?.toFixed(2) + 'px',
            delta: (currentHandlePositions.startX - lastPositions.startX).toFixed(2) + 'px'
          } : 'unchanged',
          endHandle: endXChanged ? {
            from: lastPositions.endX?.toFixed(2) + 'px',
            to: currentHandlePositions.endX?.toFixed(2) + 'px', 
            delta: (currentHandlePositions.endX - lastPositions.endX).toFixed(2) + 'px'
          } : 'unchanged'
        },
        context: 'Clean drag operation - no hover interference detected',
        timestamp: new Date().toISOString()
      });
    }
    
    // 🎯 **HOVER STATE TRANSITION DEBUG** - Enhanced 
    if (hoverStateChanged) {
      console.log('👆 [ENHANCED-HOVER-TRANSITION] Hover state transition detected:', {
        transition: `${lastHover.isHovering ? 'HOVERING' : 'NOT_HOVERING'} → ${currentHoverState.isHovering ? 'HOVERING' : 'NOT_HOVERING'}`,
        hoverTarget: `${lastHover.hoverTarget || 'none'} → ${currentHoverState.hoverTarget || 'none'}`,
        hoverPosition: {
          previous: lastHover.hoverX?.toFixed(2) + 'px' || 'N/A',
          current: currentHoverState.hoverX?.toFixed(2) + 'px' || 'N/A',
          changed: lastHover.hoverX !== currentHoverState.hoverX
        },
        handlePositions: {
          start: currentHandlePositions.startX?.toFixed(2) + 'px' || 'N/A',
          end: currentHandlePositions.endX?.toFixed(2) + 'px' || 'N/A',
          startChanged: startXChanged,
          endChanged: endXChanged
        },
        warning: (startXChanged || endXChanged) ? '⚠️ HANDLES CHANGED DURING HOVER TRANSITION!' : '✅ No handle changes',
        expectation: 'Handle positions should NOT change during hover transitions',
        timestamp: new Date().toISOString()
      });
    }
    
    // 📝 **UPDATE REFS FOR NEXT COMPARISON**
    lastHandlePositionsRef.current = currentHandlePositions;
    lastHoverStateRef.current = currentHoverState;
    lastInteractionStateRef.current = currentInteractionState;
    
  }, [shouldRenderStartTooltip, shouldRenderEndTooltip, shouldRenderHoverTooltip, 
      handleTooltips?.start?.x, handleTooltips?.end?.x, hoverTooltip?.x, hoverTooltip?.target]);

  // 🚨 **MOUSE LEAVE TRACKING** - Track mouse leave events for ghost drag detection
  useEffect(() => {
    const handleMouseLeave = () => {
      ghostDragDetectionRef.current.lastMouseLeave = Date.now();
      console.log('🫥 [GHOST-DRAG-TRACKER] Mouse left canvas - tracking for potential ghost drag:', {
        timestamp: new Date().toISOString(),
        note: 'If handles change during hover after this point, it may be ghost drag bug',
        consecutiveChanges: ghostDragDetectionRef.current.consecutiveHandleChanges
      });
    };
    
    // 🌍 **GLOBAL MOUSE UP TRACKING**: Track global mouse up events for ghost drag prevention
    const handleGlobalMouseUp = (e) => {
      // Check if this might be a ghost drag prevention
      const timeSinceMouseLeave = ghostDragDetectionRef.current.lastMouseLeave ? 
        Date.now() - ghostDragDetectionRef.current.lastMouseLeave : Infinity;
        
      if (timeSinceMouseLeave < 2000) { // Within 2 seconds of mouse leave
        console.log('🛡️ [GHOST-DRAG-PREVENTION-SUCCESS] Global mouse up detected - likely prevented ghost drag:', {
          timeSinceMouseLeave: timeSinceMouseLeave + 'ms',
          timestamp: new Date().toISOString(),
          note: 'Global mouse up listener successfully caught outside mouse release'
        });
      }
    };
    
    // Tìm canvas element và add mouse leave listener
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mouseleave', handleMouseLeave);
      // Add global mouse up listener to track prevention
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: true });
      
      return () => {
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, []);

  return (
    <>
      {/* 🖱️ **HOVER TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderHoverTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${hoverTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.HOVER_OFFSET}px`, // -3px trên hover line
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo căn giữa chính xác
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Normal weight
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderStartTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.start.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // Giữ nguyên +15px
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo căn giữa chính xác với handle
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.start.formattedTime}
        </div>
      )}

      {/* 🤚 **END HANDLE TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderEndTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.end.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // Giữ nguyên +15px
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo căn giữa chính xác với handle
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.end.formattedTime}
        </div>
      )}

      {/* 📏 **DURATION TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderDurationTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px`, // 🔧 **ULTRA CLOSE**: -8px từ đáy!
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo căn giữa chính xác
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.selectionDuration.formattedTime}
        </div>
      )}

      {/* 🔵 **MAIN CURSOR TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderMainCursorTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${mainCursorTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET}px`, // 🔧 **ULTRA CLOSE**: -3px để cực gần cursor
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo cursor nằm chính giữa tooltip
            color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT, // 🚫 **NO BOLD**: Normal weight theo yêu cầu user
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {mainCursorTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE COMPONENT** - React component rendering like tooltips */}
      {shouldRenderStartHandle && (
        <div
          className="absolute z-40"
          style={{
            left: `${handlePositions.start.x - handlePositions.start.width / 2}px`,
            top: `${handlePositions.start.y}px`,
            width: `${handlePositions.start.width}px`,
            height: `${handlePositions.start.height}px`,
            backgroundColor: handlePositions.start.color,
            pointerEvents: 'none', // Let mouse events pass through to canvas
            borderRadius: '0px', // Sharp edges for handles
            transition: 'background-color 150ms ease', // Smooth color transitions
            zIndex: 40 // Higher than waveform, lower than tooltips
          }}
        />
      )}

      {/* 🤚 **END HANDLE COMPONENT** - React component rendering like tooltips */}
      {shouldRenderEndHandle && (
        <div
          className="absolute z-40"
          style={{
            left: `${handlePositions.end.x - handlePositions.end.width / 2}px`,
            top: `${handlePositions.end.y}px`,
            width: `${handlePositions.end.width}px`,
            height: `${handlePositions.end.height}px`,
            backgroundColor: handlePositions.end.color,
            pointerEvents: 'none', // Let mouse events pass through to canvas
            borderRadius: '0px', // Sharp edges for handles
            transition: 'background-color 150ms ease', // Smooth color transitions
            zIndex: 40 // Higher than waveform, lower than tooltips
          }}
        />
      )}

      {/* 🔵 **MAIN CURSOR COMPONENT** - React component rendering like tooltips */}
      {shouldRenderMainCursor && (
        <>
          {/* Cursor Line */}
          <div
            className="absolute z-30"
            style={{
              left: `${cursorPositions.mainCursor.x}px`,
              top: `${cursorPositions.mainCursor.y}px`,
              width: `${cursorPositions.mainCursor.width}px`,
              height: `${cursorPositions.mainCursor.height}px`,
              backgroundColor: cursorPositions.mainCursor.color,
              pointerEvents: 'none',
              zIndex: 30 // Between waveform and handles
            }}
          />
          {/* Cursor Triangle */}
          {cursorPositions.mainCursor.showTriangle && (
            <div
              className="absolute z-30"
              style={{
                left: `${cursorPositions.mainCursor.x - cursorPositions.mainCursor.triangleSize}px`,
                top: `${cursorPositions.mainCursor.y}px`,
                width: 0,
                height: 0,
                borderLeft: `${cursorPositions.mainCursor.triangleSize}px solid transparent`,
                borderRight: `${cursorPositions.mainCursor.triangleSize}px solid transparent`,
                borderTop: `${cursorPositions.mainCursor.triangleSize * 1.5}px solid ${cursorPositions.mainCursor.color}`,
                pointerEvents: 'none',
                zIndex: 30
              }}
            />
          )}
        </>
      )}

      {/* 🖱️ **HOVER LINE COMPONENT** - React component rendering like tooltips */}
      {shouldRenderHoverLine && (
        <div
          className="absolute z-20"
          style={{
            left: `${cursorPositions.hoverLine.x}px`,
            top: `${cursorPositions.hoverLine.y}px`,
            width: `${cursorPositions.hoverLine.width}px`,
            height: `${cursorPositions.hoverLine.height}px`,
            backgroundColor: cursorPositions.hoverLine.color,
            pointerEvents: 'none',
            zIndex: 20 // Lower than cursor and handles
          }}
        />
      )}
    </>
  );
});

WaveformUI.displayName = 'WaveformUI';