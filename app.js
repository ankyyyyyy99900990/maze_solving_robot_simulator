// Maze-Solving Robot Simulator Frontend Logic

// Grid & State Configuration
let rows = 21;
let cols = 21;
let grid = []; // 0: Path, 1: Wall
let exploredStates = []; // 2D array tracking cell states for rendering (0: default, 1: visited, 2: backtrack/dead-end)
let finalPathCells = new Set(); // Set of "row,col" strings on the successful path

// Start and Goal coordinates
let startPos = { row: 1, col: 1 };
let goalPos = { row: 19, col: 19 };

// Interaction mode
let isPainting = false;
let paintMode = 1; // 1 to draw walls, 0 to erase walls
let activeDragging = null; // 'start', 'goal', or null

// Simulation state
let isSimulating = false;
let simulationEvents = [];
let eventIndex = 0;
let finalPathPoints = [];
let simulationSpeed = 50; // Delay in milliseconds between steps
let timerId = null;

// Robot visual interpolation
let robotVisual = { x: 1, y: 1 };
let robotTarget = { x: 1, y: 1 };
let isRobotMoving = false;

// Canvas & Context
let canvas, ctx;
let cellSize = 24;

// DOM Elements
const startBtn = document.getElementById('start-btn');
const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
const gridSizeSelect = document.getElementById('grid-size');
const statusText = document.getElementById('status-text');
const exploredCountText = document.getElementById('explored-count');
const pathLengthText = document.getElementById('path-length');

// Initialize application when Wasm is ready
var Module = {
    onRuntimeInitialized: function() {
        console.log("WebAssembly runtime initialized successfully.");
        initApp();
    }
};

function initApp() {
    canvas = document.getElementById('maze-canvas');
    ctx = canvas.getContext('2d');
    
    // Set up canvas event listeners for wall painting and pin dragging
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    // UI Event Listeners
    startBtn.addEventListener('click', startSimulation);
    generateBtn.addEventListener('click', generateRandomMaze);
    clearBtn.addEventListener('click', clearBoard);
    
    speedSlider.addEventListener('input', (e) => {
        // Slider value 1-100 maps to delay. Higher slider value = faster (lower delay).
        const val = parseInt(e.target.value);
        speedVal.textContent = val + '%';
        simulationSpeed = Math.max(1, Math.floor(200 - (val / 100) * 195)); // 200ms down to 5ms
    });
    
    gridSizeSelect.addEventListener('change', (e) => {
        const size = parseInt(e.target.value);
        resizeGrid(size);
    });
    
    // Setup initial grid
    resizeGrid(21);
    
    // Start canvas rendering loop
    requestAnimationFrame(renderLoop);
}

function resizeGrid(size) {
    if (isSimulating) stopSimulation();
    
    rows = size;
    cols = size;
    
    // Reset positions
    startPos = { row: 1, col: 1 };
    goalPos = { row: rows - 2, col: cols - 2 };
    
    robotVisual = { x: startPos.col, y: startPos.row };
    robotTarget = { x: startPos.col, y: startPos.row };
    
    // Rebuild grid structure
    grid = [];
    exploredStates = [];
    finalPathCells.clear();
    
    for (let r = 0; r < rows; r++) {
        let gridRow = [];
        let stateRow = [];
        for (let c = 0; c < cols; c++) {
            // Put outer border walls
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                gridRow.push(1);
            } else {
                gridRow.push(0);
            }
            stateRow.push(0);
        }
        grid.push(gridRow);
        exploredStates.push(stateRow);
    }
    
    adjustCanvasSize();
    updateStats('Idle', 0, 0);
}

function adjustCanvasSize() {
    const parent = canvas.parentElement;
    const maxDim = Math.min(parent.clientWidth - 40, parent.clientHeight - 40, 600);
    cellSize = Math.floor(maxDim / Math.max(rows, cols));
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
}

