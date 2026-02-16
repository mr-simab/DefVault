export class GridRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.gridSize = 4;
  }

  renderGrid(gridData) {
    const cellSize = this.canvas.width / this.gridSize;
    
    for (let i = 0; i < gridData.length; i++) {
      const row = Math.floor(i / this.gridSize);
      const col = i % this.gridSize;
      const x = col * cellSize;
      const y = row * cellSize;
      
      const brightness = gridData[i];
      this.ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      this.ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  clearGrid() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
