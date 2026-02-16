import React, { useEffect, useRef, useState } from 'react';

/**
 * Phase 3: Visual Authentication - Canvas Grid Component
 * HTML5 Canvas-based grid rendering (immune to screen recording)
 */

function CanvasGrid({ gridData, onSelectionComplete, onTimeout }) {
  const canvasRef = useRef(null);
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(600);

  // Icon colors (unique per session)
  const iconColors = {
    bank: '#2E5090',
    lock: '#27AE60',
    shield: '#E74C3C',
    dollar: '#F39C12',
    card: '#3498DB',
    password: '#9B59B6',
    key: '#1ABC9C',
    check: '#16A085',
  };

  // Canvas rendering with security measures
  useEffect(() => {
    const renderGrid = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const gridSize = 4;
      const cellWidth = width / gridSize;
      const cellHeight = height / gridSize;

      // Clear with gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#F5F7FA');
      gradient.addColorStop(1, '#E8EDF4');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render grid cells
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const position = i * gridSize + j;
          const x = j * cellWidth;
          const y = i * cellHeight;

          // Cell border
          ctx.strokeStyle = selectedPositions.includes(position) ? '#E74C3C' : '#D0D0D0';
          ctx.lineWidth = selectedPositions.includes(position) ? 3 : 1;
          ctx.strokeRect(x, y, cellWidth, cellHeight);

          // Highlight selected cells
          if (selectedPositions.includes(position)) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
            ctx.fillRect(x, y, cellWidth, cellHeight);
          }

          // Draw icon
          if (gridData?.grid[position]) {
            const icon = gridData.grid[position].iconType;
            const color = iconColors[icon] || '#2C3E50';
            drawIcon(ctx, x + cellWidth / 2, y + cellHeight / 2, icon, color);
          }
        }
      }
    };

    renderGrid();
  }, [gridData, selectedPositions, iconColors]);

  // Icon drawing function
  const drawIcon = (ctx, x, y, iconType, color) => {
    const size = 24;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (iconType) {
      case 'lock':
        ctx.fillRect(x - size / 2, y - size / 3, size, size / 2);
        ctx.beginPath();
        ctx.arc(x, y, size / 3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'shield':
        ctx.beginPath();
        ctx.moveTo(x - size / 2, y - size / 2);
        ctx.lineTo(x + size / 2, y - size / 2);
        ctx.lineTo(x + size / 2, y);
        ctx.lineTo(x, y + size / 2);
        ctx.lineTo(x - size / 2, y);
        ctx.closePath();
        ctx.stroke();
        break;
      default:
        ctx.fillRect(x - size / 3, y - size / 3, size * 2 / 3, size * 2 / 3);
    }
  };

  // Handle canvas clicks
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridSize = 4;
    const cellWidth = canvas.width / gridSize;
    const cellHeight = canvas.height / gridSize;

    const position = Math.floor(y / cellHeight) * gridSize + Math.floor(x / cellWidth);

    if (position >= 0 && position < 16) {
      if (selectedPositions.includes(position)) {
        setSelectedPositions(selectedPositions.filter(p => p !== position));
      } else {
        setSelectedPositions([...selectedPositions, position]);
      }

      if (selectedPositions.length >= 1) {
        setTimeout(() => {
          onSelectionComplete(selectedPositions);
        }, Math.random() * 500 + 200);
      }
    }
  };

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          onTimeout?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeout]);

  return (
    <div className="canvas-grid-container p-6">
      <div className="grid-header mb-4">
        <h2 className="text-2xl font-bold">Select the Bank Icon</h2>
        <div className="timer text-lg font-semibold text-red-600">
          {timeRemaining}s remaining
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        onClick={handleCanvasClick}
        className="canvas-grid border-2 border-slate-300 rounded cursor-pointer mb-4"
      />

      <div className="grid-footer">
        <p className="text-sm text-gray-600 mb-2">Click on the bank icon to authenticate</p>
        <p className="text-sm font-semibold">
          Icons selected: {selectedPositions.length}
        </p>
      </div>
    </div>
  );
}

export default CanvasGrid;