// Draw Loop using requestAnimationFrame for smooth animations (lerping robot)
function renderLoop() {
    drawGrid();
    
    // Smoothly interpolate robot position if moving
    const lerpFactor = 0.25;
    robotVisual.x += (robotTarget.x - robotVisual.x) * lerpFactor;
    robotVisual.y += (robotTarget.y - robotVisual.y) * lerpFactor;
    
    drawRobot();
    
    requestAnimationFrame(renderLoop);
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellSize;
            const y = r * cellSize;
            
            // Draw base cell
            if (grid[r][c] === 1) {
                // Wall
                ctx.fillStyle = '#1e293b'; // Slate gray
                ctx.fillRect(x, y, cellSize, cellSize);
                
                // Add a subtle wall border for definition
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
            } else {
                // Path
                ctx.fillStyle = '#0d1527';
                ctx.fillRect(x, y, cellSize, cellSize);
                
                // Cell grid lines
                ctx.strokeStyle = '#1e2942';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
                
                // Overlay exploration state
                const state = exploredStates[r][c];
                if (state === 1) {
                    // Visited
                    ctx.fillStyle = 'rgba(20, 184, 166, 0.25)'; // Semi-transparent glowing teal
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                    
                    ctx.strokeStyle = 'rgba(20, 184, 166, 0.4)';
                    ctx.strokeRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);
                } else if (state === 2) {
                    // Backtracked / Dead-end
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Semi-transparent coral/red
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                }
            }
        }
    }
    
    // Draw the final path overlay if it exists
    if (finalPathCells.size > 0 && finalPathPoints.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#10b981'; // Neon green
        ctx.lineWidth = Math.max(3, cellSize * 0.15);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Shadow glow
        ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
        ctx.shadowBlur = 10;
        
        const startX = (finalPathPoints[0].col + 0.5) * cellSize;
        const startY = (finalPathPoints[0].row + 0.5) * cellSize;
        ctx.moveTo(startX, startY);
        
        for (let i = 1; i < finalPathPoints.length; i++) {
            const px = (finalPathPoints[i].col + 0.5) * cellSize;
            const py = (finalPathPoints[i].row + 0.5) * cellSize;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    // Draw Start Marker
    drawMarker(startPos.col, startPos.row, '#10b981', 'S');
    // Draw Goal Marker
    drawMarker(goalPos.col, goalPos.row, '#f43f5e', 'G');
}

function drawMarker(c, r, color, label) {
    const x = c * cellSize;
    const y = r * cellSize;
    const padding = cellSize * 0.15;
    
    // Background glow circle
    ctx.beginPath();
    ctx.arc(x + cellSize/2, y + cellSize/2, cellSize/2 - padding, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
    
    // Darker inner border
    ctx.strokeStyle = '#080c14';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(cellSize * 0.45)}px var(--font-sans)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + cellSize/2, y + cellSize/2);
}

function drawRobot() {
    const x = (robotVisual.x + 0.5) * cellSize;
    const y = (robotVisual.y + 0.5) * cellSize;
    const radius = cellSize * 0.35;
    
    // Drone body shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    
    // Draw a futuristic drone icon
    // Central metallic core
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - radius/3, y - radius/3, radius*0.1, x, y, radius);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.4, '#38bdf8'); // Glowing blue metallic body
    grad.addColorStop(1, '#0284c7');
    ctx.fillStyle = grad;
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Outer metallic ring
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Drone central sensor/LED
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = isSimulating ? '#22c55e' : '#e2e8f0'; // Glow green when active
    if (isSimulating) {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 5;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Direction sensor dot (looking in direction of target)
    const dx = robotTarget.x - robotVisual.x;
    const dy = robotTarget.y - robotVisual.y;
    let angle = 0;
    if (dx !== 0 || dy !== 0) {
        angle = Math.atan2(dy, dx);
    }
    
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * radius * 0.6, y + Math.sin(angle) * radius * 0.6, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; // Red direction LED
    ctx.fill();
}

// Mouse Handlers
function getCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    
    return { row, col };
}

function handleMouseDown(e) {
    if (isSimulating) return;
    
    const { row, col } = getCellFromEvent(e);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    
    // Check if clicking start or goal markers
    if (row === startPos.row && col === startPos.col) {
        activeDragging = 'start';
        return;
    }
    if (row === goalPos.row && col === goalPos.col) {
        activeDragging = 'goal';
        return;
    }
    
    // Ignore clicks on border walls
    if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) return;
    
    isPainting = true;
    // If the cell is a wall, switch to erase mode (0). Otherwise, wall paint mode (1).
    paintMode = grid[row][col] === 1 ? 0 : 1;
    toggleWall(row, col, paintMode);
}

function handleMouseMove(e) {
    if (isSimulating) return;
    
    const { row, col } = getCellFromEvent(e);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    
    if (activeDragging) {
        // Dragging markers - do not place on outer borders or on top of walls
        if (row > 0 && row < rows - 1 && col > 0 && col < cols - 1 && grid[row][col] !== 1) {
            if (activeDragging === 'start' && (row !== goalPos.row || col !== goalPos.col)) {
                startPos = { row, col };
                robotVisual = { x: col, y: row };
                robotTarget = { x: col, y: row };
            } else if (activeDragging === 'goal' && (row !== startPos.row || col !== startPos.col)) {
                goalPos = { row, col };
            }
        }
        return;
    }
    
    if (!isPainting) return;
    // Don't modify borders or start/goal cells
    if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) return;
    if ((row === startPos.row && col === startPos.col) || (row === goalPos.row && col === goalPos.col)) return;
    
    toggleWall(row, col, paintMode);
}

