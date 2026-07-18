# WebAssembly Compilation Script for Maze Solver

$ErrorActionPreference = "Stop"

Write-Host "=== Starting WebAssembly Build Process ==="

# 1. Check for Emscripten SDK
if (-not (Test-Path "emsdk")) {
    Write-Host "emsdk directory not found. Cloning Emscripten SDK from GitHub..."
    git clone --depth 1 https://github.com/emscripten-core/emsdk.git
} else {
    Write-Host "Found emsdk directory."
}

# 2. Install and Activate Emscripten
Push-Location emsdk
try {
    Write-Host "Installing latest Emscripten SDK version..."
    py emsdk.py install latest
    
    Write-Host "Activating latest Emscripten SDK version..."
    py emsdk.py activate latest
}
finally {
    Pop-Location
}

# 3. Load Emscripten environment variables
if (Test-Path "emsdk/emsdk_env.ps1") {
    Write-Host "Loading Emscripten environment variables..."
    # Execute the environment configuration script in the current session
    . ./emsdk/emsdk_env.ps1
} else {
    Write-Error "emsdk_env.ps1 not found. Unable to load environment variables."
}

# 4. Compile the C++ core engine to WebAssembly
Write-Host "Compiling main.cpp with emcc..."

# Compile with optimization level -O3.
# Export the solver API functions and runtime methods (ccall, cwrap).
emcc main.cpp -o maze_solver.js `
    -s EXPORTED_FUNCTIONS="['_init_maze', '_set_wall', '_solve_maze', '_get_event_count', '_get_event_row', '_get_event_col', '_get_event_type', '_get_path_length', '_get_path_row', '_get_path_col', '_malloc', '_free']" `
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" `
    -O3 `
    -s NO_EXIT_RUNTIME=1 `
    -s FORCE_FILESYSTEM=1

if ((Test-Path "maze_solver.js") -and (Test-Path "maze_solver.wasm")) {
    Write-Host "=== WebAssembly Compilation Successful! ==="
    Write-Host "Created files: maze_solver.js, maze_solver.wasm"
} else {
    Write-Error "Compilation completed but output files were not found."
}
