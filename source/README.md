# Maze-Solving Robot Simulator

A high-performance interactive simulation platform that demonstrates an autonomous robot navigating and solving grid mazes in real-time. The simulator uses a **C++ Core Engine** compiled into **WebAssembly (Wasm)** via Emscripten for high-speed pathfinding execution, paired with a modern, glassmorphic **HTML5 Canvas Frontend** for fluid step-by-step exploration visualization.

---

## 🛠️ Architecture & WebAssembly Connection

The simulator utilizes a decoupled architecture where heavy computational backtracking logic is delegated to the WebAssembly module, while the DOM interface and animation states are managed by JavaScript.

```
┌─────────────────────────────────┐
│       HTML5 Canvas UI           │
│  - Paints Grid / Walls / Path   │
│  - Triggers Maze Generation     │
│  - Captures Drag & Paint Events │
└────────────────┬────────────────┘
                 │ (1) User click Start / Solve
                 ▼
┌─────────────────────────────────┐
│     JavaScript (app.js)         │
│  - Tracks interactive settings  │
│  - Passes layout to C++ solver  │
│  - Animates steps from C++ log  │
└────────────────┬────────────────┘
                 │ (2) Invokes Wasm Exports
                 ▼
┌─────────────────────────────────┐
│      C++ Engine (main.cpp)      │
│  - Represents dynamic grid      │
│  - Runs recursive backtracking  │
│  - Streams path & explore logs  │
└─────────────────────────────────┘
```

### WebAssembly Bindings Contract

The connection between C++ and JavaScript is established via Emscripten's C-Linkage exports. The core functions exposed by `main.cpp` and invoked dynamically in `app.js` are:

| Exported C++ Function | Description |
| :--- | :--- |
| `void init_maze(int w, int h)` | Prepares a dynamic 2D array representation in memory of size $w \times h$. |
| `void set_wall(int r, int c, int val)` | Places (`val=1`) or erases (`val=0`) obstacles at coordinate $(r, c)$. |
| `int solve_maze(int sr, int sc, int gr, int gc)` | Executes recursive backtracking search from Start node $(sr, sc)$ to Goal node $(gr, gc)$. |
| `int get_event_count()` | Returns total count of search steps taken (active moves and backtrackings) for JS to query. |
| `int get_event_row(int index)` | Retrieves the row coordinate of the step at specific log `index`. |
| `int get_event_col(int index)` | Retrieves the column coordinate of the step at specific log `index`. |
| `int get_event_type(int index)` | Returns state type: `0` for exploration (VISIT), `1` for dead-end retreat (BACKTRACK). |
| `int get_path_length()` | Returns the count of coordinates in the final successful solution path. |
| `int get_path_row(int index)` | Retrieves the row coordinate of path index. |
| `int get_path_col(int index)` | Retrieves the column coordinate of path index. |

---

## 🚀 How It Works: Backtracking & Verification

1. **Maze Generation**: The frontend uses a randomized Depth-First Search (DFS) algorithm to carve out perfect, solvable paths inside the grid.
2. **Interactive Painting**: You can paint custom obstacle blocks, erase walls, and relocate the green **S (Start)** and red **G (Goal)** pads by clicking and dragging.
3. **Streamed Solving**:
   - Clicking **Start Simulation** populates the C++ memory grid and runs the backtracking solver.
   - The recursive C++ function searches depth-first, marking cell states.
   - If a path branch is a dead-end, it logs a `BACKTRACK` event and steps backward.
   - If the goal is reached, the solver compiles the final ordered path coordinates, returning success (`1`).
4. **Fluid Animation**: The frontend JavaScript reads the search logs, animates the robot moving along the explore/backtrack timeline, paints dead-ends in transparent coral, and draws a thick neon-green glowing connection line representing the solved path.

---

## 📦 Compiling and Hosting Locally

The project includes an automatic compiler pipeline setup script.

### Prerequisites
- [Python Launcher (`py`)](https://www.python.org/downloads/) (standard on Windows)
- [Git](https://git-scm.com/downloads)

### 1. Build WebAssembly
Run the compilation script in PowerShell (bypassing execution restrictions):
```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```
This script will automatically:
1. Clone the Emscripten SDK (`emsdk`) from GitHub if not present.
2. Install and activate the latest stable toolchain locally in your workspace.
3. Load the environment paths.
4. Compile `main.cpp` using `emcc` into `maze_solver.js` and `maze_solver.wasm` with `-O3` optimizations.

### 2. Run Local Web Server
Since WebAssembly requires `fetch` to load the `.wasm` binary, navigate to the folder and serve files over HTTP (e.g., using Python's built-in server):
```powershell
py -m http.server 8000
```
Open your browser and navigate to **`http://localhost:8000`** to view and play with the simulation dashboard.