function handleMouseUp() {
    isPainting = false;
    activeDragging = null;
}

function toggleWall(r, c, val) {
    grid[r][c] = val;
    // Reset path marks since grid changed
    exploredStates[r][c] = 0;
    finalPathCells.clear();
    finalPathPoints = [];
    updateStats('Idle', 0, 0);
}

// Reset/Clear Logic
function clearBoard() {
    if (isSimulating) stopSimulation();
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                grid[r][c] = 1;
            } else {
                grid[r][c] = 0;
            }
            exploredStates[r][c] = 0;
        }
    }
    
    finalPathCells.clear();
    finalPathPoints = [];
    robotVisual = { x: startPos.col, y: startPos.row };
    robotTarget = { x: startPos.col, y: startPos.row };
    updateStats('Idle', 0, 0);
}

// Perfect Randomized DFS Maze Generator
function generateRandomMaze() {
    if (isSimulating) stopSimulation();
    
    // Set all cells to walls first (except borders which must be walls anyway)
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            grid[r][c] = 1;
            exploredStates[r][c] = 0;
        }
    }
    finalPathCells.clear();
    finalPathPoints = [];
    
    // Stack for backtracking in DFS generator
    let stack = [];
    
    // Start cell (must be odd coordinates for DFS carve-out)
    let current = { row: 1, col: 1 };
    grid[current.row][current.col] = 0;
    stack.push(current);
    
    let visitedCells = new Set();
    visitedCells.add(`${current.row},${current.col}`);
    
    while (stack.length > 0) {
        let curr = stack[stack.length - 1];
        
        // Find unvisited neighbors at distance 2 (skipping boundaries)
        let neighbors = [];
        const directions = [
            { r: -2, c: 0 },
            { r: 2, c: 0 },
            { r: 0, c: -2 },
            { r: 0, c: 2 }
        ];
        
        for (let dir of directions) {
            let nr = curr.row + dir.r;
            let nc = curr.col + dir.c;
            
            if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1) {
                if (!visitedCells.has(`${nr},${nc}`)) {
                    neighbors.push({ row: nr, col: nc, dirR: dir.r / 2, dirC: dir.c / 2 });
                }
            }
        }
        
        if (neighbors.length > 0) {
            // Pick a random unvisited neighbor
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            // Carve wall between current and next
            grid[curr.row + next.dirR][curr.col + next.dirC] = 0;
            grid[next.row][next.col] = 0;
            
            visitedCells.add(`${next.row},${next.col}`);
            stack.push({ row: next.row, col: next.col });
        } else {
            stack.pop();
        }
    }
    
    // Ensure start and goal coordinates are fully open paths
    startPos = { row: 1, col: 1 };
    goalPos = { row: rows - 2, col: cols - 2 };
    
    grid[startPos.row][startPos.col] = 0;
    grid[goalPos.row][goalPos.col] = 0;
    
    // Ensure the neighbor of start and goal are open as well if needed
    // (DFS usually guarantees this, but we'll double check they aren't blocked off)
    if (grid[startPos.row + 1][startPos.col] === 1 && grid[startPos.row][startPos.col + 1] === 1) {
        grid[startPos.row + 1][startPos.col] = 0;
    }
    if (grid[goalPos.row - 1][goalPos.col] === 1 && grid[goalPos.row][goalPos.col - 1] === 1) {
        grid[goalPos.row - 1][goalPos.col] = 0;
    }
    
    robotVisual = { x: startPos.col, y: startPos.row };
    robotTarget = { x: startPos.col, y: startPos.row };
    
    updateStats('Idle', 0, 0);
}

// Solver Trigger & Animation
function startSimulation() {
    if (isSimulating) {
        stopSimulation();
        return;
    }
    
    // Clear previous marks
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            exploredStates[r][c] = 0;
        }
    }
    finalPathCells.clear();
    finalPathPoints = [];
    
    // Reset robot position to start
    robotVisual = { x: startPos.col, y: startPos.row };
    robotTarget = { x: startPos.col, y: startPos.row };
    
    // 1. Initialize maze structure inside WebAssembly
    Module._init_maze(cols, rows);
    
    // 2. Load walls into C++ engine
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 1) {
                Module._set_wall(r, c, 1);
            }
        }
    }
    
    // 3. Trigger Wasm Solve logic
    updateStats('Solving...', 0, 0);
    const startSolveTime = performance.now();
    const pathFound = Module._solve_maze(startPos.row, startPos.col, goalPos.row, goalPos.col);
    const solveTime = performance.now() - startSolveTime;
    
    // 4. Retrieve solver logs/events from WebAssembly
    const eventCount = Module._get_event_count();
    simulationEvents = [];
    for (let i = 0; i < eventCount; i++) {
        simulationEvents.push({
            row: Module._get_event_row(i),
            col: Module._get_event_col(i),
            type: Module._get_event_type(i) // 0: Explore, 1: Backtrack
        });
    }
    
    // 5. Retrieve final successful path from WebAssembly
    finalPathPoints = [];
    const pathLength = Module._get_path_length();
    for (let i = 0; i < pathLength; i++) {
        finalPathPoints.push({
            row: Module._get_path_row(i),
            col: Module._get_path_col(i)
        });
    }
    
    console.log(`C++ Maze Solver Execution Details:`);
    console.log(`- Path Found: ${pathFound === 1}`);
    console.log(`- Explored steps: ${eventCount}`);
    console.log(`- Final path size: ${pathLength}`);
    console.log(`- Solver C++ time: ${solveTime.toFixed(4)} ms`);
    
    if (simulationEvents.length === 0) {
        updateStats('Blocked (No Path)', 0, 0);
        return;
    }
    
    // Set UI State
    isSimulating = true;
    startBtn.textContent = 'Stop Simulation';
    startBtn.className = 'btn btn-danger';
    generateBtn.disabled = true;
    clearBtn.disabled = true;
    gridSizeSelect.disabled = true;
    
    eventIndex = 0;
    isRobotMoving = true;
    
    // Start step animation timer
    runSimulationStep();
}

function runSimulationStep() {
    if (!isSimulating) return;
    
    if (eventIndex >= simulationEvents.length) {
        // Simulation finished running the events list
        finishSimulation();
        return;
    }
    
    const ev = simulationEvents[eventIndex];
    
    // Update explored status matrix for cells
    // Type 0: visiting cell (state = 1)
    // Type 1: backtracking cell (state = 2)
    exploredStates[ev.row][ev.col] = ev.type === 0 ? 1 : 2;
    
    // Move robot target to the currently animated event location
    robotTarget = { x: ev.col, y: ev.row };
    
    // Count active explored states
    let exploredCount = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (exploredStates[r][c] > 0) exploredCount++;
        }
    }
    
    updateStats('Solving...', exploredCount, 0);
    
    eventIndex++;
    
    // Schedule next animation step
    timerId = setTimeout(runSimulationStep, simulationSpeed);
}

function finishSimulation() {
    stopTimers();
    isSimulating = false;
    isRobotMoving = false;
    
    // Set final robot position to either the goal or the last explored cell
    if (finalPathPoints.length > 0) {
        const lastPt = finalPathPoints[finalPathPoints.length - 1];
        robotTarget = { x: lastPt.col, y: lastPt.row };
        
        // Add final path cells to rendering set
        for (let pt of finalPathPoints) {
            finalPathCells.add(`${pt.row},${pt.col}`);
        }
        
        // Count visited
        let exploredCount = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (exploredStates[r][c] > 0) exploredCount++;
            }
        }
        
        updateStats('Solved', exploredCount, finalPathPoints.length);
    } else {
        updateStats('Blocked (No Path)', eventIndex, 0);
    }
    
    resetUIControls();
}

function stopSimulation() {
    stopTimers();
    isSimulating = false;
    isRobotMoving = false;
    
    // Reset robot position back to start
    robotTarget = { x: startPos.col, y: startPos.row };
    robotVisual = { x: startPos.col, y: startPos.row };
    
    resetUIControls();
    updateStats('Idle', 0, 0);
}

function stopTimers() {
    if (timerId) {
        clearTimeout(timerId);
        timerId = null;
    }
}

function resetUIControls() {
    startBtn.textContent = 'Start Simulation';
    startBtn.className = 'btn btn-primary';
    generateBtn.disabled = false;
    clearBtn.disabled = false;
    gridSizeSelect.disabled = false;
}

function updateStats(state, explored, pathLen) {
    statusText.textContent = state;
    exploredCountText.textContent = explored;
    pathLengthText.textContent = pathLen;
    
    // Apply styling to status indicator
    statusText.style.color = ''; // Reset
    if (state === 'Solved') {
        statusText.style.color = 'var(--success)';
    } else if (state.includes('Blocked')) {
        statusText.style.color = 'var(--danger)';
    } else if (state === 'Solving...') {
        statusText.style.color = 'var(--primary)';
    }
}
